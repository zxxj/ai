// 加载历史文件并继续提问.

import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { FileSystemChatMessageHistory } from "@langchain/community/stores/message/file_system";
import "dotenv/config";
import path from "node:path";

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

const fileHistoryDemo = async () => {
  // 指定存储文件的路径.
  const filePath = path.join(process.cwd(), "chat_history1.json");
  const sessionId = "user_session_1";

  console.log(filePath);

  // 系统提示词.
  const systemMessage = new SystemMessage(
    `你是一个情场高手,非常了解女性并擅长为分享你的情感经历,但你很高冷,回复从不超过50个字.`,
  );

  const restoredHistory = new FileSystemChatMessageHistory({
    filePath,
    sessionId,
  });

  const restoredMessage = await restoredHistory.getMessages();
  console.log(`从文件恢复了 ${restoredMessage.length} 条历史信息.`);

  // 第三轮对话(基于从文件中恢复的历史记录).
  const userMessage = new HumanMessage(`她叫什么来着?`);
  await restoredHistory.addMessage(userMessage);
  console.log(`[对话已更新到文件.]`);

  const messages = [systemMessage, ...(await restoredHistory.getMessages())];

  const response = await model.invoke(messages);
  await restoredHistory.addMessage(response);

  console.log(`[对话已更新到文件.]`);
  console.log(`[用户问题] ${userMessage.content}`);
  console.log(`[AI回复] ${response.content}`);
};

await fileHistoryDemo();
