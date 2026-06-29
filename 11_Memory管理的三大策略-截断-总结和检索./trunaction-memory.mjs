// 截断的两种方式

import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { trimMessages } from "@langchain/core/messages";
import { getEncoding } from "js-tiktoken";

// 1. 根据消息数量截断
const messageCountTruncation = async () => {
  const history = new InMemoryChatMessageHistory();

  const maxMessages = 4;

  const messages = [
    { type: "human", content: "我叫张三" },
    { type: "ai", content: "你好张三，很高兴认识你！" },
    { type: "human", content: "我今年25岁" },
    { type: "ai", content: "25岁正是青春年华，有什么我可以帮助你的吗？" },
    { type: "human", content: "我喜欢编程" },
    { type: "ai", content: "编程很有趣！你主要用什么语言？" },
    { type: "human", content: "我住在北京" },
    { type: "ai", content: "北京是个很棒的城市！" },
    { type: "human", content: "我的职业是软件工程师" },
    { type: "ai", content: "软件工程师是个很有前景的职业！" },
  ];

  // 将消息添加到内存中.
  for (const message of messages) {
    if (message.type === "ai") {
      await history.addAIMessage(message);
    }

    if (message.type === "human") {
      await history.addUserMessage(message);
    }
  }

  const allMessages = await history.getMessages();
  console.log(allMessages);

  // 按消息数量截断: 保留最近maxMessages条消息.
  const trimmedMessages = allMessages.splice(-maxMessages);
  console.log(trimmedMessages);

  console.log(`保留的消息数量: ${trimmedMessages.length}`);
  console.log(
    `保留的消息:\n${trimmedMessages.map((m) => `${m.constructor.name}: ${m.content}`).join("\n")}`,
  );
};

// messageCountTruncation();

// 2. 根据token数量截断(使用 js-tiktoken计算token数量).
// 计算消息数组的总token数量.
const countToken = (messages, encoder) => {
  let total = 0;

  for (const message of messages) {
    const content =
      typeof message.content === "string"
        ? message.content
        : JSON.stringify(message.content);
    total += encoder.encode(content).length;
  }

  return total;
};

const tokenCountTruncation = async () => {
  const history = new InMemoryChatMessageHistory();

  const maxTokens = 100; // 限制最多100token,超出则进行截断.

  const enc = getEncoding("cl100k_base");

  const messages = [
    { type: "human", content: "我叫李四" },
    { type: "ai", content: "你好李四，很高兴认识你！" },
    { type: "human", content: "我是一名设计师" },
    {
      type: "ai",
      content: "设计师是个很有创造力的职业！你主要做什么类型的设计？",
    },
    { type: "human", content: "我喜欢艺术和音乐" },
    { type: "ai", content: "艺术和音乐都是很好的爱好，它们能激发创作灵感。" },
    { type: "human", content: "我擅长 UI/UX 设计" },
    { type: "ai", content: "UI/UX 设计非常重要，好的用户体验能让产品更成功！" },
  ];

  // 添加所有消息到内存.
  for (const message of messages) {
    if (message.type === "ai") {
      await history.addAIMessage(message);
    }

    if (message.type === "human") {
      await history.addUserMessage(message);
    }
  }

  // 获取所有消息.
  const allMessages = await history.getMessages();

  // 使用trimMessage.
  const trimmedMessages = await trimMessages(allMessages, {
    maxTokens: maxTokens,
    tokenCounter: async (message) => countToken(message, enc),
    strategy: "last", // 保留最近的消息.
  });

  const totalToken = countToken(trimmedMessages, enc);

  console.log(`总token数量: ${totalToken}`);
  console.log(`保留消息数量: ${trimmedMessages.length}`);
  console.log(
    `保留的消息:\n${trimmedMessages.map((m) => `${m.constructor.name} ${m.content}`).join("\n")}`,
  );
};

await tokenCountTruncation();
