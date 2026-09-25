// lib/api/posts.js
//
// Reads go through the `posts_feed` view (schema.sql) so every row already
// carries the author's public profile fields plus liked_by_me /
// reposted_by_me / bookmarked_by_me for the current user — no N+1 queries.

import { supabase } from "../supabaseClient";

const PAGE_SIZE = 20;

/** Top-level posts (not replies), newest first, cursor-paginated. */
export async function fetchFeed({ cursor = null } = {}) {
  let query = supabase
    .from("posts_feed")
    .select("*")
    .is("reply_to_id", null)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/** Feed filtered to people you follow (plus your own posts). */
export async function fetchFollowingFeed(userId, { cursor = null } = {}) {
  const { data: following, error: followErr } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", userId);
  if (followErr) throw followErr;

  const authorIds = [...following.map((f) => f.followee_id), userId];

  let query = supabase
    .from("posts_feed")
    .select("*")
    .is("reply_to_id", null)
    .in("author_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchProfilePosts(authorId) {
  const { data, error } = await supabase
    .from("posts_feed")
    .select("*")
    .eq("author_id", authorId)
    .is("reply_to_id", null)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** A single post plus its poll (if any). Replies are fetched separately below. */
export async function fetchPost(postId) {
  const { data: post, error } = await supabase
    .from("posts_feed")
    .select("*")
    .eq("id", postId)
    .single();
  if (error) throw error;

  const { data: options } = await supabase
    .from("poll_options")
    .select("*, poll_votes(user_id)")
    .eq("post_id", postId)
    .order("position");

  return { ...post, pollOptions: options ?? [] };
}

/**
 * All replies under a post, flat (each row knows its reply_to_id). The
 * client reconstructs the nested tree the same way it already does today —
 * group by reply_to_id, recurse from the root outward.
 */
export async function fetchReplies(postId) {
  // Backed by the fetch_reply_tree() recursive CTE in schema.sql.
  const { data, error } = await supabase.rpc("fetch_reply_tree", { root_id: postId });
  if (error) throw error;
  return data;
}

export async function createPost({ authorId, text, imageUrl, videoUrl, quotedPostId, pollOptions }) {
  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: authorId,
      text: text ?? "",
      image_url: imageUrl ?? null,
      video_url: videoUrl ?? null,
      quoted_post_id: quotedPostId ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  if (pollOptions?.length >= 2) {
    const rows = pollOptions.map((text, i) => ({ post_id: post.id, text, position: i }));
    const { error: pollErr } = await supabase.from("poll_options").insert(rows);
    if (pollErr) throw pollErr;
  }

  return post;
}

export async function createReply({ authorId, parentId, text, imageUrl }) {
  const { data, error } = await supabase
    .from("posts")
    .insert({ author_id: authorId, reply_to_id: parentId, text: text ?? "", image_url: imageUrl ?? null })
    .select()
    .single();
  if (error) throw error;

  // Notify the parent post's author (skip if replying to yourself).
  const { data: parent } = await supabase.from("posts").select("author_id").eq("id", parentId).single();
  if (parent && parent.author_id !== authorId) {
    await supabase.from("notifications").insert({
      recipient_id: parent.author_id,
      actor_id: authorId,
      type: "reply",
      post_id: data.id,
    });
  }

  return data;
}

export async function editPost(postId, text) {
  const { data, error } = await supabase
    .from("posts")
    .update({ text, edited_at: new Date().toISOString() })
    .eq("id", postId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(postId) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export async function togglePin(postId, authorId, shouldPin) {
  // Unpin whatever was pinned before (the unique partial index only allows
  // one is_pinned=true row per author, so clear it first).
  if (shouldPin) {
    await supabase.from("posts").update({ is_pinned: false }).eq("author_id", authorId).eq("is_pinned", true);
  }
  const { error } = await supabase.from("posts").update({ is_pinned: shouldPin }).eq("id", postId);
  if (error) throw error;
}

export async function toggleLike(postId, userId, isLiked) {
  if (isLiked) {
    await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", userId);
    return;
  }
  const { error } = await supabase.from("likes").insert({ post_id: postId, user_id: userId });
  if (error) throw error;

  const { data: post } = await supabase.from("posts").select("author_id").eq("id", postId).single();
  if (post && post.author_id !== userId) {
    await supabase.from("notifications").insert({ recipient_id: post.author_id, actor_id: userId, type: "like", post_id: postId });
  }
}

export async function toggleRepost(postId, userId, isReposted) {
  if (isReposted) {
    await supabase.from("reposts").delete().eq("post_id", postId).eq("user_id", userId);
    return;
  }
  const { error } = await supabase.from("reposts").insert({ post_id: postId, user_id: userId });
  if (error) throw error;

  const { data: post } = await supabase.from("posts").select("author_id").eq("id", postId).single();
  if (post && post.author_id !== userId) {
    await supabase.from("notifications").insert({ recipient_id: post.author_id, actor_id: userId, type: "repost", post_id: postId });
  }
}

export async function toggleBookmark(postId, userId, isBookmarked) {
  if (isBookmarked) {
    await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", userId);
    return;
  }
  const { error } = await supabase.from("bookmarks").insert({ post_id: postId, user_id: userId });
  if (error) throw error;
}

export async function fetchBookmarks(userId) {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("post_id, posts_feed(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((row) => row.posts_feed);
}

export async function votePoll(postId, optionId, userId) {
  const { error } = await supabase.from("poll_votes").insert({ post_id: postId, option_id: optionId, user_id: userId });
  if (error) throw error; // unique (post_id, user_id) means a second vote fails loudly — surface that in the UI
}

/** Call once when a post's detail view is opened. Fire-and-forget is fine. */
export function recordView(postId) {
  supabase.rpc("increment_view_count", { post_id_in: postId }).then(() => {}, () => {});
}

/** Simple substring search across post text (see README for scaling notes). */
export async function searchPosts(query) {
  const { data, error } = await supabase
    .from("posts_feed")
    .select("*")
    .ilike("text", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}
