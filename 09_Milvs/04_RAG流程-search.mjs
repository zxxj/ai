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

// 根据用户问题向量在Milvus数据库中检索相似文档.
const retrieveRelevant = async (query, limit = 3) => {
  try {
    const queryVector = await getEmbedding(query);

    console.log(
      `[Milvus] 开始根据用户问题: [${query}] 从数据库中检索相似文档.`,
    );
    const searchResult = await client.search({
      collection_name: COLLECTION_NAME,
      vector: queryVector,
      limit,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "other"],
    });
    console.log(
      `[Milvus] 根据用户问题: [${query}] 成功从数据库中检索到${searchResult.results.length}条相似文档.`,
    );
    return searchResult.results;
  } catch (error) {
    console.log(
      `[Milvus] 根据用户问题: [${query}] 从数据库中检索失败,原因:${error}.`,
    );
    return [];
  }
};

// 使用RAG回答用户问题.
const answerQuestion = async (question, limit) => {
  try {
    const retrieverResult = await retrieveRelevant(question, limit);

    if (retrieverResult.length === 0) {
      console.log(`未检索到相关文档!`);
      return;
    }

    // 构建上下文.
    const context = retrieverResult.map((item, index) => {
      return `第${index + 1}条. 内容: ${item.content}`;
    });

    // 构建prompt.
    const prompt = `你是一个提问助手.
    请严格按照以下内容作答: ${context}.
    用户问题: ${question}
    `;

    // 调用LLM大模型.
    const response = await model.invoke(prompt);
    console.log(`[LLM] 大模型回答: [${response.content}]`);
  } catch (error) {
    console.log(error);
    return;
  }
};

// 用户问题.
const question = "下雨天没带伞怎么办?";

// 主函数.
const main = async () => {
  await connectMilvus();
  await answerQuestion(question, 3);
};

main();
