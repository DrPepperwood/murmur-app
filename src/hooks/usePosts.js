// hooks/usePosts.js
//
// Adapts the real backend (UUID author_id, ISO timestamps, denormalized
// counters) into EXACTLY the shape the existing components already render
// — post.author as a slug, post.time as a short relative string,
// post.likes/reposts/views as plain numbers, post.liked/reposted/bookmarked
// as booleans, post.replies as a nested tree. That means Post, ReplyThread,
// ProfilePage, etc. in murmur.jsx do not need to change — only the state
// declarations and handler functions at the top of the Murmur component do.

import { useCallback, useEffect, useState } from "react";
import * as postsApi from "../lib/api/posts";
import { supabase } from "../lib/supabaseClient";
import { cacheProfile, slugForId, getCurrentUser } from "./profileCache";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

/** Turn one posts_feed row into the shape murmur.jsx already expects. */
export function toAppPost(row) {
  cacheProfile({
    id: row.author_id,
    handle: row.author_handle,
    name: row.author_name,
    avatar_url: row.author_avatar_url,
    verified: row.author_verified,
    // other profile fields aren't in this view; resolveProfile() will
    // backfill them the first time the profile itself is opened.
    bio: "", location: "", website: "", created_at: row.created_at, follower_count: 0, following_count: 0,
  });

  return {
    id: row.id,
    author: slugForId(row.author_id) ?? row.author_handle?.slice(1),
    time: timeAgo(row.created_at),
    text: row.text,
    image: row.video_url ?? row.image_url ?? null, // MediaContent in the app already detects video vs image by URL/prefix
    likes: row.like_count,
    reposts: row.repost_count,
    views: row.view_count,
    liked: row.liked_by_me,
    reposted: row.reposted_by_me,
    bookmarked: row.bookmarked_by_me,
    edited: !!row.edited_at,
    isPinned: !!row.is_pinned,
    replies: [], // filled in by fetchReplyTree() for detail views; feed rows don't need the tree
    poll: buildPoll(row.pollOptions), // only present on fetchPost()'s result; feed/reply rows don't include it
    quoted: row.quoted_post_id ? { id: row.quoted_post_id } : null, // resolved lazily; see note in README
  };
}

/** poll_options (+ their poll_votes) -> the { options, votedOption } shape the app renders. */
function buildPoll(pollOptions) {
  if (!pollOptions || pollOptions.length === 0) return null;
  const me = getCurrentUser();
  let votedOption = null;
  const options = pollOptions.map((o) => {
    const votes = o.poll_votes ?? [];
    if (me && votes.some((v) => v.user_id === me)) votedOption = o.id;
    return { id: o.id, text: o.text, votes: votes.length };
  });
  return { options, duration: null, votedOption };
}

/** Flat reply rows -> the nested { id, author, text, replies: [...] } tree the app renders. */
function buildReplyTree(flatRows, rootId) {
  const byParent = new Map();
  flatRows.forEach((row) => {
    const list = byParent.get(row.reply_to_id) ?? [];
    list.push(toAppPost(row));
    byParent.set(row.reply_to_id, list);
  });
  const attach = (nodeId) => {
    const children = byParent.get(nodeId) ?? [];
    children.forEach((child) => {
      child.replies = attach(child.id);
    });
    return children;
  };
  return attach(rootId);
}

// `media` is either a raw File (needs uploading to Storage) or a plain
// string URL (a GIF picked from Giphy is already hosted — no upload needed).
async function resolvePostMediaUrl(userId, media) {
  if (!media) return null;
  if (typeof media === "string") return media;
  return (await import("../lib/api/storage")).uploadPostMedia(userId, media);
}

