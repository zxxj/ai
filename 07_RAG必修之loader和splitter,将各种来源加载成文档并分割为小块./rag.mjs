import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";

// 初始化LLM模型.
const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

// 初始化嵌入模型.
const embedding = new OpenAIEmbeddings({
  model: process.env.OPENAI_EMBEDDING_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 使用loader加载网页.
const loader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7616405104520806434",
  { selector: ".main-area p" },
);

const document = await loader.load();
console.log("分割前: \n", document);
console.log(`=============================================`);

// 使用textSplitter分割Document
const textSplitter = new RecursiveCharacterTextSplitter({
  // 分块大小.
  chunkSize: 400,
  // 字符重叠数量.
  chunkOverlap: 50,
  // 优先使用句号段落分割.
  separator: ["。", "！"],
});

const documents = await textSplitter.splitDocuments(document);
console.log("分割后: \n", documents);

// 创建向量数据库
console.log("正在创建向量存储");
const vectorStore = await MemoryVectorStore.fromDocuments(documents, embedding);
console.log("向量存储创建完成");

const retriever = vectorStore.asRetriever({ k: 2 });

const questions = ["作者为色很那么要学习AI Agent?"];

for (const question of questions) {
  // 获取相关文档
  const retrieverDocs = await retriever.invoke(question);

  // 获取相似度评分
  const scoredResults = await vectorStore.similaritySearchVectorWithScore(
    question,
    2,
  );

  // 构建prompt
  const context = retrieverDocs
    .map((doc, index) => `[片段${index + 1} 内容: ${doc.pageContent}]`)
    .join(",");

  const prompt = `你是一个文章辅助阅读助手,请根据文章内容来回答.
                  文章内容: ${context}
                  用户问题: ${question}
  `;

  const response = await model.invoke(prompt);
  console.log(response.content);
}
