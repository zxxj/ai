import { tool } from "@langchain/core/tools";
import path from "path";
import fs from "fs/promises";
import z from "zod";

export const writeFileTool = tool(
  async ({ filePath, content }) => {
    try {
      // 传入一个文件路径,返回该文件所在的目录路径. 例如传入: /a/b/c.js,返回的就是/a/b
      const dir = path.dirname(filePath);

      // 如果文件路径不存在,则自动创建文件夹. recursive为true代表允许递归创建,例如/a/b这个层级文件夹不存在,则会自动创建/a/b这两个文件夹
      await fs.mkdir(dir, { recursive: true });

      // 写入文件内容
      await fs.writeFile(filePath, content, "utf-8");

      console.log(
        `[writeFileTool开始执行] 已成功向 ${filePath} 文件中写入 ${content.length} 字节!`,
      );

      return `文件写入成功`;
    } catch (error) {
      console.log(`[writeFileTool调用失败] ${error.message}`);
      return;
    }
  },
  {
    name: "write_file",
    description:
      "向指定路径的文件中写入内容,如果文件目录不存在则允许自动创建目录",
    schema: z.object({
      filePath: z.string().describe("文件的路径"),
      content: z.string().describe("要写入文件的内容"),
    }),
  },
);
