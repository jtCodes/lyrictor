import { VideoAspectRatio } from "../../../Project/types";

export function getPreviewSize(
  maxWidth: number,
  maxHeight: number,
  resolution?: VideoAspectRatio
) {
  if (resolution) {
    let previewWidth = (maxHeight * 16) / 9;
    let previewHeight = maxHeight;

    if (previewWidth > maxWidth) {
      previewWidth = maxWidth;
      previewHeight = (maxWidth * 9) / 16;
    }

    if (previewWidth < 1 || previewHeight < 1) {
      return { previewWidth: 1, previewHeight: 1 };
    }

    return { previewWidth, previewHeight };
  }

  return { previewWidth: maxWidth, previewHeight: maxHeight };
}