import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
  DataType,
  MetricType,
  MilvusClient,
  IndexType,
} from "@zilliz/milvus2-sdk-node";
import "dotenv/config";

const DIM_VECTOR = 1024;
const EPUB_FILE = "天龙八部.epub";
const COLLECTION_NAME = "book";
const BOOK_ID = 1;
const BOOK_NAME = "天龙八部";

// 初始化LLM.
const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

// 初始化embedding.
const embedding = new OpenAIEmbeddings({
  model: process.env.OPENAI_EMBEDDING_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: DIM_VECTOR,
});

// 向量化数据.
const getEmbedding = async (data) => {
  try {
    console.log(`[Embedding] 开始向量化数据, 数据: ${data}`);
    const dataVector = await embedding.embedQuery(data);
    console.log(`[Embedding] 成功向量化数据!`);
    return dataVector;
  } catch (error) {
    console.log(`[Embedding] 向量化数据失败.`);
    return;
  }
};

// 初始化milvus.
const client = new MilvusClient({ address: "localhost:19530" });

// 创建集合.
const createCollection = async (collectionName = COLLECTION_NAME) => {
  try {
    const hasCollection = await client.hasCollection({
      collection_name: collectionName,
    });

    if (!hasCollection.value) {
      console.log(`[Milvus] 开始创建集合,集合名称: ${collectionName}`);
      const collection = await client.createCollection({
        collection_name: collectionName,
        fields: [
          {
            name: "id",
            data_type: DataType.VarChar,
            max_length: 100,
            is_primary_key: true,
          },
          { name: "book_id", data_type: DataType.VarChar, max_length: 100 },
          { name: "vector", data_type: DataType.FloatVector, dim: DIM_VECTOR },
          { name: "book_name", data_type: DataType.VarChar, max_length: 200 },
          { name: "content", data_type: DataType.VarChar, max_length: 10000 },
          { name: "chapter_num", data_type: DataType.Int32 },
        ],
      });
      console.log(`[Milvus] 成功创建集合!`);
      await createIndex(collectionName);
      await loaderEbook(EPUB_FILE);
    } else {
      await loadCollection(collectionName);
    }
  } catch (error) {
    console.log(`[Milvus] 创建集合失败,集合名称: ${collectionName}, ${error}`);
    return;
  }
};

// 创建索引.
const createIndex = async (collectionName = COLLECTION_NAME) => {
  try {
    console.log(`[Milvus] 开始创建${collectionName}集合的索引.`);
    await client.createIndex({
      collection_name: collectionName,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 1024 },
    });
    console.log(`[Milvus] 成功创建${collectionName}集合的索引!`);
  } catch (error) {
    console.log(`[Milvus] 创建${collectionName}集合的索引失败.`);
  }
};

// 加载集合.
const loadCollection = async (collectionName = COLLECTION_NAME) => {
  try {
    console.log(`[Milvus] 开始加载集合,集合名称: ${collectionName}`);
    await client.loadCollection({ collection_name: collectionName });
    console.log(`[Milvus] 成功加载集合!`);
  } catch (error) {
    console.log(`[Milvus] 加载集合失败.`);
    return;
  }
};

// 加载电子书.
const loaderEbook = async (filePath = EPUB_FILE) => {
  try {
    console.log(`[loader] 开始加载: ${filePath}`);

    // 使用EpubLoader加载文件,按章节拆分.
    const loader = new EPubLoader(EPUB_FILE, { splitChapters: true });

    const documents = await loader.load();
    console.log(`[loader] 加载完成,共${documents.length}个章节`);

    // 按500个字符分块.
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });

    for (
      let chapterIndex = 0;
      chapterIndex < documents.length;
      chapterIndex++
    ) {
      const chapterContent = documents[chapterIndex].pageContent;
      console.log(`[TextSplitter] 开始执行分块操作.`);
      console.log(
        `[TextSplitter] 正在处理第 ${chapterIndex + 1}章/${documents.length}章`,
      );

      const chunks = await textSplitter.splitText(chapterContent);

      if (chunks.length === 0) {
        console.log(
          `[TextSplitter] 第${chapterIndex + 1}章是空章节,跳过继续执行.`,
        );
        continue;
      }

      console.log(`[TextSplitter] 已完成第${chapterIndex + 1}章的分块操作.`);

      await insertChunkBatch(chunks, BOOK_ID, chapterIndex + 1);
    }
  } catch (error) {
    console.log(`[loader] 加载失败. ${error}`);
    return;
  }
};

// 插入数据.
const insertChunkBatch = async (chunks, bookId, chapterIndex) => {
  try {
    console.log(`[Milvus] 开始插入数据,正在插入第${chapterIndex}章的数据.`);
    const insertData = await Promise.all(
      chunks.map(async (chunk, index) => {
        const vector = await getEmbedding(chunk);

        return {
          id: `${bookId}-${chapterIndex}-${index}`,
          book_id: bookId,
          book_name: BOOK_NAME,
          content: chunk,
          chapter_num: chapterIndex,
          vector: vector,
        };
      }),
    );
    console.log(`[Milvus] 成功插入第${chapterIndex}章的数据!`);

    await client.insert({
      collection_name: COLLECTION_NAME,
      data: insertData,
    });
  } catch (error) {
    console.log(`[Milvus] 数据插入失败.`);
  }
};

const main = async () => {
  await createCollection(COLLECTION_NAME);
};

main();
