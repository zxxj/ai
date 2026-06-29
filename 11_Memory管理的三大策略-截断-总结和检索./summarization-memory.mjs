import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import {
  AIMessage,
  getBufferString,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

const summarizationMemory = async () => {
  const history = new InMemoryChatMessageHistory();

  const messages = [
    { type: "human", content: "我想学做红烧肉，你能教我吗？" },
    {
      type: "ai",
      content:
        "当然可以！红烧肉是一道经典的中式菜肴。首先需要准备五花肉、冰糖、生抽、老抽、料酒等材料。",
    },
    { type: "human", content: "五花肉需要切多大块？" },
    {
      type: "ai",
      content:
        "建议切成3-4厘米见方的块，这样既容易入味，口感也更好。切好后可以用开水焯一下去除血沫。",
    },
    { type: "human", content: "炒糖色的时候有什么技巧吗？" },
    {
      type: "ai",
      content:
        "炒糖色是关键步骤。用小火慢慢炒，等冰糖完全融化变成焦糖色，冒小泡时就可以下肉了。注意不要炒过头，否则会发苦。",
    },
    { type: "human", content: "需要炖多长时间？" },
    {
      type: "ai",
      content:
        "一般需要炖40-60分钟，用小火慢炖，直到肉变得软糯入味。可以用筷子戳一下，能轻松戳透就说明好了。",
    },
    { type: "human", content: "最后收汁的时候要注意什么？" },
    {
      type: "ai",
      content:
        "收汁时要用大火，不断翻动，让汤汁均匀包裹在肉块上。看到汤汁变得浓稠，颜色红亮就可以出锅了。",
    },
  ];

  const maxMessage = 6; // 超过6条消息时触发总结.
  const keepMessage = 2; // 只保留最近的两条消息.

  // 添加所有消息到内存.
  for (const message of messages) {
    if (message.type === "ai") {
      await history.addMessage(new AIMessage(message.content));
    }

    if (message.type === "human") {
      await history.addMessage(new HumanMessage(message.content));
    }
  }

  // 查看内存中的所有消息.
  const allMessages = await history.getMessages();

  // 消息列表中大于或等于6条消息,则触发总结.
  if (allMessages.length >= maxMessage) {
    // 保存最近两条要保留的消息.
    const recentMessages = allMessages.slice(-keepMessage);

    // 需要总结的消息.
    const summarizationMessages = allMessages.slice(0, -keepMessage);

    console.log(`历史消息过多,开始总结...`);
    console.log(`将要保留的消息条数: ${recentMessages.length}`);
    console.log(`将要总结的消息条数: ${summarizationMessages.length}`);

    // 开始总结将被丢弃的消息.
    const summaryContent = await summarizeHistoryMessage(summarizationMessages);

    // 清空历史消息,只保存最近的两条.
    await history.clear();
    for (const m of recentMessages) {
      await history.addMessage(m);
    }

    console.log(`总结内容(不包含保留的消息): ${summaryContent}`);
  }
};

const summarizeHistoryMessage = async (messages) => {
  if (messages.length === 0) return "";

  const conversationText = getBufferString(messages, {
    humanPrefix: "用户",
    aiPrefix: "助手",
  });

  const summaryPrompt = [
    new SystemMessage(
      `请总结以下对话的核心内容,保留重要信息. ${conversationText}. 总结:`,
    ),
  ];

  const summaryResponse = await model.invoke(summaryPrompt);
  return summaryResponse.content;
};

await summarizationMemory();
