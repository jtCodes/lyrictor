const DEMO_PROJECTS_URL =
  "https://firebasestorage.googleapis.com/v0/b/angelic-phoenix-314404.appspot.com/o/demo_projects.json?alt=media";

function buildOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || "https";
  return `${protocol}://${host}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

function toPublishedPath(origin, id) {
  return `${origin}/lyrictor/${encodeURIComponent(id)}`;
}

function normalizeLastModified(project) {
  const candidate =
    project?.publishedAt ||
    project?.projectDetail?.updatedDate ||
    project?.projectDetail?.createdDate;

  if (!candidate) {
    return undefined;
  }

  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildUrlEntry(loc, options = {}) {
  const { lastmod, changefreq = "weekly", priority = "0.8" } = options;

  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    `    <changefreq>${escapeXml(changefreq)}</changefreq>`,
    `    <priority>${escapeXml(priority)}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

async function fetchDemoProjects() {
  const response = await fetch(DEMO_PROJECTS_URL);

  if (!response.ok) {
    throw new Error(`Failed to load demo projects: ${response.status} ${response.statusText}`);
  }

  const projects = await response.json();
  return Array.isArray(projects) ? projects : [];
}

async function fetchPublishedFirestoreProjects() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    return [];
  }

  const projects = [];
  let nextPageToken = "";

  do {
    const pageTokenQuery = nextPageToken
      ? `&pageToken=${encodeURIComponent(nextPageToken)}`
      : "";
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        projectId
      )}/databases/(default)/documents/published?key=${encodeURIComponent(apiKey)}${pageTokenQuery}`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load published projects: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const documents = Array.isArray(data.documents) ? data.documents : [];

    projects.push(
      ...documents.map((document) => {
        const fields = document.fields || {};
        const decoded = Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)])
        );

        if (!decoded.id && typeof document.name === "string") {
          const nameParts = document.name.split("/");
          decoded.id = nameParts[nameParts.length - 1];
        }

        return decoded;
      })
    );

    nextPageToken = data.nextPageToken || "";
  } while (nextPageToken);

  return projects;
}

async function fetchAllPublishedProjects() {
  const [demoProjects, firestoreProjects] = await Promise.allSettled([
    fetchDemoProjects(),
    fetchPublishedFirestoreProjects(),
  ]);

  if (demoProjects.status === "rejected") {
    console.warn("Failed to load demo projects for sitemap:", demoProjects.reason);
  }

  if (firestoreProjects.status === "rejected") {
    console.warn(
      "Failed to load Firestore published projects for sitemap:",
      firestoreProjects.reason
    );
  }

  const combined = [
    ...(demoProjects.status === "fulfilled" ? demoProjects.value : []),
    ...(firestoreProjects.status === "fulfilled" ? firestoreProjects.value : []),
  ];
  const seenIds = new Set();

  return combined.filter((project) => {
    const id = project?.id;

    if (!id || id === "local" || seenIds.has(id)) {
      return false;
    }

    seenIds.add(id);
    return true;
  });
}

function buildSitemapXml(origin, projects) {
  const urls = [
    buildUrlEntry(`${origin}/`, { changefreq: "weekly", priority: "1.0" }),
    ...projects.map((project) =>
      buildUrlEntry(toPublishedPath(origin, project.id), {
        lastmod: normalizeLastModified(project),
        changefreq: "weekly",
        priority: "0.8",
      })
    ),
  ];

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
  ].join("\n");
}

export default async function handler(req, res) {
  const origin = buildOrigin(req);

  try {
    const projects = await fetchAllPublishedProjects();
    const xml = buildSitemapXml(origin, projects);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).send(xml);
  } catch (error) {
    console.error("Failed to generate sitemap:", error);

    const fallbackXml = buildSitemapXml(origin, []);
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.status(200).send(fallbackXml);
  }
}