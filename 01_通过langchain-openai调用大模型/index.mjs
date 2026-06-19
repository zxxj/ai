import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

console.log(process.env);

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const response = await model.invoke("介绍一下你自己!");
console.log(response.content);