export function usePosts(currentUserId) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [reachedEnd, setReachedEnd] = useState(false);

  const loadFeed = useCallback(async ({ following = false } = {}) => {
    setLoading(true);
    const rows = following
      ? await postsApi.fetchFollowingFeed(currentUserId)
      : await postsApi.fetchFeed();
    setPosts(rows.map(toAppPost));
    setCursor(rows.length ? rows[rows.length - 1].created_at : null);
    setReachedEnd(rows.length === 0);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) loadFeed();
  }, [currentUserId, loadFeed]);

  const loadMore = useCallback(async () => {
    if (reachedEnd || !cursor) return;
    const rows = await postsApi.fetchFeed({ cursor });
    if (rows.length === 0) {
      setReachedEnd(true);
      return;
    }
    setPosts((prev) => [...prev, ...rows.map(toAppPost)]);
    setCursor(rows[rows.length - 1].created_at);
  }, [cursor, reachedEnd]);

  const createPost = useCallback(
    async ({ text, imageFile, videoFile, pollOptions, quotedPostId }) => {
      const [imageUrl, videoUrl] = await Promise.all([resolvePostMediaUrl(currentUserId, imageFile), resolvePostMediaUrl(currentUserId, videoFile)]);

      const post = await postsApi.createPost({ authorId: currentUserId, text, imageUrl, videoUrl, quotedPostId, pollOptions });
      await loadFeed(); // simplest correct approach; swap for a local prepend once you're comfortable with the shape
      return post;
    },
    [currentUserId, loadFeed]
  );

  const editPost = useCallback(async (postId, text) => {
    await postsApi.editPost(postId, text);
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, text, edited: true } : p)));
  }, []);

  const deletePost = useCallback(async (postId) => {
    await postsApi.deletePost(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  const togglePin = useCallback(
    async (postId) => {
      const target = posts.find((p) => p.id === postId);
      const nowPinned = !target?.isPinned;
      await postsApi.togglePin(postId, currentUserId, nowPinned);
      setPosts((prev) => prev.map((p) => ({ ...p, isPinned: p.id === postId ? nowPinned : false })));
    },
    [posts, currentUserId]
  );

  // Optimistic like/repost/bookmark: flip the UI instantly, roll back on error.
  const toggleLike = useCallback(
    async (postId) => {
      const target = posts.find((p) => p.id === postId);
      if (!target) return;
      const wasLiked = target.liked;
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, liked: !wasLiked, likes: p.likes + (wasLiked ? -1 : 1) } : p)));
      try {
        await postsApi.toggleLike(postId, currentUserId, wasLiked);
      } catch (err) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, liked: wasLiked, likes: p.likes + (wasLiked ? 1 : -1) } : p)));
        throw err;
      }
    },
    [posts, currentUserId]
  );

  const toggleRepost = useCallback(
    async (postId) => {
      const target = posts.find((p) => p.id === postId);
      if (!target) return;
      const wasReposted = target.reposted;
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reposted: !wasReposted, reposts: p.reposts + (wasReposted ? -1 : 1) } : p)));
      try {
        await postsApi.toggleRepost(postId, currentUserId, wasReposted);
      } catch (err) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reposted: wasReposted, reposts: p.reposts + (wasReposted ? 1 : -1) } : p)));
        throw err;
      }
    },
    [posts, currentUserId]
  );

  const toggleBookmark = useCallback(
    async (postId) => {
      const target = posts.find((p) => p.id === postId);
      if (!target) return;
      const was = target.bookmarked;
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, bookmarked: !was } : p)));
      await postsApi.toggleBookmark(postId, currentUserId, was);
    },
    [posts, currentUserId]
  );

  const votePoll = useCallback(
    async (postId, optionId) => {
      await postsApi.votePoll(postId, optionId, currentUserId);
    },
    [currentUserId]
  );

  return {
    posts, loading, reachedEnd,
    loadFeed, loadMore, createPost, editPost, deletePost, togglePin,
    toggleLike, toggleRepost, toggleBookmark, votePoll,
  };
}

/**
 * Single post + its full reply tree, for the post-detail view. Not part of
 * usePosts' feed list — call this when navigating into a specific post.
 */
export function usePostDetail(postId) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const [detail, replyRows] = await Promise.all([
      postsApi.fetchPost(postId),
      postsApi.fetchReplies(postId),
    ]);
    postsApi.recordView(postId);
    setPost({ ...toAppPost(detail), replies: buildReplyTree(replyRows, Number(postId)) });
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const addReply = useCallback(
    async (authorId, parentId, text, imageFile) => {
      const imageUrl = await resolvePostMediaUrl(authorId, imageFile);
      await postsApi.createReply({ authorId, parentId, text, imageUrl });
      await reload();
    },
    [reload]
  );

  return { post, loading, reload, addReply };
}

