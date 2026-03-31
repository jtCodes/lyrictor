function normalizeCountry(value) {
  if (typeof value !== "string") {
    return "us";
  }

  const normalized = value.trim().toLowerCase();
  return /^[a-z]{2}$/.test(normalized) ? normalized : "us";
}

function normalizeLimit(value) {
  const parsed = Number.parseInt(String(value ?? "5"), 10);

  if (!Number.isFinite(parsed)) {
    return 5;
  }

  return Math.min(100, Math.max(1, parsed));
}

export default async function handler(req, res) {
  const country = normalizeCountry(Array.isArray(req.query.country) ? req.query.country[0] : req.query.country);
  const limit = normalizeLimit(Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit);

  try {
    const response = await fetch(
      `https://rss.marketingtools.apple.com/api/v2/${country}/music/most-played/${limit}/songs.json`
    );

    if (!response.ok) {
      throw new Error(`Apple chart lookup failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).send(data);
  } catch (error) {
    console.error("Failed to fetch Apple top songs:", error);
    res.status(502).json({ error: "Failed to fetch Apple top songs" });
  }
}