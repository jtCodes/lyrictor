import { YoutubeStreamUrlResp } from "./types";

const BASE_URL = "https://youtube-url.vercel.app/api/hello?url=";

export function useYoutubeService() {
  async function getStreamUrl(
    youtubeUrl: string
  ): Promise<YoutubeStreamUrlResp> {
    const rawResp = await fetch(BASE_URL + youtubeUrl);
    const content = (await rawResp.json()) as YoutubeStreamUrlResp;

    return content;
  }

  async function getAudioStreamUrl(youtubeUrl: string): Promise<string> {
    const youtubeStreamUrlResp: YoutubeStreamUrlResp = await getStreamUrl(
      youtubeUrl
    );
    const formatCount = youtubeStreamUrlResp.formats.length;

    return youtubeStreamUrlResp.formats[formatCount - 4].url;
  }

  return [getAudioStreamUrl] as const;
}
