import 'dotenv/config'
import { ChatOpenAI } from "@langchain/openai"

const model = new ChatOpenAI({
  modelName: 'qwen3.6-plus',
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL
  }
})

const response = await model.invoke("请用中文介绍一下你自己")
console.log(response.content)