/**
 * Optimistic like/repost/bookmark/pin/edit/delete actions bound to an
 * arbitrary, caller-managed list of posts — the same logic as usePosts()'s
 * handlers above, but usable on ANY post list, not just the main feed's.
 * usePosts()'s own toggleLike/toggleRepost/etc. look the target post up in
 * its own `posts` state, so calling them on a post that isn't currently
 * loaded into the main feed (e.g. an older post on someone's profile that
 * scrolled out of the feed's loaded page) silently does nothing. Pages that
 * load their own slice of posts directly from the backend (profile,
 * bookmarks, search, lists — see usePostList below) use this instead.
 */
export function usePostActions(posts, setPosts, currentUserId, { removeOnUnbookmark = false } = {}) {
  const toggleLike = useCallback(
    async (postId) => {
      const target = posts.find((p) => p.id === postId);
      if (!target) return;
      const wasLiked = target.liked;
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, liked: !wasLiked, likes: p.likes + (wasLiked ? -1 : 1) } : p)));
      try {
        await postsApi.toggleLike(postId, currentUserId, wasLiked);
      } catch (err) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, liked: wasLiked, likes: p.likes + (wasLiked ? 1 : -1) } : p)));
        throw err;
      }
    },
    [posts, setPosts, currentUserId]
  );

  const toggleRepost = useCallback(
    async (postId) => {
      const target = posts.find((p) => p.id === postId);
      if (!target) return;
      const wasReposted = target.reposted;
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reposted: !wasReposted, reposts: p.reposts + (wasReposted ? -1 : 1) } : p)));
      try {
        await postsApi.toggleRepost(postId, currentUserId, wasReposted);
      } catch (err) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, reposted: wasReposted, reposts: p.reposts + (wasReposted ? 1 : -1) } : p)));
        throw err;
      }
    },
    [posts, setPosts, currentUserId]
  );

  // `removeOnUnbookmark` drops the post from the local list the moment it's
  // un-bookmarked, instead of leaving it in place with the icon toggled off
  // — what you want for an actual "Bookmarks" page (Twitter does the same),
  // but not for e.g. a profile page, which should keep showing the post.
  const toggleBookmark = useCallback(
    async (postId) => {
      const target = posts.find((p) => p.id === postId);
      if (!target) return;
      const was = target.bookmarked;
      if (removeOnUnbookmark && was) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        try {
          await postsApi.toggleBookmark(postId, currentUserId, was);
        } catch (err) {
          setPosts((prev) => (prev.some((p) => p.id === postId) ? prev : [...prev, target]));
          throw err;
        }
        return;
      }
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, bookmarked: !was } : p)));
      try {
        await postsApi.toggleBookmark(postId, currentUserId, was);
      } catch (err) {
        setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, bookmarked: was } : p)));
        throw err;
      }
    },
    [posts, setPosts, currentUserId, removeOnUnbookmark]
  );

  const togglePin = useCallback(
    async (postId) => {
      const target = posts.find((p) => p.id === postId);
      const nowPinned = !target?.isPinned;
      await postsApi.togglePin(postId, currentUserId, nowPinned);
      setPosts((prev) => prev.map((p) => ({ ...p, isPinned: p.id === postId ? nowPinned : false })));
    },
    [posts, setPosts, currentUserId]
  );

  const editPost = useCallback(
    async (postId, text) => {
      await postsApi.editPost(postId, text);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, text, edited: true } : p)));
    },
    [setPosts]
  );

  const deletePost = useCallback(
    async (postId) => {
      await postsApi.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    },
    [setPosts]
  );

  const votePoll = useCallback(async (postId, optionId) => postsApi.votePoll(postId, optionId, currentUserId), [currentUserId]);

  return { toggleLike, toggleRepost, toggleBookmark, togglePin, editPost, deletePost, votePoll };
}

/**
 * Fetches a page's own slice of posts straight from the backend — a
 * person's own posts, your bookmarks, a list's members' posts — instead of
 * filtering whatever happens to already be loaded into the main feed's
 * `posts` array, which only has whatever page of the feed you've scrolled
 * through. `loadFn` should be a memoized (useCallback'd) function so this
 * doesn't refetch on every render; it reloads whenever `loadFn`'s identity
 * changes (e.g. the profile handle you're viewing changes).
 */
export function usePostList(loadFn, currentUserId, options) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const rows = await loadFn();
    setPosts(rows.map(toAppPost));
    setLoading(false);
  }, [loadFn]);

  useEffect(() => {
    reload();
  }, [reload]);

  const actions = usePostActions(posts, setPosts, currentUserId, options);
  return { posts, loading, reload, ...actions };
}
