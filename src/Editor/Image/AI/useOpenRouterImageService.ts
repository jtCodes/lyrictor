import { useEffect, useState } from "react";
import { useOpenRouterStore } from "../../../api/openRouterStore";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export const OPENROUTER_IMAGE_MODELS = [
  {
    id: "google/gemini-2.5-flash-image",
    label: "Gemini 2.5 Flash Image",
  },
  {
    id: "google/gemini-3.1-flash-image-preview",
    label: "Gemini 3.1 Flash Image",
  },
  {
    id: "openai/gpt-5-image-mini",
    label: "GPT-5 Image Mini",
  },
  {
    id: "openai/gpt-5-image",
    label: "GPT-5 Image",
  },
] as const;

export type OpenRouterImageModelId =
  (typeof OPENROUTER_IMAGE_MODELS)[number]["id"];

export interface ModelPricing {
  prompt: number; // cost per token (input)
  completion: number; // cost per token (output)
}

function formatCostTier(pricing: ModelPricing): string {
  // Use output cost as the main indicator since image generation is output-heavy
  const costPer1k = pricing.completion * 1000;
  if (costPer1k < 0.003) return "$";
  if (costPer1k < 0.005) return "$$";
  return "$$$";
}

// Cache pricing so we only fetch once per session
let pricingCache: Record<string, ModelPricing> | null = null;

async function fetchModelPricing(): Promise<Record<string, ModelPricing>> {
  if (pricingCache) return pricingCache;
  try {
    const resp = await fetch(OPENROUTER_MODELS_URL);
    if (!resp.ok) return {};
    const data = await resp.json();
    const modelIds = new Set(OPENROUTER_IMAGE_MODELS.map((m) => m.id));
    const result: Record<string, ModelPricing> = {};
    for (const model of data.data ?? []) {
      if (modelIds.has(model.id) && model.pricing) {
        result[model.id] = {
          prompt: parseFloat(model.pricing.prompt) || 0,
          completion: parseFloat(model.pricing.completion) || 0,
        };
      }
    }
    pricingCache = result;
    return result;
  } catch {
    return {};
  }
}

export function useModelPricing() {
  const [pricing, setPricing] = useState<Record<string, ModelPricing>>({});

  useEffect(() => {
    fetchModelPricing().then(setPricing);
  }, []);

  function getLabel(model: (typeof OPENROUTER_IMAGE_MODELS)[number]): string {
    const p = pricing[model.id];
    if (!p) return model.label;
    return `${model.label} (${formatCostTier(p)})`;
  }

  return { pricing, getLabel };
}

export interface OpenRouterImageResult {
  imageDataUrl: string; // base64 data URL (data:image/png;base64,...)
  textContent: string | null;
}

interface OpenRouterImageResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      images?: Array<{
        type: "image_url";
        image_url: { url: string };
      }>;
    };
  }>;
}

export function useOpenRouterImageService() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiKey = useOpenRouterStore((state) => state.apiKey);

  async function generateImage(
    prompt: string,
    model: OpenRouterImageModelId = "google/gemini-2.5-flash-image"
  ): Promise<OpenRouterImageResult | null> {
    if (!apiKey) {
      setError("Not authenticated with OpenRouter");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-OpenRouter-Title": "Lyrictor",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errBody}`);
      }

      const data: OpenRouterImageResponse = await response.json();
      const message = data.choices?.[0]?.message;

      if (!message?.images?.length) {
        throw new Error("No image returned from model");
      }

      return {
        imageDataUrl: message.images[0].image_url.url,
        textContent: message.content,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Image generation failed";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { generateImage, isLoading, error };
}
