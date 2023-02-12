import { useState } from "react";
import {
  PredictParams,
  PredictRequestBody,
  PredictResp,
  PromptParams,
} from "./types";

const LOCAL_WEB_UI_URL: string = "http://127.0.0.1:7860";
const PREDICT_PATH: string = "/run/predict/";

/**
 *
 * handles image generation process: request, status, image url
 */
export function useAIImageService(isLocal: boolean) {
  const url: string = isLocal ? LOCAL_WEB_UI_URL : "";
  const [isLoading, setIsLoading] = useState(false);
  const [isLocalAIRunning, setIsLocalAIRunning] = useState(false);

  async function checkIfLocalAIRunning(): Promise<boolean> {
    try {
      const resp = await fetch(url + PREDICT_PATH, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fn_index: 94,
          data: [null, "", ""],
          session_hash: "y3c2bcanj7q",
        }),
      });
      setIsLocalAIRunning(resp.ok);
    } catch (error) {
      setIsLocalAIRunning(false);
    }
    return false;
  }
  
  async function generateImage(prompt: PromptParams): Promise<PredictResp> {
    setIsLoading(true);
    const url: string = isLocal ? LOCAL_WEB_UI_URL : "";
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

    const predictParams: PredictParams = JSON.parse(
      content.data[1] as string
    ) as PredictParams;
    content.data[1] = predictParams;

    return content;
  }

  function createGenerateImageRequestBody(
    prompt: PromptParams
  ): PredictRequestBody {
    console.log(prompt);
    return {
      fn_index: 77,
      data: [
        "task(ucrk5a8tebr85os)",
        prompt.prompt,
        "nude, nsfw",
        [""],
        20,
        "DPM++ 2M Karras",
        false,
        false,
        1,
        1,
        7,
        prompt.seed,
        -1,
        0,
        0,
        0,
        false,
        512,
        768,
        false,
        0.7,
        2,
        "Latent",
        0,
        0,
        0,
        [],
        "None",
        false,
        false,
        "positive",
        "comma",
        false,
        false,
        "",
        "Seed",
        "",
        "Nothing",
        "",
        "Nothing",
        "",
        true,
        false,
        false,
        false,
        [],
        "",
        "",
        "",
      ],
      session_hash: "",
    };
  }

  return [
    generateImage,
    isLoading,
    checkIfLocalAIRunning,
    isLocalAIRunning,
  ] as const;
}
