"use node";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { DEFAULT_MODEL } from "./models";

function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return createOpenRouter({ apiKey });
}

export async function generateJson<T extends z.ZodType>(options: {
  prompt: string;
  schema: T;
  model?: string;
  temperature?: number;
}): Promise<z.infer<T>> {
  const openrouter = getOpenRouter();
  const { object } = await generateObject({
    model: openrouter(options.model ?? DEFAULT_MODEL),
    schema: options.schema,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.3,
  });
  return object as z.infer<T>;
}

export async function generateAiText(options: {
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const openrouter = getOpenRouter();
  const { text } = await generateText({
    model: openrouter(options.model ?? DEFAULT_MODEL),
    system: options.system,
    prompt: options.prompt,
    temperature: options.temperature ?? 0.4,
  });
  return text;
}

export { DEFAULT_MODEL };
