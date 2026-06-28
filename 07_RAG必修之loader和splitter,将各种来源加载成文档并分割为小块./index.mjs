import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import "dotenv/config";

const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7531888067218800640",

  // 指定读取的区域,这里指定只读取.main元素下的所有p元素
  { selector: ".main p" },
);

const documents = await cheerioLoader.load();
console.log("分割前的Documents: \n", documents);

const textSplitter = new RecursiveCharacterTextSplitter({
  // 规定每个分块的字符数量.
  chunkSize: 400,
  // 规定每个分块之间的重叠字符数量.
  chunkOverlap: 50,
  // 分隔符,优先使用段落分割.
  separators: ["。", "！", "？"],
});

const spiltDocuments = await textSplitter.splitDocuments(documents);
console.log("分割后的Documents: \n", spiltDocuments);
