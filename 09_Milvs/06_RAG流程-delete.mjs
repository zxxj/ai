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

// 连接milvus函数.
const connectMilvus = async () => {
  try {
    console.log(`[Milvus] 开始连接Milvus.`);
    await client.connect();
    console.log(`[Milvus] 成功连接Milvus!`);
  } catch (error) {
    console.log(`[Milvus] 连接Milvus失败, 错误:${error}`);
    return;
  }
};

// 主函数.
const main = async () => {
  await connectMilvus();

  // 删除单条数据.
  const id = "2";
  const result = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: `id == "${id}"`,
  });
  console.log(result);

  // 批量删除数据.
  const ids = ["15", "16"];
  const idStr = ids.map((id) => `"${id}"`).join(",");
  console.log(idStr);
  const result = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: `id in [${idStr}]`,
  });

  console.log(result);

  // 条件删除.
  const result = await client.delete({
    collection_name: COLLECTION_NAME,
    filter: `id == "20"`,
  });
  console.log(result);
};

main();
