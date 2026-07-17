const OPENROUTER_KEY_INFO_URL = "https://openrouter.ai/api/v1/key";

export interface OpenRouterKeyInfo {
  limit: number | null;
  limit_remaining: number | null;
  limit_reset: string | null;
  usage: number;
}

interface OpenRouterKeyInfoResponse {
  data?: OpenRouterKeyInfo;
}

export async function fetchOpenRouterKeyInfo(
  apiKey: string
): Promise<OpenRouterKeyInfo> {
  const response = await fetch(OPENROUTER_KEY_INFO_URL, {
    headers: {
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-OpenRouter-Title": "Lyrictor",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenRouter API error ${response.status}: ${
        body || `Request failed with status ${response.status}`
      }`
    );
  }

  const data: OpenRouterKeyInfoResponse = await response.json();

  if (!data.data) {
    throw new Error("OpenRouter returned an empty key response");
  }

  return data.data;
}
