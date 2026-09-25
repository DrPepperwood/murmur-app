// lib/api/auth.js
// Replaces the fake AuthPage submit in the current app with real accounts.

import { supabase } from "../supabaseClient";

/**
 * Sign up a new user. Supabase Auth creates the auth.users row; our
 * `handle_new_user` trigger (see schema.sql) auto-creates the matching
 * profiles row from the name passed in metadata.
 */
export async function signUp({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;
  return data.user;
}

export async function logIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function logOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Current session's user, or null if signed out. */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

/**
 * Fires `callback(user | null)` immediately with the current auth state,
 * and again on every future sign-in/sign-out. Use this to drive the
 * `authed` gate instead of a boolean in local state.
 *
 * Returns an unsubscribe function — call it in a useEffect cleanup.
 */
export function onAuthChange(callback) {
  supabase.auth.getUser().then(({ data }) => callback(data.user ?? null));
  const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => sub.subscription.unsubscribe();
}

/** Fetch the profiles row for the given user id (or the current user). */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId, updates) {
  // updates: { name, bio, avatar_url, cover_url, location, website, handle }
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
