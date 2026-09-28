// lib/api/giphy.js — GIF search for the message composer.
//
// Uses Giphy's public "beta" API key by default, which works out of the
// box with no signup, but is rate-limited and meant for testing only — get
// your own free key at https://developers.giphy.com and set
// VITE_GIPHY_API_KEY in .env.local before shipping this for real use.

const API_KEY = import.meta.env.VITE_GIPHY_API_KEY || "dc6zaTOxFJmzC";
const BASE = "https://api.giphy.com/v1/gifs";

function toResult(g) {
  return {
    id: g.id,
    title: g.title || "GIF",
    // Small preview for the picker grid; the larger fixed-width version is
    // what actually gets sent/rendered in the conversation.
    preview: g.images?.fixed_width_small?.url ?? g.images?.fixed_width?.url ?? g.images?.original?.url,
    url: g.images?.fixed_width?.url ?? g.images?.original?.url,
  };
}

/** Search GIFs by keyword, or trending GIFs if the query is empty. */
export async function searchGifs(query, { limit = 15 } = {}) {
  const q = query.trim();
  const endpoint = q
    ? `${BASE}/search?api_key=${API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13`
    : `${BASE}/trending?api_key=${API_KEY}&limit=${limit}&rating=pg-13`;
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error("GIF search failed");
  const { data } = await res.json();
  return data.map(toResult).filter((g) => g.url);
}
