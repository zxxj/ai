import "dotenv/config";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

const embedding = new OpenAIEmbeddings({
  model: process.env.OPENAI_EMBEDDING_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const questions = ["我和张洋是什么时候认识的?"];

const documents = [
  new Document({
    pageContent:
      "我和张洋是在2018年9月初的大学新生报到那天认识的。那天下午，我们在计算机学院的迎新帐篷下排队办理入学手续。因为天气炎热，我不小心把水杯碰倒了，水洒了一地，张洋见状立刻递给我一包纸巾，并帮我一起清理了地面。从那以后，我们便成为了大学四年的同班同学兼室友",
    metadata: {
      page: 1,
      title: "我和张洋的初识",
    },
  }),
  new Document({
    pageContent:
      "在大学期间，我和张洋经常一起去图书馆自习。他性格沉稳，擅长逻辑推理，而我更喜欢天马行空的想象。大二那年，我们组队参加了全国大学生程序设计竞赛，虽然最后只拿了省赛二等奖，但那次熬夜写代码、吃泡面的经历，让我们的关系变得更加铁了。",
    metadata: {
      page: 2,
      title: "大学时光的回忆",
    },
  }),
  new Document({
    pageContent:
      "2022年夏天大学毕业后，我和张洋选择了不同的发展道路。我留在了北京进入一家互联网公司做前端开发，而他则选择回老家考公，成为了一名基层公务员。虽然不在同一个城市，但我们依然保持着每周至少通一次电话的习惯。",
    metadata: {
      page: 3,
      title: "毕业后的发展",
    },
  }),
];

const vectorStore = await MemoryVectorStore.fromDocuments(documents, embedding);

const retriever = vectorStore.asRetriever({ k: 3 });

for (const question of questions) {
  // 使用retriever检索相似文档
  const retrieverDocs = await retriever.invoke(question);
  console.log("retrieverDocs", JSON.stringify(retrieverDocs));

  // 查询相似度评分
  const sourceResult = await vectorStore.similaritySearchVectorWithScore(
    question,
    3,
  );
  console.log("sourceResult", JSON.stringify(sourceResult));

  const context = retrieverDocs
    .map((doc, index) => `片段${index + 1} 内容: ${doc.pageContent}`)
    .join(",");
  // 增强prompt
  const prompt = `你是一个专业的智能助手。请严格基于以下提供的上下文信息来回答用户的问题。
  如果上下文信息不足以回答问题，请直接回复“根据现有知识库，我无法找到相关信息”，绝对不要自己编造答案。
  上下文信息:${context}

  问题: ${question}
`;

  const response = await model.invoke(context);
  console.log("最终回答:", response.content);
}
