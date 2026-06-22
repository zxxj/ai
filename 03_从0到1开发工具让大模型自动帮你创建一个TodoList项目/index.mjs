import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { readFileTool } from "./tools/readFile.mjs";
import { writeFileTool } from "./tools/writeFile.mjs";
import { executeCommand } from "./tools/executeCommand.mjs";
import { listDirectoryTool } from "./tools/listDirectory.mjs";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import chalk from "chalk";

console.log(process.env);
const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

const tools = [readFileTool, writeFileTool, executeCommand, listDirectoryTool];

// 绑定工具到模型
const modelWithTools = model.bindTools(tools);

// agent执行函数
const runAgentWithTools = async (query, maxIterations = 30) => {
  // 最大循环次数是30次.

  const messages = [
    new SystemMessage(`你是一个项目管理助手,使用工具完成任务. 当前工作目录为: ${process.cwd()}. 
    已有工具: 
    1. read_file: 读取文件.
    2. write_file: 向指定文件写入内容.
    3. execute_command: 执行命令.
    4. list_directory: 列出目录.

    回复要简介,列出做了什么就行.
    `),

    new HumanMessage(query),
  ];

  // 调用模型.
  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgRed(`[开始第${i + 1}次调用模型]}`));
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(
        chalk.bgYellow(`[没有了工具调用] 最终回复: ${response.content}`),
      );
    }

    for (const toolCall of response.tool_calls) {
      const tool = tools.find((t) => t.name === toolCall.name);
      console.log(
        chalk.bgBlue(
          `[开始第调用 ${tool.name}工具! 工具参数是 ${JSON.stringify(toolCall.args)}]`,
        ),
      );

      const toolResult = await tool.invoke(toolCall.args);
      messages.push(
        new ToolMessage({
          tool_call_id: toolCall.id,
          name: toolCall.name,
          content: toolResult,
        }),
      );
      console.log(chalk.bgBlue(`[ ${tool.name}工具调用完成!]`));
    }
  }

  return messages[messages.length - 1].content;
};

const case1 = `创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
 - 添加、删除、编辑、标记完成
 - 分类筛选（全部/进行中/已完成）
 - 统计信息显示
 - localStorage 数据持久化
3. 添加复杂样式：
 - 渐变背景（蓝到紫）
 - 卡片阴影、圆角
 - 悬停效果
4. 添加动画：
 - 添加/删除时的过渡动画
 - 使用 CSS transitions
5. 列出目录确认

注意：使用 pnpm，功能要完整，样式要美观，要有动画效果

之后在 react-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器
`;

runAgentWithTools(case1);
