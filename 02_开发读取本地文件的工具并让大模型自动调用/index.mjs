import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import fs from "node:fs/promises";
import { z } from "zod";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

// 读取文件工具.
const readFileTool = tool(
  // tool的第一个参数是调用工具时执行的函数,参数由zod schema定义,模型会按照schema来返回对应的字段.
  async ({ filePath }) => {
    try {
      // 使用fs模块来异步读取文件,格式为utf-8.
      const content = await fs.readFile(filePath, "utf-8");

      console.log(
        `[read_file 工具调用开始] 文件路径: ${filePath} - 已成功读取 ${content.length} 字节!`,
      );

      // 文件读取完成后,返回文件内容.
      return `文件内容: ${content}`;
    } catch (error) {
      console.log(`读取文件失败: ${error.message}`);
      return `读取文件失败: ${error.message}`;
    }
  },
  // tool的第二个参数是工具描述.
  {
    // 工具名称.
    name: "read_file",
    // 工具的描述,需要准确的写出工具能做什么,什么时候可以调用这个工具.
    description:
      "此工具用于读取文件内容.当用户要求读取文件时调用此工具,要求输入文件路径(支持相对路径和绝对路径).",
    // 工具参数,使用zod来校验参数类型.
    schema: z.object({
      filePath: z
        .string()
        .describe("要读取的文件路径,例如'./README.MD'或'/test.js'"),
    }),
  },
);

// 将工具绑定到大模型.
const tools = [readFileTool];
const modelWithTools = model.bindTools(tools);

// 进行调用测试

/**
 * 消息类型分为四种:
 * 1. SystemMessage: 设置AI的身份,可以干什么,有什么能力,以及设置一些固定的回答和行为的规范等.
 * 2. HumanMessage: 用户消息,用户输入的信息.
 * 3. AIMessage: AI回复的信息.
 * 4. ToolMessage: 调用工具的结果返回.
 */
const messages = [
  new SystemMessage(`你是一个代码助手,可以使用工具读取文件并解释代码.
  工作流程:
  1. 用户要求读取文件时,立即调用read_file工具.
  2. 等待工具返回文件内容.
  3. 基于文件内容进行分析和解释.

  可用工具: 
  1. read_file: 用于读取文件内容
  `),
  new HumanMessage(`请读取./package.json文件内容并进行解释.`),
];

// 调用模型,将消息列表传入模型.
let response = await modelWithTools.invoke(messages);
// 我们先来查看一下response都返回了什么.
console.log(response);

/**
 * AIMessage {
  "id": "chatcmpl-ddea4680-c492-92a2-bef4-4b5897918e9f",
  "content": "",
  "additional_kwargs": {
    "tool_calls": [
      {
        "index": 0,
        "id": "call_22fbd534135e4bcfb643040f",
        "type": "function",
        "function": "[Object]"
      }
    ],
    "reasoning_content": "用户要求读取文件\"./01_通过langchain-openai调用大模型\"并进行代码解释。我需要先调用read_file工具读取该文件内容。"
  },
  "response_metadata": {
    "tokenUsage": {
      "promptTokens": 439,
      "completionTokens": 73,
      "totalTokens": 512
    },
    "finish_reason": "tool_calls",
    "model_provider": "openai",
    "model_name": "qwen3.7-plus"
  },
  "tool_calls": [
    {
      "name": "read_file",
      "args": {
        "filePath": "./01_通过langchain-openai调用大模型"
      },
      "type": "tool_call",
      "id": "call_22fbd534135e4bcfb643040f"
    }
  ],
  "invalid_tool_calls": [],
  "usage_metadata": {
    "output_tokens": 73,
    "input_tokens": 439,
    "total_tokens": 512,
    "input_token_details": {
      "cache_read": 0
    },
    "output_token_details": {
      "reasoning": 32
    }
  }
}
 */

// 将大模型返回的消息也push到消息列表
messages.push(response);

// 根据AIMessage的工具列表寻找对应的工具并调用.
while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`[检测到 ${response.tool_calls.length} 个工具需要调用!]`);

  // 执行所有工具调用
  const toolResult = await Promise.all(
    response.tool_calls.map(async (t) => {
      const tool = tools.find((item) => item.name === t.name);

      if (!tool) {
        return `[错误] 找不到工具: ${t.name}`;
      }

      console.log(
        `[开始执行工具] ${t.name}, 参数为: ${JSON.stringify(t.args)}`,
      );

      try {
        const result = await tool.invoke(t.args);
        return result;
      } catch (error) {
        return `[错误] ${error.message}`;
      }
    }),
  );

  // 将工具调用结果添加到消息列表
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        tool_call_id: toolCall.id,
        name: toolCall.name,
        content: toolResult[index],
      }),
    );
  });
  console.log(`[toolResult] ${toolResult}`);
  console.log(`[messages] ${JSON.stringify(messages)}`);

  // 再次调用模型,让模型基于工具结果继续回答.
  response = await modelWithTools.invoke(messages);
  messages.push(response);
}

console.log(response.content);
