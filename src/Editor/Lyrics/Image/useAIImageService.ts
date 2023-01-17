import { useState } from "react";
import { PredictRequestBody, PredictResp } from "./types";

const LOCAL_WEB_UI_URL: string = "http:/localhost:7860";
const PREDICT_PATH: string = "/run/predict/";

/**
 *
 * handles image generation process: request, status, image url
 */
export function useAIImageService(isLocal: boolean) {
  const url: string = isLocal ? LOCAL_WEB_UI_URL : "";
  const [isLoading, setState] = useState(false);

  async function generateImage() {
    const generateImageUrl = url + PREDICT_PATH;
    console.log(generateImageUrl)
    const rawResponse = await fetch(PREDICT_PATH, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createGenerateImageRequestBody()),
    });
    const content: PredictResp = await rawResponse.json();

    console.log(content.data[0][0].name)
  }

  function createGenerateImageRequestBody(): PredictRequestBody {
    return {
      fn_index: 66,
      data: [
        "dark, buildings, woods, night, misty",
        "shit",
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
        512,
        512,
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

  return [generateImage] as const;
}
