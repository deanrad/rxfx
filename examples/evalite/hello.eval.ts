import { evalite } from "evalite";
import { Levenshtein } from "autoevals";
import ollama from "ollama";

export default evalite("My Eval", {
  // A function that returns an array of test data
  // - TODO: Replace with your test data
  data: async () => {
    return [{ input: "Hello", expected: "Hello World!" }];
  },
  // The task to perform
  // - TODO: Replace with your LLM call
  task: async (input) => {
    const result = await ollama.chat({
      model: "deepseek-r1",
      messages: [{ role: "user", content: "Why is the sky blue?" }],
    });
    return result.message.content;
  },
  // The scoring methods for the eval
  scorers: [Levenshtein],
});
