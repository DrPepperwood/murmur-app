// lib/api/storage.js
//
// Replaces the current base64-data-URL approach (images/videos held as
// giant strings in memory and in every storage write) with real uploads to
// Supabase Storage. This is the fix for the size-limit risk called out
// earlier — files live in object storage, not inside your JSON payloads.
//
// Buckets to create in the Supabase dashboard (Storage > New bucket),
// all public read (since post media is public in this app):
//   post-media    — post/reply images & videos
//   avatars       — profile photos
//   covers        — profile header photos
//   message-media — DM/group chat attachments

import { supabase } from "../supabaseClient";

async function uploadFile(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function extOf(file) {
  const fromName = file.name?.split(".").pop();
  if (fromName) return fromName;
  return file.type?.split("/")[1] ?? "bin";
}

export async function uploadPostMedia(userId, file) {
  const path = `${userId}/${crypto.randomUUID()}.${extOf(file)}`;
  return uploadFile("post-media", path, file);
}

export async function uploadAvatar(userId, file) {
  // Fixed filename per user so re-uploading overwrites the old one.
  const path = `${userId}/avatar.${extOf(file)}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`; // cache-bust so the new photo shows immediately
}

export async function uploadCoverPhoto(userId, file) {
  const path = `${userId}/cover.${extOf(file)}`;
  const { error } = await supabase.storage.from("covers").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("covers").getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function uploadMessageMedia(userId, file) {
  const path = `${userId}/${crypto.randomUUID()}.${extOf(file)}`;
  return uploadFile("message-media", path, file);
}

/** True if the given URL points at a video (by extension), for choosing <img> vs <video>. */
export function isVideoUrl(url) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url ?? "");
}
