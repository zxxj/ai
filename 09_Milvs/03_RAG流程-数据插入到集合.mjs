import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";
import {
  DataType,
  MetricType,
  MilvusClient,
  IndexType,
} from "@zilliz/milvus2-sdk-node";

// 初始化LLM模型.
const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

// 初始化embedding模型.
const DIM_VECTOR = 1024;

const embedding = new OpenAIEmbeddings({
  model: process.env.OPENAI_EMBEDDING_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  // 向量维度.
  dimensions: DIM_VECTOR,
});

// 初始化milvus
const client = new MilvusClient({ address: "localhost:19530" });

// 将文本向量化.
const getEmbedding = async (query) => {
  try {
    console.log(`[embedding] 开始向量化: ${query}`);
    const queryVector = await embedding.embedQuery(query);
    console.log(`[embedding] 向量化完成!`);
    return queryVector;
  } catch (error) {
    console.log(`[embedding] ${query}向量化失败!`);
    return;
  }
};

// 创建集合
const COLLECTION_NAME = "test";
const createCollection = async (collectionName = COLLECTION_NAME) => {
  try {
    console.log(`[Milvus] 开始创建集合,集合名称${collectionName}`);
    const collection = await client.createCollection({
      collection_name: collectionName,
      fields: [
        {
          name: "id",
          data_type: DataType.VarChar,
          max_length: 50,
          is_primary_key: true,
        },
        {
          name: "vector",
          data_type: DataType.FloatVector,
          dim: DIM_VECTOR,
        },
        {
          name: "content",
          data_type: DataType.VarChar,
          max_length: 500,
        },
        {
          name: "other",
          data_type: DataType.VarChar,
          max_length: 200,
        },
      ],
    });

    console.log(`[Milvus] 集合创建成功,集合名称${collectionName}`);
    return collection;
  } catch (error) {
    console.log(
      `[Milvus] 集合创建失败,集合名称${collectionName}, 错误原因: ${error.message}`,
    );
    return;
  }
};

// 创建索引.
const createIndex = async (collectionName = COLLECTION_NAME) => {
  try {
    console.log(`[Milvus] 开始为${collectionName}集合创建索引`);
    await client.createIndex({
      collection_name: collectionName,
      field_name: "vector",
      index_type: IndexType.IVF_FLAT,
      metric_type: MetricType.COSINE,
      params: { nlist: 1024 },
    });
    console.log(`[Milvus] ${collectionName}集合索引创建成功!`);
  } catch (error) {
    console.log(
      `[Milvus] ${collectionName}集合索引创建失败,错误: ${error.message}`,
    );
    return;
  }
};

