import { useEffect, useState } from "react";
import { fetchOpenRouterModels } from "../../api/openRouter";
import { AI_STARTING_POINT_MODELS } from "./startingPoint";

export interface TextModelPricing {
  prompt: number;
  completion: number;
}

let textPricingCache: Record<string, TextModelPricing> | null = null;

async function fetchTextModelPricing(): Promise<Record<string, TextModelPricing>> {
  if (textPricingCache) {
    return textPricingCache;
  }

  try {
    const models = await fetchOpenRouterModels();
    const modelIds = new Set<string>(AI_STARTING_POINT_MODELS.map((model) => model.id));
    const pricingByModel: Record<string, TextModelPricing> = {};

    for (const model of models) {
      if (!modelIds.has(model.id) || !model.pricing) {
        continue;
      }

      pricingByModel[model.id] = {
        prompt: parseFloat(model.pricing.prompt) || 0,
        completion: parseFloat(model.pricing.completion) || 0,
      };
    }

    textPricingCache = pricingByModel;
    return pricingByModel;
  } catch {
    return {};
  }
}

function formatCostTier(pricing: TextModelPricing): string {
  const costPer1k = pricing.completion * 1000;

  if (costPer1k < 0.003) {
    return "$";
  }

  if (costPer1k < 0.005) {
    return "$$";
  }

  return "$$$";
}

export function useOpenRouterTextModelPricing() {
  const [pricing, setPricing] = useState<Record<string, TextModelPricing>>({});

  useEffect(() => {
    fetchTextModelPricing().then(setPricing);
  }, []);

  function getLabel(model: (typeof AI_STARTING_POINT_MODELS)[number]) {
    const modelPricing = pricing[model.id];

    if (!modelPricing) {
      return model.label;
    }

    return `${model.label} (${formatCostTier(modelPricing)})`;
  }

  return { pricing, getLabel };
}