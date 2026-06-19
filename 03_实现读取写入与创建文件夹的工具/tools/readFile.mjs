import { tool } from "@langchain/core/tools";
import fs from "fs/promises";
import z from "zod";

const readFileTool = tool(
  async ({ filePath }) => {
    console.log(`[readFileTool 开始执行!]`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      console.log(`[readFileTool 已成功读取文件,共 ${content.length} 字节!]`);
      return content;
    } catch (error) {
      console.log(`[readFileTool 读取文件失败!]`);
      return;
    }
  },
  {
    name: "read_file",
    description:
      "此工具用于读取文件内容.当用户要求读取文件时调用此工具,要求输入文件路径(支持相对路径和绝对路径).",
    schema: z.object({
      filePath: z
        .string()
        .describe("要读取的文件路径,例如'./README.MD'或'/test.js'"),
    }),
  },
);
