import { tool } from "@langchain/core/tools";
import fs from "fs/promises";
import z from "zod";

export const listDirectoryTool = tool(
  async ({ directoryPath }) => {
    try {
      // 读取指定目录下的文件
      const files = await fs.readdir(directoryPath);
      console.log(
        `[listDirectoryTool 开始执行] 在 ${directoryPath} 目录下查询到 ${files.length} 个文件!`,
      );

      return `目录内容如下: \n ${files.map((f) => `${f}`).join("\n")}`;
    } catch (error) {
      console.log(`[listDirectoryTool 执行失败] ${error.message}`);
      return `列出目录失败: ${error.message}`;
    }
  },
  {
    name: "list_directory",
    description: "列出指定目录下的所有文件和文件夹",
    schema: z.object({
      directoryPath: z.string().describe("目录路径"),
    }),
  },
);
