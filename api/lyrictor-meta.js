const DEFAULT_TITLE = "Lyrictor";
const DEFAULT_DESCRIPTION =
  "Free browser-based lyric video editor with beat-synced visualizers, AI-generated backgrounds, and Apple Music-style scroll, plus desktop YouTube support. No download required for web editing.";
const DEMO_PROJECTS_URL =
  "https://firebasestorage.googleapis.com/v0/b/angelic-phoenix-314404.appspot.com/o/demo_projects.json?alt=media";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}`;
}

function decodeFirestoreValue(value) {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) {
    return value.stringValue;
  }

  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) {
    return value.booleanValue;
  }

  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) {
    return Number(value.integerValue);
  }

  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) {
    return Number(value.doubleValue);
  }

  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) {
    return value.timestampValue;
  }

  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(value, "mapValue")) {
    const fields = value.mapValue?.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([key, nestedValue]) => [key, decodeFirestoreValue(nestedValue)])
    );
  }

  if (Object.prototype.hasOwnProperty.call(value, "arrayValue")) {
    return (value.arrayValue?.values || []).map(decodeFirestoreValue);
  }

  return undefined;
}

async function fetchPublishedFirestoreProject(publishedId) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    return null;
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/published/${encodeURIComponent(publishedId)}?key=${encodeURIComponent(apiKey)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load published project: ${response.status} ${response.statusText}`);
  }

  const document = await response.json();
  const fields = document.fields || {};

  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
  );
}

async function fetchDemoProject(publishedId) {
  const response = await fetch(DEMO_PROJECTS_URL);

  if (!response.ok) {
    throw new Error(`Failed to load demo projects: ${response.status} ${response.statusText}`);
  }

  const projects = await response.json();
  return projects.find((project) => project?.id === publishedId) || null;
}

async function fetchSharedProject(publishedId) {
  let demoProject = null;

  try {
    demoProject = await fetchDemoProject(publishedId);
  } catch (error) {
    console.warn("Failed to load demo project metadata:", error);
  }

  if (demoProject) {
    return demoProject;
  }

  return fetchPublishedFirestoreProject(publishedId);
}

function makeAbsoluteUrl(origin, value) {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("/")) {
    return `${origin}${value}`;
  }

  return `${origin}/${value}`;
}

