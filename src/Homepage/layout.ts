// Keep viewport sizing separate from the homepage's project and playback state.
export function isPhoneLandscape(width: number, height: number, userAgent: string) {
  return /iPhone|iPod|Android.*Mobile/i.test(userAgent) && width > height && height <= 500;
}

const HOMEPAGE_FEATURED_INFO_HEIGHT = 156;
const HOMEPAGE_DESKTOP_LAYOUT_GAP = 40;
const HOMEPAGE_DESKTOP_RAIL_MAX_WIDTH = 350;
const HOMEPAGE_PROJECT_CARD_WIDTH = 340;
const HOMEPAGE_PHONE_PREVIEW_SIDE_PADDING = 12;

export function getHomepageLayout({
  isFullScreen, usePhoneHomepageLayout, phoneLandscape,
  maxContentWidth = 0, maxContentHeight = 0,
}: {
  isFullScreen: boolean;
  usePhoneHomepageLayout: boolean;
  phoneLandscape: boolean;
  maxContentWidth?: number;
  maxContentHeight?: number;
}) {
  if (phoneLandscape && !isFullScreen) {
    const gap = 12;
    // Reserve enough room for the expanded search pill, including its border.
    const railWidth = Math.min(310, Math.max(302, maxContentWidth * 0.38));
    const previewWidth = Math.max(0, Math.min(
      maxContentWidth - railWidth - gap,
      maxContentHeight * 16 / 9,
    ));
    return {
      shouldUsePhoneHomepageLayout: true,
      shouldUseWideHomepageLayout: false,
      shouldUseDesktopPreviewBranch: true,
      desktopLayoutGap: gap,
      effectiveDesktopProjectRailWidth: railWidth,
      maxWidth: previewWidth,
      maxFeaturedHeight: previewWidth * 9 / 16,
      effectiveProjectListHeight: maxContentHeight,
    };
  }
  const shouldUsePhoneHomepageLayout = Boolean(
    !isFullScreen && usePhoneHomepageLayout
  );
  const shouldUseWideHomepageLayout = Boolean(
    !shouldUsePhoneHomepageLayout &&
      !isFullScreen
  );
  const shouldUseDesktopPreviewBranch = !usePhoneHomepageLayout || phoneLandscape;
  const desktopLayoutGap = shouldUseWideHomepageLayout ? HOMEPAGE_DESKTOP_LAYOUT_GAP : 0;
  const desktopPreviewAvailableHeight = shouldUseWideHomepageLayout
    ? Math.max((maxContentHeight ?? 0) - HOMEPAGE_FEATURED_INFO_HEIGHT, 220)
    : (maxContentHeight ?? 0);
  const desktopPreviewMaxWidthByHeight = shouldUseWideHomepageLayout
    ? (desktopPreviewAvailableHeight * 16) / 9
    : 0;
  const phonePreviewAvailableWidth = Math.max(
    (maxContentWidth ?? 0) - HOMEPAGE_PHONE_PREVIEW_SIDE_PADDING * 2,
    280
  );
  const featuredContentWidth = shouldUseWideHomepageLayout
    ? Math.max(
        Math.min(
          desktopPreviewMaxWidthByHeight,
          (maxContentWidth ?? 0) - HOMEPAGE_PROJECT_CARD_WIDTH - desktopLayoutGap
        ),
        320
      )
    : shouldUsePhoneHomepageLayout
      ? phonePreviewAvailableWidth
      : (maxContentWidth ?? 0);
  const featuredContentHeight = shouldUseWideHomepageLayout
    ? desktopPreviewAvailableHeight
    : (maxContentHeight ?? 0);
  const desktopProjectRailWidth = shouldUseWideHomepageLayout
    ? Math.max(
        HOMEPAGE_PROJECT_CARD_WIDTH,
        (maxContentWidth ?? 0) - featuredContentWidth - desktopLayoutGap
      )
    : 0;
  const effectiveDesktopProjectRailWidth = shouldUseWideHomepageLayout
    ? Math.min(desktopProjectRailWidth, HOMEPAGE_DESKTOP_RAIL_MAX_WIDTH)
    : desktopProjectRailWidth;
  const { maxWidth, maxHeight: maxFeaturedHeight } = calculate16by9Size(
      featuredContentHeight,
      featuredContentWidth,
      shouldUseWideHomepageLayout ? 1 : undefined,
      shouldUsePhoneHomepageLayout
    );
  const projectListHeight = Math.max(
    220,
    (maxContentHeight ?? 0) - maxFeaturedHeight - (shouldUsePhoneHomepageLayout ? 24 : 60)
  );
  const effectiveProjectListHeight = shouldUseWideHomepageLayout
    ? Math.max((maxContentHeight ?? 0) - 12, 320)
    : projectListHeight;
  return { shouldUsePhoneHomepageLayout, shouldUseWideHomepageLayout, shouldUseDesktopPreviewBranch, desktopLayoutGap, effectiveDesktopProjectRailWidth, maxWidth, maxFeaturedHeight, effectiveProjectListHeight };
}

function calculate16by9Size(
  windowHeight: number,
  windowWidth: number,
  heightFactor?: number,
  usePhoneHomepageLayout?: boolean
) {
  const effectiveHeightFactor = heightFactor ?? (usePhoneHomepageLayout ? 0.62 : 0.4);
  const maxHeight = windowHeight * effectiveHeightFactor;
  const maxWidth = (maxHeight * 16) / 9;

  if (maxWidth > windowWidth) {
    const adjustedHeight = (windowWidth * 9) / 16;
    return {
      maxWidth: windowWidth,
      maxHeight: adjustedHeight,
    };
  }

  return {
    maxWidth,
    maxHeight,
  };
}

// These overrides affect only the phone landscape composition, never the controls.
export const phoneLandscapeStyles = {
  grid: {
    paddingLeft: "max(12px, env(safe-area-inset-left))",
    paddingRight: "max(12px, env(safe-area-inset-right))",
    paddingBottom: "max(8px, env(safe-area-inset-bottom))",
    boxSizing: "border-box" as const,
  },
  header: { paddingLeft: 0, paddingRight: 0, paddingTop: 4 },
  preview: { paddingTop: 0 },
  cards: { padding: "4px 0 76px", gap: 12 },
};
