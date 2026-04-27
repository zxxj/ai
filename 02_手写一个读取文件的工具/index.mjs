// 目的: 让大模型调用这个工具实现文件读取
import "dotenv/config"
import { ChatOpenAI } from "@langchain/openai"
import { tool } from "@langchain/core/tools"
import fs from "node:fs/promises"
import z from "zod"
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages"

// 创建ChatOpeAI实例
const model = new ChatOpenAI({
  modelName: process.env.OPENAI_MODEL_NAME, // 模型名
  apiKey: process.env.OPENAI_API_KEY, // 阿里云API密钥
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL // 阿里云API地址
  },
  temperature: 0 // 温度,AI的创造性,设置为0表示让AI严格按照指令来做事情,不要自己发挥
})

// 通过@langchain/core/tools提供的tool API,创建一个工具
const readFileTool = tool(
  // 第一个参数是匿名函数,传入文件路径,通过node提供的fs模块读取文件,返回文件内容
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8')
    console.log(`[工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`)
    return `文件内容 \n ${content}`
  },
  // 第二个参数是工具的配置对象,工具名称,工具简介,工具参数格式,这里用zod包来描述,传入一个对象,规定里面的filePath是字符串类型
  {
    name: "read_file",
    description: "用此工具来读取文件内容. 当用户要求读取文件,查看代码,分析文件内容时调用此工具. 输入文件路径(可以是相对路径或绝对路径).",
    schema: z.object({
      filePath: z.string().describe('要读取的文件路径')
    })
  }
)

const tools = [readFileTool]

// 将工具传入到大模型
const modelWithTools = model.bindTools(tools)

/**
 * 消息类型有四种:
 * SystemMessage: 设置AI是谁,可以干什么,有什么能力以及一些回答,行为的规范等.
 * HumanMessage: 用户输入的信息
 * AIMessage: AI回复的信息
 * ToolMessage: 调用工具的结果返回
 */
const messages = [

  // 用SystemMessage告诉AI,它是一个代码助手,可以读取文件并解释代码的内容,给出建议
  new SystemMessage(`
    你是一个代码助手,可以使用工具读取文件并解释代码.
    工作流程:
    1. 用户要求读取文件时,立即调用 read_file 工具
    2. 等待工具返回文件内容
    3. 基于文件内容进行分析和解释

    可用工具:
    - read_file: 读取文件内容(使用此工具来获取文件内容)
    `),

  new HumanMessage(`请读取 01_通过第三方工具调用千问大模型/index.mjs 文件内容并解释代码的执行流程`)
]

// 调用
let response = await modelWithTools.invoke(messages)
// console.log(response)

// 将AI返回的消息保存到聊天历史记录
messages.push(response)

// 判断AI消息中是否存在工具调用
while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`\n[检测到] ${response.tool_calls.length} 个工具调用!`)

  // 执行所有工具调用
  const toolResults = await Promise.all(
    response.tool_calls.map(async toolCall => {

      const currentTool = tools.find(t => t.name === toolCall.name)

      if (!currentTool) {
        return `[错误] 找不到工具 ${toolCall.name}`
      }

      console.log(`[开始执行工具] ${currentTool.name} (${JSON.stringify(toolCall.args)})`)

      try {
        const result = await currentTool.invoke(toolCall.args)
        return result
      } catch (error) {
        return `[错误] ${error.message}`
      }
    })
  )

  // 将工具调用的结果添加到聊天历史记录
  response.tool_calls.forEach((toolCall, index) => {
    console.log(toolResults)
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id
      })
    )
  })

  // 再次调用模型,传入工具结果
  response = await modelWithTools.invoke(messages)
}

console.log(`\n[最终回复]`)
console.log(response.content)