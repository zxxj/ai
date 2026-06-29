// 将对话消息存到内存中.

import "dotenv/config";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: process.env.OPENAI_MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
  temperature: 0,
});

const history = new InMemoryChatMessageHistory();

const inMemoryDemo = async () => {
  const systemMessage = new SystemMessage(
    `你是一个情场高手,非常了解女性并且非常喜欢分享你的经验.`,
  );

  // 第一轮对话.
  console.log(`[第一轮对话]`);
  const userMessage1 = new HumanMessage(
    `我还是忘不掉初恋怎么办? 我的初恋名字叫张明慧.`,
  );

  await history.addMessage(userMessage1);

  const messages1 = [systemMessage, ...(await history.getMessages())];
  console.log(messages1);

  const response1 = await model.invoke(messages1);
  console.log(`[用户消息] ${userMessage1.content}`);
  console.log(`[AI回复] ${response1.content}`);
  await history.addMessage(response1);

  // 第二轮对话(基于历史记录).
  console.log(`[第二轮对话.]`);
  const userMessage2 = new HumanMessage(`我的初恋叫什么名字?`);
  await history.addMessage(userMessage2);

  const messages2 = [systemMessage, ...(await history.getMessages())];
  const response2 = await model.invoke(messages2);

  console.log(`[用户消息] ${userMessage2.content}`);
  console.log(`[AI回复] ${response2.content}`);
  await history.addMessage(response1);
};

await inMemoryDemo();
