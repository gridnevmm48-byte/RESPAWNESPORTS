// GET /api/rating -> {"rating":5,"count":84}
//
// The club's Google rating and review count. This portfolio copy holds no
// Google key of its own: it reads the figures the club's site already serves
// (respawn.cy/api/rating, which asks the Places API with the club's key), and
// Vercel's edge keeps each answer for six hours. If a GOOGLE_PLACES_KEY is ever
// set here, it asks Google directly instead. When neither answers, the page
// keeps the figures printed in its HTML.

const PLACE_ID = process.env.GOOGLE_PLACE_ID || "ChIJhx1T8SMz5xQRBHA_77a-xBA";
const SOURCE = process.env.RATING_SOURCE || "https://respawn.cy/api/rating";

function send(res, status, body, cache) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cache);
  res.end(JSON.stringify(body));
}

const valid = (rating, count) =>
  typeof rating === "number" && rating >= 1 && rating <= 5 && Number.isInteger(count) && count > 0;

async function fromGoogle(key) {
  const r = await fetch("https://places.googleapis.com/v1/places/" + encodeURIComponent(PLACE_ID), {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount" },
  });
  if (!r.ok) throw new Error("places " + r.status);
  const d = await r.json();
  return { rating: d.rating, count: d.userRatingCount };
}

async function fromClubSite() {
  const r = await fetch(SOURCE, { headers: { "User-Agent": "respawnesports.xyz rating relay" } });
  if (!r.ok) throw new Error("source " + r.status);
  const d = await r.json();
  return { rating: d.rating, count: d.count };
}

module.exports = async function handler(req, res) {
  try {
    const key = process.env.GOOGLE_PLACES_KEY;
    const d = key ? await fromGoogle(key) : await fromClubSite();
    // the club site answers {"configured":false} until its key is set: not an error
    if (!valid(d.rating, d.count)) return send(res, 200, { configured: false }, "public, s-maxage=300");
    return send(res, 200, { rating: d.rating, count: d.count },
      "public, max-age=600, s-maxage=21600, stale-while-revalidate=86400");
  } catch (e) {
    return send(res, 502, { error: "upstream" }, "public, s-maxage=300");
  }
};
