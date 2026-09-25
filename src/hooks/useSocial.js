// hooks/useSocial.js
//
// following/blocked/muted are exposed as Sets of SLUGS (not UUIDs), same
// shape the app already uses everywhere (following.has(handle), etc.).
// Internally this resolves slug -> UUID via profileCache before calling
// the UUID-keyed API functions.

import { useCallback, useEffect, useState } from "react";
import * as socialApi from "../lib/api/social";
import { resolveProfile, slugForId } from "./profileCache";

export function useSocial(currentUserId) {
  const [following, setFollowing] = useState(new Set());
  const [blocked, setBlocked] = useState(new Set());
  const [muted, setMuted] = useState(new Set());
  const [lists, setLists] = useState({});

  const reloadGraph = useCallback(async () => {
    if (!currentUserId) return;
    const [followingIds, blockedIds] = await Promise.all([
      socialApi.fetchFollowing(currentUserId),
      socialApi.fetchBlocked(currentUserId),
    ]);
    const mutedIds = await socialApi.fetchMuted(currentUserId);

    // Resolve every id we don't already have cached, then map to slugs.
    await Promise.all([...followingIds, ...blockedIds, ...mutedIds].map((id) => resolveProfile(id)));
    setFollowing(new Set(followingIds.map((id) => slugForId(id)).filter(Boolean)));
    setBlocked(new Set(blockedIds.map((id) => slugForId(id)).filter(Boolean)));
    setMuted(new Set(mutedIds.map((id) => slugForId(id)).filter(Boolean)));
  }, [currentUserId]);

  const reloadLists = useCallback(async () => {
    if (!currentUserId) return;
    const rows = await socialApi.fetchLists(currentUserId);
    await Promise.all(rows.flatMap((l) => l.members).map((id) => resolveProfile(id)));
    const map = {};
    rows.forEach((l) => {
      map[l.id] = { id: l.id, name: l.name, members: l.members.map((id) => slugForId(id)).filter(Boolean) };
    });
    setLists(map);
  }, [currentUserId]);

  useEffect(() => {
    reloadGraph();
    reloadLists();
  }, [reloadGraph, reloadLists]);

  const toggleFollow = useCallback(
    async (slug) => {
      const profile = await resolveProfile(slug);
      if (!profile) return;
      const isFollowing = following.has(slug);
      setFollowing((prev) => {
        const next = new Set(prev);
        isFollowing ? next.delete(slug) : next.add(slug);
        return next;
      });
      if (isFollowing) await socialApi.unfollow(currentUserId, profile.id);
      else await socialApi.follow(currentUserId, profile.id);
    },
    [following, currentUserId]
  );

  const toggleBlock = useCallback(
    async (slug) => {
      const profile = await resolveProfile(slug);
      if (!profile) return;
      const isBlocked = blocked.has(slug);
      if (isBlocked) {
        await socialApi.unblock(currentUserId, profile.id);
        setBlocked((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        });
      } else {
        await socialApi.block(currentUserId, profile.id);
        setBlocked((prev) => new Set(prev).add(slug));
        setFollowing((prev) => {
          const next = new Set(prev);
          next.delete(slug);
          return next;
        }); // blocking implies unfollow, mirrored client-side too
      }
    },
    [blocked, currentUserId]
  );

  const toggleMute = useCallback(
    async (slug) => {
      const profile = await resolveProfile(slug);
      if (!profile) return;
      const isMuted = muted.has(slug);
      setMuted((prev) => {
        const next = new Set(prev);
        isMuted ? next.delete(slug) : next.add(slug);
        return next;
      });
      if (isMuted) await socialApi.unmute(currentUserId, profile.id);
      else await socialApi.mute(currentUserId, profile.id);
    },
    [muted, currentUserId]
  );

  const reportPost = useCallback((postId, reason) => socialApi.reportPost(currentUserId, postId, reason), [currentUserId]);
  const reportProfile = useCallback(
    async (slug, reason) => {
      const profile = await resolveProfile(slug);
      if (profile) await socialApi.reportProfile(currentUserId, profile.id, reason);
    },
    [currentUserId]
  );

  const createList = useCallback(
    async (name) => {
      await socialApi.createList(currentUserId, name);
      await reloadLists();
    },
    [currentUserId, reloadLists]
  );

  const deleteList = useCallback(
    async (listId) => {
      await socialApi.deleteList(listId);
      await reloadLists();
    },
    [reloadLists]
  );

  const addListMember = useCallback(
    async (listId, slug) => {
      const profile = await resolveProfile(slug);
      if (!profile) return;
      await socialApi.addListMember(listId, profile.id);
      await reloadLists();
    },
    [reloadLists]
  );

  const removeListMember = useCallback(
    async (listId, slug) => {
      const profile = await resolveProfile(slug);
      if (!profile) return;
      await socialApi.removeListMember(listId, profile.id);
      await reloadLists();
    },
    [reloadLists]
  );

  return {
    following, blocked, muted, lists,
    toggleFollow, toggleBlock, toggleMute,
    reportPost, reportProfile,
    createList, deleteList, addListMember, removeListMember,
  };
}
