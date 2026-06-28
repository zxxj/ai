import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { ChatOpenAI } from "@langchain/openai";
import chalk from "chalk";
import "dotenv/config";

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    "amap-maps-streamableHTTP": {
      url: "https://mcp.amap.com/mcp?key=" + process.env.AMAP_MCP_KEY,
    },
    // filesystem: {
    //   command: "npx",
    //   args: [
    //     "-y",
    //     "@modelcontextprotocol/server-filesystem",
    //     process.env.ALLOWED_PATHS,
    //   ],
    // },
    "chrome-devtools": {
      command: "npx",
      args: ["-y", "chrome-devtools-mcp"],
    },
  },
});

const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runAgentWithTools = async (query, maxInteraction = 30) => {
  const messages = [new HumanMessage(query)];

  for (let i = 0; i < maxInteraction; i++) {
    const response = await modelWithTools.invoke(messages);
    messages.push(response);

    // 判断是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(chalk.bgGreen(`[AI最终回复] \n ${response.content}`));
      return response.content;
    }

    // 执行工具
    console.log(
      chalk.bgBlue(
        `[工具调用] 已检测到有${response.tool_calls.length}个工具需要调用!`,
      ),
    );

    for (const toolCall of response.tool_calls) {
      // await sleep(500); // 关键限流，压制QPS
      const currentTool = tools.find((t) => t.name === toolCall.name);

      console.log(chalk.bgBlue(`[工具调用] 开始执行${currentTool.name}工具!`));

      const toolResult = await currentTool.invoke(toolCall.args);

      // 一般我们写tool都是直接返回的字符串,但是filesystem mcp封装的这些tool返回的都是对象,有text属性,需要处理一下.
      let contentStr = "";
      if (typeof toolResult === "string") {
        contentStr = toolResult;
      } else if (toolResult && toolResult.text) {
        // 如果返回对象有text字段,优先使用.
        contentStr = toolResult.text;
      }

      messages.push(
        new ToolMessage({
          tool_call_id: toolCall.id,
          name: toolCall.name,
          content: contentStr,
        }),
      );

      console.log(chalk.bgBlue(`[工具调用] ${currentTool.name}工具执行完成!`));
    }
  }

  return messages[messages.length - 1].content;
};

await runAgentWithTools(
  `查询背景站附近最多3家酒店，不要获取更多；规划前往路线，将酒店信息和路线保存为md文档，只查询不超过3个酒店详情，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名`,
);
await mcpClient.close();
