import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core';
import fs from 'node:fs/promises';
import { z } from 'zod';

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(
      `[工具开始调用] read_file("${filePath}") - 成功读取 ${content.length} 字节!`,
    );
    return `文件内容: \n${content}`;
  },
  {
    name: 'read_file',
    description:
      '用此工具来读取文件的内容. 当用户要求读取文件时/查看代码/分析文件内容时,调用此工具. 输入文件路径(支持相对路径和绝对路径).',
    schema: z.object({
      filePath: z.string().describe('要读取的文件路径,支持相对路径和绝对路径'),
    }),
  },
);

const tools = [readFileTool];

const modelWithTools = model.bindTools(tools);
