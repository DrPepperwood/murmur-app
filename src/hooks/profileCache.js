// hooks/profileCache.js
//
// The current frontend keys everything (profiles object, post.author,
// following/blocked/muted Sets, view.handle routing) by a short SLUG like
// "kestrel" or "you" — not a UUID. The real schema's primary key is a UUID
// (auth.users.id). Rather than rewire every component that does
// `profiles[handle]` or `onOpenProfile(handle)` throughout the whole app,
// this cache lets the slug-based frontend keep working unchanged: it's a
// two-way lookup between UUID and slug (slug = handle without the "@"),
// backed by Supabase, shared across all the hooks below.

import { supabase } from "../lib/supabaseClient";

const byId = new Map(); // uuid -> raw profile row
const byHandle = new Map(); // slug -> raw profile row
const listeners = new Set();
let currentUserId = null;

/**
 * The existing frontend uses the literal string "you" as the current
 * user's slug in dozens of places (post.author === "you", profiles.you,
 * handle === "you", onOpenProfile("you"), ...). Rather than thread a
 * dynamic "current user slug" through every one of those call sites, this
 * aliases whichever UUID is actually authenticated to the slug "you" —
 * every existing comparison in murmur.jsx keeps working unchanged, and
 * only the hook layer needs to know about real UUIDs at all.
 */
export function setCurrentUser(userId) {
  currentUserId = userId;
}

export function slugOf(handle) {
  return handle?.startsWith("@") ? handle.slice(1) : handle;
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function cacheProfile(row) {
  if (!row) return;
  byId.set(row.id, row);
  byHandle.set(slugOf(row.handle), row);
  notify();
}

export function idForSlug(slug) {
  if (slug === "you") return currentUserId;
  return byHandle.get(slug)?.id ?? null;
}

export function slugForId(id) {
  if (id === currentUserId) return "you";
  const row = byId.get(id);
  return row ? slugOf(row.handle) : null;
}

/** Resolve a profile by UUID or slug ("you" resolves to the signed-in user), fetching (and caching) if not already known. */
export async function resolveProfile(idOrSlug) {
  const targetId = idOrSlug === "you" ? currentUserId : idOrSlug;
  if (!targetId) return null;

  const cached = byId.get(targetId) ?? byHandle.get(targetId);
  if (cached) return cached;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(targetId);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq(isUuid ? "id" : "handle", isUuid ? targetId : `@${targetId}`)
    .single();
  if (error) return null;
  cacheProfile(data);
  return data;
}

export function subscribeToProfileCache(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Shape a raw profiles row into exactly what the existing UI expects. */
export function toAppShape(row) {
  return {
    name: row.name,
    handle: row.handle,
    initials: (row.name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?",
    bio: row.bio,
    joined: new Date(row.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    location: row.location,
    website: row.website,
    followers: row.follower_count ?? 0,
    following: row.following_count ?? 0,
    photo: row.avatar_url,
    coverPhoto: row.cover_url,
    verified: row.verified,
  };
}

/** Current cache contents shaped as { [slug]: appShapedProfile }, for building the `profiles` map hooks expose. Your own row is always keyed "you". */
export function allCachedProfiles() {
  return Object.fromEntries(
    [...byId.values()].map((row) => [row.id === currentUserId ? "you" : slugOf(row.handle), toAppShape(row)])
  );
}
