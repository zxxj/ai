// 将对话存入文件中.

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

  // 第一轮对话.
  console.log(`[第一轮对话]`);

  const history = new FileSystemChatMessageHistory({
    filePath,
    sessionId,
  });

  const userMessage1 = new HumanMessage(`我忘不掉初恋怎么办? 她叫张明慧.`);
  await history.addMessage(userMessage1);
  console.log(`[对话已更新到文件.]`);

  const messages1 = [systemMessage, ...(await history.getMessages())];
  const response1 = await model.invoke(messages1);
  console.log(`[用户问题] ${userMessage1.content}`);
  console.log(`[AI回复] ${response1.content}`);

  await history.addMessage(response1);
  console.log(`[对话已更新到文件.]`);

  // 第二轮对话(基于历史记录).
  const userMessage2 = new HumanMessage(`我的初恋叫什么名字?`);
  await history.addMessage(userMessage2);
  console.log(`[对话已更新到文件.]`);

  const messages2 = [systemMessage, ...(await history.getMessages())];

  const response2 = await model.invoke(messages2);
  await history.addMessage(response2);

  console.log(`[对话已更新到文件.]`);
  console.log(`[用户问题] ${userMessage2.content}`);
  console.log(`[AI回复] ${response2.content}`);
};

await fileHistoryDemo();
