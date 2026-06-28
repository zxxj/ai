import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
  MilvusClient,
  DataType,
  IndexType,
  MetricType,
} from "@zilliz/milvus2-sdk-node";

const VECTOR_DIM = 1024;
const collection_name = "ai_diary";

// 创建LLM.
const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

// 创建嵌入模型.
const embedding = new OpenAIEmbeddings({
  model: process.env.OPENAI_EMBEDDING_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  dimensions: VECTOR_DIM,
});

// 创建Milvus.
const client = new MilvusClient({
  address: "localhost:19530",
});

// 将prompt向量化.
const embeddingQuery = async (text) => {
  try {
    const result = await embedding.embedQuery(text);
    return result;
  } catch (error) {
    console.log("embeddingQuery向量化失败:", error.message);
  }
};

const main = async () => {
  try {
    console.log(`[Milvus] 开始连接...`);
    await client.connectPromise;
    console.log(`[Milvus] 连接成功!`);

    // 创建集合.
    console.log(`[Milvus] 开始创建集合...`);
    await client.createCollection({
      collection_name: collection_name,
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          max_length: 50,
          is_primary_key: true,
        },
        { name: "vector", data_type: DataType.FloatVector, dim: VECTOR_DIM },
        { name: "content", data_type: DataType.VarChar, max_length: 5000 },
        { name: "date", data_type: DataType.VarChar, max_length: 50 },
        { name: "mood", data_type: DataType.VarChar, max_length: 50 },
        {
          name: "tags",
          data_type: DataType.Array,
          element_type: DataType.VarChar,
          max_capacity: 10,
          max_length: 50,
        },
      ],
    });
    console.log(`[Milvus] 集合创建成功!`);

    // 创建索引.
    console.log(`[Milvus] 开始创建索引...`);
    await client.createIndex({
      collection_name: collection_name,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 1024 },
    });
    console.log(`[Milvus] 索引创建完成!`);

    // 加载集合.
    console.log(`[Milvus] 开始加载集合...`);
    await client.loadCollection({ collection_name: collection_name });
    console.log(`[Milvus] 集合加载完成!`);

    // 插入日记数据.
    console.log(`[Milvus] 开始插入日记数据.`);
    const diaryContents = [
      {
        id: "diary_001",
        content:
          "今天天气很好，去公园散步了，心情愉快。看到了很多花开了，春天真美好。",
        date: "2026-01-10",
        mood: "happy",
        tags: ["生活", "散步"],
      },
      {
        id: "diary_002",
        content:
          "今天工作很忙，完成了一个重要的项目里程碑。团队合作很愉快，感觉很有成就感。",
        date: "2026-01-11",
        mood: "excited",
        tags: ["工作", "成就"],
      },
      {
        id: "diary_003",
        content:
          "周末和朋友去爬山，天气很好，心情也很放松。享受大自然的感觉真好。",
        date: "2026-01-12",
        mood: "relaxed",
        tags: ["户外", "朋友"],
      },
      {
        id: "diary_004",
        content:
          "今天学习了 Milvus 向量数据库，感觉很有意思。向量搜索技术真的很强大。",
        date: "2026-01-12",
        mood: "curious",
        tags: ["学习", "技术"],
      },
      {
        id: "diary_005",
        content:
          "晚上做了一顿丰盛的晚餐，尝试了新菜谱。家人都说很好吃，很有成就感。",
        date: "2026-01-13",
        mood: "proud",
        tags: ["美食", "家庭"],
      },
    ];

    console.log(`[embedding] 开始转化为向量...`);
    const diaryData = await Promise.all(
      diaryContents.map(async (diary) => ({
        ...diary,
        vector: await embeddingQuery(diary.content),
      })),
    );

    const insertResult = await client.insert({
      collection_name: collection_name,
      data: diaryData,
    });
    console.log(`[embedding] 转化向量完成!`);
    console.log(`[Milvus] 日记数据插入完成!`);
  } catch (error) {
    console.error("Error:", error.message);
  }
};

main();
