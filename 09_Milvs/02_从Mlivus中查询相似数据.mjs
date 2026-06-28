import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
  DataType,
  IndexType,
  MetricType,
  MilvusClient,
} from "@zilliz/milvus2-sdk-node";
import "dotenv/config";

// 向量的维度.
const DIM_VECTOR = 1024;

// 集合名称.
const COLLECTION_NAME = "xin";

// 初始化LLM.
const model = new ChatOpenAI({
  model: process.env.OPENAI_MOEL_NAME,
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

// 初始化Milvus数据库.
const milvusClient = new MilvusClient({
  address: "localhost:19530",
});

// 将问题向量化.
const getEmbeddingVector = async (query) => {
  try {
    const queryVector = await embedding.embedQuery(query);
    return queryVector;
  } catch (error) {
    console.log(`[getEmbedding] 错误: ${error.message}`);
    return error.message;
  }
};

const DATA = [
  {
    id: "1",
    content:
      "我们相识于初二,说实话在分班第一天我就注意到你了,双眼皮,大眼睛,单马尾,而且笑起来特别的好看.",
    other: "你好,张明慧.",
  },
  {
    id: "2",
    content: "记得我先是通过同学要到的你QQ号,具体是哪个同学我忘记了.",
    other: "你好,张明慧.",
  },
  {
    id: "3",
    content: "你好,张明慧.我是张鑫鑫,感谢你还能记得我.",
    other: "你好,张明慧.",
  },
  {
    id: "4",
    content:
      "今天下班路上又经过了咱们以前常去的那家奶茶店，突然有点怀念那时候一起喝珍珠奶茶的日子。",
    other: "你好,张明慧.",
  },
  {
    id: "5",
    content:
      "晚上翻看了以前的旧照片，看到初二那年我们在操场上的合影，时间过得真快，大家都长大了。",
    other: "你好,张明慧.",
  },
  {
    id: "6",
    content:
      "最近工作挺忙的，经常加班到很晚，不过想到为了未来能过得更好，就觉得现在的辛苦也是值得的。",
    other: "你好,张明慧.",
  },
  {
    id: "7",
    content:
      "今天石家庄下了一场大雪，看着窗外白茫茫的一片，突然想起以前冬天我们一起打雪仗的场景。",
    other: "你好,张明慧.",
  },
  {
    id: "8",
    content:
      "周末去了一趟书店，偶然听到一首我们以前都很喜欢的歌，回忆瞬间涌上心头。",
    other: "你好,张明慧.",
  },
  {
    id: "9",
    content:
      "今天去吃了那家老字号的火锅，味道还是和以前一模一样，可惜坐在对面的人换了。",
    other: "你好,张明慧.",
  },
  {
    id: "10",
    content:
      "刚刚整理书桌，翻出了你以前写给我的毕业留言，字迹还是那么清秀，眼眶一下就红了。",
    other: "你好,张明慧.",
  },
  {
    id: "11",
    content:
      "今天学了一整天的 Milvus 向量数据库，终于搞懂了索引是怎么运作的，感觉很有成就感。",
    other: "你好,张明慧.",
  },
  {
    id: "12",
    content: "晚上去操场跑了五公里，出了一身汗，感觉把一天的疲惫都释放出去了。",
    other: "你好,张明慧.",
  },
  {
    id: "13",
    content:
      "今天尝试自己做了一顿番茄炒蛋，虽然盐放多了一点，但吃起来还是很有家的味道。",
    other: "你好,张明慧.",
  },
  // 👇 下面是 3 条高度相似的数据，用于测试向量检索的召回率
  {
    id: "14",
    content:
      "昨天傍晚突然下起了暴雨，我没带伞，只能站在公交站台旁边躲雨，看着雨滴发呆。",
    other: "你好,张明慧.",
  },
  {
    id: "15",
    content:
      "那天放学突然下大雨，我没带雨伞，只好在路边的屋檐下等雨停，心里有点着急。",
    other: "你好,张明慧.",
  },
  {
    id: "16",
    content:
      "记得有次突降大雨，我刚好没带伞，只能躲在一家便利店的门口避雨，看着外面的积水。",
    other: "你好,张明慧.",
  },
  // 👇 补充 4 条日常数据，凑够 20 条
  {
    id: "17",
    content:
      "今天把阳台上的多肉植物都换了新土，看着它们生机勃勃的样子，心情也跟着变好了。",
    other: "你好,张明慧.",
  },
  {
    id: "18",
    content:
      "晚上失眠了，戴着耳机听了一晚上的白噪音，脑子里总是闪过以前的一些片段。",
    other: "你好,张明慧.",
  },
  {
    id: "19",
    content:
      "今天开会的时候，老板表扬了我们组的方案，大家这半个月的熬夜总算没有白费。",
    other: "你好,张明慧.",
  },
  {
    id: "20",
    content:
      "周末去看了最近很火的那部科幻电影，特效真的很震撼，但剧情稍微有点拖沓。",
    other: "你好,张明慧.",
  },
];

const createXinCollection = async () => {
  console.log(`[Milvus] 开始创建集合...`);
  const xinCollection = await milvusClient.createCollection({
    collection_name: COLLECTION_NAME,
    fields: [
      {
        name: "id",
        data_type: DataType.VarChar,
        max_length: 50,
        is_primary_key: true,
      },
      { name: "vector", data_type: DataType.FloatVector, dim: DIM_VECTOR },
      { name: "content", data_type: DataType.VarChar, max_length: 5000 },
      { name: "other", data_type: DataType.VarChar, max_length: 200 },
    ],
  });

  console.log(`[Milvus] 集合创建完成!`);
  return xinCollection;
};

const createIndex = async () => {
  console.log(`[Milvus] 开始建立索引...`);
  const data = await milvusClient.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: "vector",
    index_type: IndexType.IVF_FLAT,
    metric_type: MetricType.COSINE,
    params: { nlist: 1024 },
  });
  console.log(`[Milvus] 索引建立完成!`);
};

const vectorContent = (data) => {
  console.log(`[Milvus] 开始向量化content!`);

  const result = Promise.all(
    data.map(async (item) => ({
      ...item,
      vector: await getEmbeddingVector(item.content),
    })),
  );

  console.log(`[Milvus] 向量化content完成!`);
  return result;
};

const loadCollection = async (collectionName = COLLECTION_NAME) => {
  console.log(`[Milvus] 开始加载${collectionName}集合...`);
  await milvusClient.loadCollection({ collection_name: collectionName });
  console.log(`[Milvus] 加载${collectionName}集合成功!`);
};

const insert = async () => {
  const result = await vectorContent(DATA);

  await loadCollection();
  console.log(`[Milvus] 开始插入数据!`);

  await milvusClient.insert({
    collection_name: COLLECTION_NAME,
    data: result,
  });
  console.log(`[Milvus] 数据插入完成!`);
};

const queryFn = async () => {
  const question = "下雨天没带伞怎么办";

  const queryVector = await getEmbeddingVector(question);
  const searchResult = await milvusClient.search({
    collection_name: COLLECTION_NAME,
    vector: queryVector,
    limit: 3,
    metric_type: MetricType.COSINE,
    output_fields: ["id", "content", "other"],
  });

  console.log("searchResult", searchResult);
};

const main = async () => {
  await createXinCollection();
  await createIndex();
  await insert();
  await queryFn();
};

main();
