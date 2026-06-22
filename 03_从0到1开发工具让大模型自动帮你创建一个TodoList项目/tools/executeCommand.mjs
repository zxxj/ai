import { tool } from "@langchain/core/tools";
import { spawn } from "node:child_process";
import z from "zod";

export const executeCommand = tool(
  async ({ command, workingDirectory }) => {
    // 获取当前所在的路径
    const cwd = workingDirectory || process.cwd();

    console.log(
      `[executeCommand 开始执行] ${command} ${workingDirectory ? `工作目录${workingDirectory}` : ""}`,
    );

    // 解析命令和参数
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(" ");

      const child = spawn(cmd, args, {
        cwd,
        stdio: "inherit", // 实时输出到终端
        shell: true,
      });

      let errorMsg = "";

      child.on("error", (error) => {
        errorMsg = error.message;
      });

      child.on("close", (code) => {
        if (code === 0) {
          console.log(`[executeCommand close 执行] ${command} 执行成功!`);

          resolve(`命令执行成功: ${command} ${workingDirectory}`);
        } else {
          console.log(
            `[executeCommand close 执行] ${command} 执行失败, 退出码 ${code}`,
          );
          resolve(
            `命令执行失败,退出码: ${code}${errorMsg ? "\n错误: " + errorMsg : ""}`,
          );
        }
      });
    });
  },
  {
    name: "execute_command",
    description: "执行系统命令,支持指定工作目录,实时显示输出.",
    schema: z.object({
      command: z.string().describe("要执行的命令"),
      workingDirectory: z.string().optional().describe("工作目录,推荐指定"),
    }),
  },
);
