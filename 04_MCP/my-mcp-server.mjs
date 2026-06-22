import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";

// 数据库
const database = {
  users: {
    "001": { id: "001", name: "张三", email: "zhangsan.qq.com" },
    "002": { id: "002", name: "李四", email: "lisi.qq.com" },
    "003": { id: "003", name: "王五", email: "wangwu.qq.com" },
    "004": { id: "004", name: "赵六", email: "zhaoliu.qq.com" },
  },
};

// 创建mcp实例
const server = new McpServer({
  name: "my-mcp-server",
  version: "0.1.0",
});

// 注册工具
server.registerTool(
  "query_user",
  {
    description:
      "查询数据库中的用户信息. 输入用户ID,返回该用户的详细信息(用户ID,姓名,邮箱).",
    inputSchema: {
      userId: z.string().describe("用户ID,例如: 001,002,003"),
    },
  },
  async ({ userId }) => {
    const user = database.users[userId];

    if (!user) {
      return {
        content: [
          {
            type: "text",
            text: `用户ID ${userId} 不存在! 可用的ID: 001,002,003`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `已查询到用户ID为${userId}的信息! 用户ID: ${user.id},用户名: ${user.name},用户邮箱: ${user.email}`,
        },
      ],
    };
  },
);

server.registerResource(
  "使用指南",
  "docs://guide",
  {
    description: "MCP Server使用文档.",
    mimeType: "text/plain",
  },
  async () => {
    return {
      contents: [
        {
          uri: "docs://guide",
          mimeType: "text/plain",
          text: `MCP Server使用指南.
             功能: 提供用户查询等工具.
             使用: 在MCP Client中通过自然语言对话,自动调用此工具.
      `,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
