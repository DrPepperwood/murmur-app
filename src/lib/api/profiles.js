// lib/api/profiles.js — profile search and self-edits.
//
// Separate from social.js (follow/block/mute/lists graph) and
// profileCache.js (client-side cache/slug-aliasing) — this file is just the
// two things neither of those cover: finding people who haven't shown up
// in your feed yet, and saving changes to your own profile row.

import { supabase } from "../supabaseClient";

/** Search profiles by name or handle (case-insensitive substring match). */
export async function searchProfiles(query, { limit = 10 } = {}) {
  const q = query.trim();
  if (!q) return [];
  // Escape characters that are special inside a PostgREST .or() filter string.
  const safe = q.replace(/[%,()]/g, "");
  if (!safe) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`name.ilike.%${safe}%,handle.ilike.%${safe}%`)
    .limit(limit);
  if (error) throw error;
  return data;
}

/** Persist an edit to the signed-in user's own profile row; returns the updated row. */
export async function updateProfile(userId, updates) {
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", userId).select().single();
  if (error) throw error;
  return data;
}
