import { useState } from "react";
import { PredictRequestBody, PredictResp } from "./types";

const LOCAL_WEB_UI_URL: string = "http:/localhost:7860";
const PREDICT_PATH: string = "/run/predict/";

/**
 *
 * handles image generation process: request, status, image url
 */
export function useAIImageService(isLocal: boolean) {
  const url: string = isLocal ? "" : "";
  const [isLoading, setIsLoading] = useState(false);

  async function generateImage(prompt: string): Promise<PredictResp> {
    setIsLoading(true);
    const generateImageUrl = url + PREDICT_PATH;
    const rawResponse = await fetch(generateImageUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createGenerateImageRequestBody(prompt)),
    });
    const content: PredictResp = await rawResponse.json();
    setIsLoading(false);

    return content;
  }

  function createGenerateImageRequestBody(prompt: string): PredictRequestBody {
    return {
      fn_index: 66,
      data: [
        prompt,
        "nude, nsfw",
        "None",
        "None",
        20,
        "DPM++ 2M Karras",
        false,
        false,
        1,
        1,
        7,
        -1,
        -1,
        0,
        0,
        0,
        false,
        768,
        432,
        false,
        0.7,
        2,
        "Latent",
        0,
        0,
        0,
        "None",
        false,
        false,
        false,
        false,
        "",
        "Seed",
        "",
        "Nothing",
        "",
        true,
        false,
        false,
        [],
      ],
      session_hash: "",
    };
  }

  return [generateImage, isLoading] as const;
}