// entity数据.
const DATA = [
  {
    id: "4",
    content:
      "今天下班路上又经过了咱们以前常去的那家奶茶店，突然有点怀念那时候一起喝珍珠奶茶的日子。",
    other: "test.",
  },
  {
    id: "5",
    content:
      "晚上翻看了以前的旧照片，看到初二那年我们在操场上的合影，时间过得真快，大家都长大了。",
    other: "test.",
  },
  {
    id: "6",
    content:
      "最近工作挺忙的，经常加班到很晚，不过想到为了未来能过得更好，就觉得现在的辛苦也是值得的。",
    other: "test.",
  },
  {
    id: "7",
    content:
      "今天石家庄下了一场大雪，看着窗外白茫茫的一片，突然想起以前冬天我们一起打雪仗的场景。",
    other: "test.",
  },
  {
    id: "8",
    content:
      "周末去了一趟书店，偶然听到一首我们以前都很喜欢的歌，回忆瞬间涌上心头。",
    other: "test.",
  },
  {
    id: "9",
    content:
      "今天去吃了那家老字号的火锅，味道还是和以前一模一样，可惜坐在对面的人换了。",
    other: "test.",
  },
  {
    id: "10",
    content:
      "刚刚整理书桌，翻出了你以前写给我的毕业留言，字迹还是那么清秀，眼眶一下就红了。",
    other: "test.",
  },
  {
    id: "11",
    content:
      "今天学了一整天的 Milvus 向量数据库，终于搞懂了索引是怎么运作的，感觉很有成就感。",
    other: "test.",
  },
  {
    id: "12",
    content: "晚上去操场跑了五公里，出了一身汗，感觉把一天的疲惫都释放出去了。",
    other: "test.",
  },
  {
    id: "13",
    content:
      "今天尝试自己做了一顿番茄炒蛋，虽然盐放多了一点，但吃起来还是很有家的味道。",
    other: "test.",
  },
  // 👇 下面是 3 条高度相似的数据，用于测试向量检索的召回率
  {
    id: "14",
    content:
      "昨天傍晚突然下起了暴雨，我没带伞，只能站在公交站台旁边躲雨，看着雨滴发呆。",
    other: "test.",
  },
  {
    id: "15",
    content:
      "那天放学突然下大雨，我没带雨伞，只好在路边的屋檐下等雨停，心里有点着急。",
    other: "test.",
  },
  {
    id: "16",
    content:
      "记得有次突降大雨，我刚好没带伞，只能躲在一家便利店的门口避雨，看着外面的积水。",
    other: "test.",
  },
  // 👇 补充 4 条日常数据，凑够 20 条
  {
    id: "17",
    content:
      "今天把阳台上的多肉植物都换了新土，看着它们生机勃勃的样子，心情也跟着变好了。",
    other: "test.",
  },
  {
    id: "18",
    content:
      "晚上失眠了，戴着耳机听了一晚上的白噪音，脑子里总是闪过以前的一些片段。",
    other: "test.",
  },
  {
    id: "19",
    content:
      "今天开会的时候，老板表扬了我们组的方案，大家这半个月的熬夜总算没有白费。",
    other: "test.",
  },
  {
    id: "20",
    content:
      "周末去看了最近很火的那部科幻电影，特效真的很震撼，但剧情稍微有点拖沓。",
    other: "test.",
  },
];

// 将数据插入到集合.
const insertCollection = async (collectionName = COLLECTION_NAME) => {
  try {
    console.log(`[Milvus] 开始将数据插入到${collectionName}集合`);

    const vectorContentData = await Promise.all(
      DATA.map(async (item) => ({
        ...item,
        vector: await getEmbedding(item.content),
      })),
    );

    await client.insert({
      collection_name: collectionName,
      data: vectorContentData,
    });
    console.log(`[Milvus] 成功将数据插入到${collectionName}集合!`);
  } catch (error) {
    console.log(
      `[Milvus] 数据插入到${collectionName}集合失败,错误: ${error.message}`,
    );
    return;
  }
};

// 根据集合名称加载集合.
const loadCollection = async (collectionName = COLLECTION_NAME) => {
  try {
    console.log(`[Milvus] 开始加载${collectionName}集合.`);
    await client.loadCollection({ collection_name: collectionName });
    console.log(`[Milvus] 成功加载${collectionName}集合!`);
  } catch (error) {
    console.log(
      `[Milvus] 加载${collectionName}集合失败, 错误: ${error.message}`,
    );
    return;
  }
};

// 查询
const queryFn = async (collectionName, query) => {
  try {
    const queryVector = await getEmbedding(query);

    console.log(
      `[Milvus] 开始根据${query}查询${collectionName}集合中的相似文档.`,
    );

    const searchResult = await client.search({
      collection_name: collectionName,
      vector: queryVector,
      limit: 3,
      metric_type: MetricType.COSINE,
      output_fields: ["id", "content", "other"],
    });
    console.log(
      `[Milvus] 根据${query}成功查询到${collectionName}集合中的${searchResult.results.length}条相似文档.`,
    );
    return searchResult.results;
  } catch (error) {
    console.log(
      `[Milvus] 未根据${query}查询到${collectionName}集合中的相似文档.`,
    );
    return;
  }
};

const main = async () => {
  // 创建集合
  await createCollection();

  // 创建索引
  await createIndex();

  // 加载集合
  await loadCollection();

  // 向集合插入数据
  await insertCollection();

  // 查询
  const res = await queryFn(COLLECTION_NAME, "下雨天没带伞怎么办?");
  console.log(res);
};

main();
