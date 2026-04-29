import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs/promises";


export const readFile = tool(
  async ({ filepath }) => {
    try {
      const content = await fs.readFile(filepath, 'utf-8')
      console.log(`[工具调用] read_file(${filepath}) - 成功读取 (${content.length}) 字节!`)
      return `文件内容 \n ${content}`
    } catch (error) {
      console.log(`[工具调用] read_file(${filepath}) - 文件读取失败 (${error.message}) !`)
      return `文件读取失败: ${error.message}`
    }
  },

  {
    name: "read_file",
    description: "用此工具来读取文件内容. 当用户要求读取文件,查看代码,分析文件内容时调用此工具. 输入文件路径(可以是相对路径或绝对路径).",
    schema: z.object({
      filepath: z.string().describe('要读取的文件路径')
    })
  }
)