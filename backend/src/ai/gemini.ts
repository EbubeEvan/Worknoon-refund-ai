import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { CHAT_LIMITS, CHAT_MODEL } from "../config/ai.js";
import { env } from "../config/env.js";

/**
 * Shared LangChain + Gemini chat client.
 *
 * Constructed lazily so that importing this module never opens a network
 * connection - which keeps unit tests of the pure policy engine free of any
 * API-key or network dependency.
 */

let chatModel: ChatGoogleGenerativeAI | null = null;

export function getChatModel(): ChatGoogleGenerativeAI {
  if (chatModel) return chatModel;

  chatModel = new ChatGoogleGenerativeAI({
    model: CHAT_MODEL,
    apiKey: env.GEMINI_API_KEY,
    temperature: CHAT_LIMITS.temperature,
    maxOutputTokens: CHAT_LIMITS.maxOutputTokens,
    // NOTE: `thinkingConfig` is deliberately omitted.
    // gemini-3.5-flash-lite is a thinking model, and setting thinkingBudget: 0
    // returns HTTP 400 "Request contains an invalid argument" (verified against
    // the live API). Omitting the config uses the model default and works.
  });

  return chatModel;
}
