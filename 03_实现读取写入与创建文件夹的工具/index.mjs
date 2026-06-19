import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});
