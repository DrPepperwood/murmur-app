// lib/api/social.js — follow/block/mute, and lists.

import { supabase } from "../supabaseClient";

// ---------------------------------------------------------------------------
// FOLLOWS
// ---------------------------------------------------------------------------
export async function follow(followerId, followeeId) {
  const { error } = await supabase.from("follows").insert({ follower_id: followerId, followee_id: followeeId });
  if (error) throw error;
  await supabase.from("notifications").insert({ recipient_id: followeeId, actor_id: followerId, type: "follow" });
}

export async function unfollow(followerId, followeeId) {
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("followee_id", followeeId);
  if (error) throw error;
}

export async function fetchFollowing(userId) {
  const { data, error } = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  if (error) throw error;
  return data.map((r) => r.followee_id);
}

export async function fetchFollowerCount(userId) {
  const { count, error } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("followee_id", userId);
  if (error) throw error;
  return count;
}

// ---------------------------------------------------------------------------
// BLOCK / MUTE
// ---------------------------------------------------------------------------
export async function block(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").insert({ blocker_id: blockerId, blocked_id: blockedId });
  if (error) throw error;
  // Blocking implies unfollowing both directions, same as the app does today.
  await supabase.from("follows").delete().eq("follower_id", blockerId).eq("followee_id", blockedId);
  await supabase.from("follows").delete().eq("follower_id", blockedId).eq("followee_id", blockerId);
}

export async function unblock(blockerId, blockedId) {
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", blockerId).eq("blocked_id", blockedId);
  if (error) throw error;
}

export async function fetchBlocked(userId) {
  const { data, error } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId);
  if (error) throw error;
  return data.map((r) => r.blocked_id);
}

export async function mute(muterId, mutedId) {
  const { error } = await supabase.from("mutes").insert({ muter_id: muterId, muted_id: mutedId });
  if (error) throw error;
}

export async function unmute(muterId, mutedId) {
  const { error } = await supabase.from("mutes").delete().eq("muter_id", muterId).eq("muted_id", mutedId);
  if (error) throw error;
}

export async function fetchMuted(userId) {
  const { data, error } = await supabase.from("mutes").select("muted_id").eq("muter_id", userId);
  if (error) throw error;
  return data.map((r) => r.muted_id);
}

// ---------------------------------------------------------------------------
// REPORTS
// ---------------------------------------------------------------------------
export async function reportPost(reporterId, postId, reason) {
  const { error } = await supabase.from("reports").insert({ reporter_id: reporterId, post_id: postId, reason });
  if (error) throw error;
}

export async function reportProfile(reporterId, reportedId, reason) {
  const { error } = await supabase.from("reports").insert({ reporter_id: reporterId, reported_id: reportedId, reason });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// LISTS
// ---------------------------------------------------------------------------
export async function fetchLists(ownerId) {
  const { data, error } = await supabase
    .from("lists")
    .select("*, list_members(member_id)")
    .eq("owner_id", ownerId)
    .order("created_at");
  if (error) throw error;
  return data.map((l) => ({ ...l, members: l.list_members.map((m) => m.member_id) }));
}

export async function createList(ownerId, name) {
  const { data, error } = await supabase.from("lists").insert({ owner_id: ownerId, name }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteList(listId) {
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) throw error;
}

export async function addListMember(listId, memberId) {
  const { error } = await supabase.from("list_members").insert({ list_id: listId, member_id: memberId });
  if (error) throw error;
}

export async function removeListMember(listId, memberId) {
  const { error } = await supabase.from("list_members").delete().eq("list_id", listId).eq("member_id", memberId);
  if (error) throw error;
}

/** Posts authored by anyone in a list — feeds the list's detail view. */
export async function fetchListFeed(listId) {
  const { data: members, error: memErr } = await supabase.from("list_members").select("member_id").eq("list_id", listId);
  if (memErr) throw memErr;
  if (members.length === 0) return [];

  const { data, error } = await supabase
    .from("posts_feed")
    .select("*")
    .in("author_id", members.map((m) => m.member_id))
    .is("reply_to_id", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
