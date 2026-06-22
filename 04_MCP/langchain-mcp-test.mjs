import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import {
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";
import chalk from "chalk";

// 初始化模型
const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

// 创建MPC客户端
const mcpClient = new MultiServerMCPClient({
  // 配置MCP Server
  mcpServers: {
    // mcp server工具集的名称
    "my-mcp-server": {
      command: "node", // 告诉客户端,要启动这个MCP Server,需要执行的系统命令是node
      args: ["/Users/zhangxinxin/Desktop/learn/ai/04_MCP/my-mcp-server.mjs"], // 传给node命令的参数,也就是说让nodejs去运行你电脑上的这个具体脚本文件.
    },
  },
});

// 获取工具
const tools = await mcpClient.getTools();

// 绑定工具
const modelWithTools = model.bindTools(tools);

// resource有什么用呢? 可以将resource里的静态消息放到SystemMessage里,也可以放到HumanMessage里,总之是作为信息引用的.
// 现在大模型就知道了这个resource的信息,就可以根据这个来回答提问了.
let resourceContent = "";
const resource = await mcpClient.listResources();
console.log(`resource ${JSON.stringify(resource)}`);

for (const [serverName, resources] of Object.entries(resource)) {
  console.log(serverName, resources);

  for (const resource of resources) {
    const content = await mcpClient.readResource(serverName, resource.uri);
    console.log(content);
    resourceContent = content[0].text;
    console.log(`resourceContent${resourceContent}`);
  }
}

const runAgentWithTools = async (query, maxIterations = 30) => {
  const messages = [
    new SystemMessage(resourceContent),
    new HumanMessage(query),
  ];

  for (let i = 0; i < maxIterations; i++) {
    console.log(chalk.bgGreen(`[AI思考] 正在等待AI思考,第${i + 1}次执行!`));

    const response = await modelWithTools.invoke(messages);
    console.log(`[AI返回结果] ${response.content}, 第${i + 1}次的结果!`);
    messages.push(response);

    // 检查是否有工具调用
    if (!response.tool_calls || response.tool_calls.length === 0) {
      console.log(`[最终回复] \n ${response.content}`);
      return response.content;
    }

    console.log(
      chalk.bgRed(
        `[工具调用] 检测到有${response.tool_calls.length}个工具需要调用!`,
      ),
    );

    for (const toolCall of response.tool_calls) {
      const currentTool = tools.find((t) => t.name === toolCall.name);

      console.log(
        chalk.bgBlue(`[工具调用] 当前正在执行${currentTool.name}工具.`),
      );

      // 模型调用返回tool_calls消息需要自己调用tool,调用完通过ToolMessage封装返回的消息,继续调用.
      const toolResult = await currentTool.invoke(toolCall.args);

      messages.push(
        new ToolMessage({
          tool_call_id: toolCall.id,
          name: toolCall.name,
          content: toolResult,
        }),
      );
    }
  }

  return messages[messages.length - 1].content;
};

const case1 = `帮我查一下用户001的信息`;
const case2 = `MCP Server的使用指南是什么?`;

// await runAgentWithTools(case1);
await runAgentWithTools(case2);

// 这里进程没退出,因为跑了一个子进程来作为mcp server,需要手动关闭.
await mcpClient.close();
