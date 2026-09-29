import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { CHAT_LIMITS, CHAT_MODEL, EMBED_DIM, EMBED_MODEL } from "../config/ai.js";
import { env } from "../config/env.js";

/**
 * Shared LangChain + Gemini clients.
 *
 * Constructed lazily so that importing this module never opens a network
 * connection - which keeps unit tests of the pure policy engine free of any
 * API-key or network dependency.
 */

let chatModel: ChatGoogleGenerativeAI | null = null;
let embeddingModel: GoogleGenerativeAIEmbeddings | null = null;

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

export function getEmbeddingModel(): GoogleGenerativeAIEmbeddings {
  if (embeddingModel) return embeddingModel;

  embeddingModel = new GoogleGenerativeAIEmbeddings({
    model: EMBED_MODEL,
    apiKey: env.GEMINI_API_KEY,
    // Must match policy_chunks.embedding vector(1536). Native output is 3072.
    outputDimensionality: EMBED_DIM,
    // LangChain applies RETRIEVAL_QUERY for embedQuery and this value for
    // embedDocuments, which is the correct asymmetric setup for RAG.
    taskType: TaskType.RETRIEVAL_DOCUMENT,
  });

  return embeddingModel;
}