function normalizeSeoComparisonValue(value) {
  if (!value) {
    return "";
  }

  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function shouldDedupeProjectTitle(projectName, songName, artistName) {
  const normalizedProjectName = normalizeSeoComparisonValue(projectName);
  const normalizedSongName = normalizeSeoComparisonValue(songName);
  const normalizedArtistName = normalizeSeoComparisonValue(artistName);

  if (!normalizedProjectName) {
    return false;
  }

  if (normalizedSongName && normalizedArtistName) {
    return (
      normalizedProjectName.includes(normalizedSongName) &&
      normalizedProjectName.includes(normalizedArtistName)
    );
  }

  if (normalizedSongName) {
    return normalizedProjectName === normalizedSongName;
  }

  if (normalizedArtistName) {
    return normalizedProjectName === normalizedArtistName;
  }

  return false;
}

function buildProjectMeta(project, origin, pageUrl) {
  const projectDetail = project?.projectDetail || {};
  const titleBase = projectDetail.name || "Published preview";
  const songName = projectDetail.songName;
  const artistName = projectDetail.artistName;
  const subtitle = [songName, artistName]
    .filter(Boolean)
    .join(" • ");
  const username = project?.username ? `@${project.username}` : undefined;
  const albumArt = makeAbsoluteUrl(origin, projectDetail.albumArtSrc) || `${origin}/logo512.png`;
  const dedupeProjectTitle = shouldDedupeProjectTitle(titleBase, songName, artistName);
  const title = subtitle
    ? dedupeProjectTitle
      ? `${subtitle} | Lyrictor`
      : `${titleBase} | ${subtitle}`
    : `${titleBase} | Lyrictor`;

  const descriptionParts = [
    songName && artistName
      ? `${titleBase} is a lyric video interpretation of ${songName} by ${artistName}.`
      : subtitle
        ? `${titleBase} is a published lyric video preview for ${subtitle}.`
        : `${titleBase} is a published lyric video preview on Lyrictor.`,
    username ? `Created by ${username}.` : undefined,
    "Watch the published preview and explore the visual treatment on Lyrictor.",
  ].filter(Boolean);

  return {
    title,
    description: descriptionParts.join(" "),
    url: pageUrl,
    image: albumArt,
    songName,
    artistName,
    projectName: titleBase,
    username,
  };
}

function replaceTitle(html, title) {
  const escapedTitle = escapeHtml(title);

  if (/<title>.*<\/title>/i.test(html)) {
    return html.replace(/<title>.*<\/title>/i, `<title>${escapedTitle}</title>`);
  }

  return html.replace("</head>", `<title>${escapedTitle}</title></head>`);
}

function upsertMetaTag(html, attributeName, attributeValue, content) {
  const escapedAttributeValue = attributeValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tagPattern = new RegExp(
    `<meta[^>]*${attributeName}=["']${escapedAttributeValue}["'][^>]*>` ,
    "i"
  );
  const escapedContent = escapeHtml(content);
  const replacement = `<meta ${attributeName}="${attributeValue}" content="${escapedContent}" />`;

  if (tagPattern.test(html)) {
    return html.replace(tagPattern, replacement);
  }

  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function upsertCanonicalLink(html, url) {
  const escapedUrl = escapeHtml(url);
  const linkPattern = /<link[^>]*rel=["']canonical["'][^>]*>/i;
  const replacement = `<link rel="canonical" href="${escapedUrl}" />`;

  if (linkPattern.test(html)) {
    return html.replace(linkPattern, replacement);
  }

  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function upsertJsonLd(html, jsonLd) {
  const replacement = `<script id="lyrictor-published-jsonld" type="application/ld+json">${escapeHtml(
    JSON.stringify(jsonLd)
  )}</script>`;
  const scriptPattern = /<script[^>]*id=["']lyrictor-published-jsonld["'][^>]*>.*?<\/script>/is;

  if (scriptPattern.test(html)) {
    return html.replace(scriptPattern, replacement);
  }

  return html.replace("</head>", `    ${replacement}\n  </head>`);
}

function injectSeoContent(html, meta) {
  if (html.includes('id="lyrictor-published-seo-copy"')) {
    return html;
  }

  const heading = meta.songName && meta.artistName
    ? `${meta.songName} by ${meta.artistName} lyric video preview`
    : `${meta.projectName} lyric video preview`;
  const byline = meta.username
    ? `Created by ${meta.username} on Lyrictor.`
    : "Published on Lyrictor.";

  const seoBlock = [
    '<section id="lyrictor-published-seo-copy" aria-label="Published project summary" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;white-space:normal;">',
    `  <h1>${escapeHtml(heading)}</h1>`,
    `  <p>${escapeHtml(meta.description)}</p>`,
    `  <p>${escapeHtml(byline)}</p>`,
    '</section>',
  ].join("\n");

  return html.replace('<div id="root"></div>', `${seoBlock}\n    <div id="root"></div>`);
}

function injectMetaTags(html, meta) {
  let nextHtml = replaceTitle(html, meta.title);

  nextHtml = upsertMetaTag(nextHtml, "name", "description", meta.description);
  nextHtml = upsertMetaTag(nextHtml, "name", "robots", "index,follow");
  nextHtml = upsertMetaTag(nextHtml, "property", "og:type", "website");
  nextHtml = upsertMetaTag(nextHtml, "property", "og:title", meta.title);
  nextHtml = upsertMetaTag(nextHtml, "property", "og:description", meta.description);
  nextHtml = upsertMetaTag(nextHtml, "property", "og:url", meta.url);
  nextHtml = upsertMetaTag(nextHtml, "property", "og:site_name", "Lyrictor");
  nextHtml = upsertMetaTag(nextHtml, "property", "og:image", meta.image);
  nextHtml = upsertMetaTag(nextHtml, "name", "twitter:card", "summary_large_image");
  nextHtml = upsertMetaTag(nextHtml, "name", "twitter:title", meta.title);
  nextHtml = upsertMetaTag(nextHtml, "name", "twitter:description", meta.description);
  nextHtml = upsertMetaTag(nextHtml, "name", "twitter:image", meta.image);
  nextHtml = upsertCanonicalLink(nextHtml, meta.url);
  nextHtml = upsertJsonLd(nextHtml, {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: meta.projectName,
    headline: meta.title,
    description: meta.description,
    url: meta.url,
    image: meta.image,
    creator: meta.username
      ? {
          "@type": "Person",
          name: meta.username.replace(/^@/, ""),
        }
      : undefined,
    about: [meta.songName, meta.artistName].filter(Boolean),
  });
  nextHtml = injectSeoContent(nextHtml, meta);

  return nextHtml;
}

async function fetchBaseHtml(origin) {
  const response = await fetch(`${origin}/index.html`);

  if (!response.ok) {
    throw new Error(`Failed to load base HTML: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export default async function handler(req, res) {
  const origin = buildOrigin(req);
  const rawPublishedId = Array.isArray(req.query.publishedId)
    ? req.query.publishedId[0]
    : req.query.publishedId;
  const publishedId = typeof rawPublishedId === "string" ? rawPublishedId : "";
  const pageUrl = `${origin}/lyrictor/${encodeURIComponent(publishedId)}`;

  try {
    const [baseHtml, project] = await Promise.all([
      fetchBaseHtml(origin),
      publishedId && publishedId !== "local" ? fetchSharedProject(publishedId) : Promise.resolve(null),
    ]);

    const meta = project
      ? buildProjectMeta(project, origin, pageUrl)
      : {
          title: DEFAULT_TITLE,
          description: DEFAULT_DESCRIPTION,
          url: pageUrl,
          image: `${origin}/logo512.png`,
        };

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(injectMetaTags(baseHtml, meta));
  } catch (error) {
    console.error("Failed to render lyrictor metadata page:", error);

    try {
      const baseHtml = await fetchBaseHtml(origin);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(200).send(baseHtml);
    } catch (htmlError) {
      console.error("Failed to load base HTML fallback:", htmlError);
      res.status(500).send("Failed to render page");
    }
  }
}