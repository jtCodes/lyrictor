export interface PredictResp {
  data: [PredictRespFileInfo[], string, string, string];
  is_generating: boolean;
  duration: number;
  average_duration: number;
}

interface PredictRespFileInfo {
  name: string;
  data: any;
  is_file: boolean;
}

export interface Prompt {
  prompt: string;
  all_prompts: string[];
  negative_prompt: string;
  all_negative_prompts: string[];
  seed: number;
  all_seeds: number[];
  subseed: number;
  all_subseeds: number[];
  subseed_strength: number;
  width: number;
  height: number;
  sampler_name: string;
  cfg_scale: number;
  steps: number;
  batch_size: number;
  restore_faces: boolean;
  face_restoration_model: any;
  sd_model_hash: string;
  seed_resize_from_w: number;
  seed_resize_from_h: number;
  denoising_strength: any;
  extra_generation_params: any;
  index_of_first_image: number;
  infotexts: string[];
  styles: string[];
  job_timestamp: string;
  clip_skip: number;
  is_using_inpainting_conditioning: boolean;
}

/**
 * {
    "fn_index": 66,
    "data": [
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
        []
    ],
    "session_hash": ""
}
*/
export interface PredictRequestBody {
  fn_index: number;
  data: any[];
  session_hash: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}
