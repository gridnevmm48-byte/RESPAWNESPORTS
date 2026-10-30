// GET /api/rating -> {"rating":5,"count":84}
//
// The club's Google rating and review count, read from the Places API on the
// server so the key never reaches the browser. Vercel's edge keeps each answer
// for six hours, so the page triggers about four Places requests a day no
// matter how many people open it. Without a key, or when Google fails, the
// endpoint says so and the page keeps the figures printed in its HTML.

const PLACE_ID = process.env.GOOGLE_PLACE_ID || "ChIJhx1T8SMz5xQRBHA_77a-xBA";

function send(res, status, body, cache) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  const key = process.env.GOOGLE_PLACES_KEY;
  // not an error, just not set up yet: answer 200 so browsers do not log a failed request
  if (!key) return send(res, 200, { configured: false }, "public, s-maxage=300");
  try {
    const r = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(PLACE_ID), {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount" },
    });
    if (!r.ok) throw new Error("places " + r.status);
    const d = await r.json();
    if (typeof d.rating !== "number" || !Number.isInteger(d.userRatingCount)) throw new Error("unexpected shape");
    return send(res, 200, { rating: d.rating, count: d.userRatingCount },
      "public, max-age=600, s-maxage=21600, stale-while-revalidate=86400");
  } catch (e) {
    return send(res, 502, { error: "upstream" }, "public, s-maxage=300");
  }
};
