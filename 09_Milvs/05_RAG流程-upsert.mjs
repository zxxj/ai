import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MetricType, MilvusClient } from "@zilliz/milvus2-sdk-node";
import "dotenv/config";

// 初始化LLM模型.
const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0.7,
});

// 初始化embedding模型.
const DIM_VECTOR = 1024;

const embedding = new OpenAIEmbeddings({
  model: process.env.OPENAI_EMBEDDING_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: DIM_VECTOR,
});

// 初始化milvus数据库.
const COLLECTION_NAME = "test";
const client = new MilvusClient({ address: "localhost:19530" });

// 将文本转化为向量.
const getEmbedding = async (query) => {
  try {
    console.log(`[Embedding] 开始将${query}转化为向量.`);
    const queryVector = await embedding.embedQuery(query);
    console.log(`[Embedding] 成功将${query}转化为向量!`);
    return queryVector;
  } catch (error) {
    console.log(`[Embedding] 将${query}转化为向量失败,错误:${error}`);
    return;
  }
};

// 连接milvus函数.
const connectMilvus = async () => {
  try {
    console.log(`[Milvus] 开始连接Milvus.`);
    await client.connectPromise();
    console.log(`[Milvus] 成功连接Milvus!`);
  } catch (error) {
    console.log(`[Milvus] 连接Milvus失败, 错误:${error}`);
    return;
  }
};

// 主函数.
const main = async () => {
  await connectMilvus();

  const updateId = 3;

  const updateContent = {
    id: updateId,
    content: "还能回到13岁吗.",
    other: "你好,还是再见.",
  };

  const vector = await getEmbedding(updateContent.content);
  const updateData = { ...updateContent, vector };

  const result = await client.upsert({
    collection_name: COLLECTION_NAME,
    data: [updateData],
  });
};

main();
