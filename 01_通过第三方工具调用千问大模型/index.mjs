import "dotenv/config" // 加载.env文件中的环境变量
import { ChatOpenAI } from "@langchain/openai" // 从langchain导入chatopenai, 千问兼容OpenAI API格式

// 创建模型实例
const model = new ChatOpenAI({
  modelName: process.env.OPENAI_MODEL_NAME, // 模型名
  apiKey: process.env.OPENAI_API_KEY, // 阿里云API密钥
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL // 阿里云API地址
  },
})

const response = await model.invoke("你是什么模型?") // 向模型发送问题

console.log(response.content) // 打印模型的回复