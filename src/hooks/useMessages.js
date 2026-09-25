// hooks/useMessages.js

import { useCallback, useEffect, useRef, useState } from "react";
import * as messagesApi from "../lib/api/messages";
import { resolveProfile, slugForId, cacheProfile } from "./profileCache";

function toAppMessage(row) {
  return {
    id: row.id,
    sender: slugForId(row.sender_id) ?? row.sender_id,
    text: row.text ?? "",
    image: row.media_url ?? null,
    time: "now", // real timestamp is row.created_at if you want to format it
  };
}

export function useMessages(currentUserId) {
  const [conversations, setConversations] = useState({}); // slug -> { messages, unread }
  const [groupChats, setGroupChats] = useState({}); // id -> { name, members: [slug], messages, unread }
  const [typingIndicator, setTypingIndicator] = useState(null); // { key, name }
  const channelsRef = useRef({});

  const reload = useCallback(async () => {
    if (!currentUserId) return;
    const rows = await messagesApi.fetchConversations(currentUserId);
    rows.forEach((c) => c.members.forEach(cacheProfile));

    const dms = {};
    const groups = {};
    rows.forEach((c) => {
      if (c.isGroup) {
        groups[c.id] = {
          id: c.id,
          name: c.name,
          members: c.members.filter((m) => m.id !== currentUserId).map((m) => slugForId(m.id)).filter(Boolean),
          messages: c.messages.map((m) => toAppMessage(m)),
          unread: c.unread,
        };
      } else {
        const other = c.members.find((m) => m.id !== currentUserId);
        const slug = other ? slugForId(other.id) : null;
        if (slug) {
          dms[slug] = { conversationId: c.id, messages: c.messages.map((m) => toAppMessage(m)), unread: c.unread };
        }
      }
    });
    setConversations(dms);
    setGroupChats(groups);
  }, [currentUserId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const sendMessage = useCallback(
    async (slug, text, imageFile) => {
      const profile = await resolveProfile(slug);
      if (!profile) return;
      let mediaUrl = null;
      if (imageFile) mediaUrl = await (await import("../lib/api/storage")).uploadMessageMedia(currentUserId, imageFile);

      const conversationId =
        conversations[slug]?.conversationId ?? (await messagesApi.findOrCreateDirectConversation(currentUserId, profile.id));
      await messagesApi.sendMessage(conversationId, currentUserId, { text, mediaUrl });
      await reload();
    },
    [conversations, currentUserId, reload]
  );

  const sendGroupMessage = useCallback(
    async (groupId, text, imageFile) => {
      let mediaUrl = null;
      if (imageFile) mediaUrl = await (await import("../lib/api/storage")).uploadMessageMedia(currentUserId, imageFile);
      await messagesApi.sendMessage(groupId, currentUserId, { text, mediaUrl });
      await reload();
    },
    [currentUserId, reload]
  );

  const createGroup = useCallback(
    async (name, memberSlugs) => {
      const profiles = await Promise.all(memberSlugs.map(resolveProfile));
      const id = await messagesApi.createGroup(currentUserId, name, profiles.filter(Boolean).map((p) => p.id));
      await reload();
      return id;
    },
    [currentUserId, reload]
  );

  const markRead = useCallback(
    async (conversationId) => {
      await messagesApi.markConversationRead(conversationId, currentUserId);
    },
    [currentUserId]
  );

  // Realtime: subscribe to every open conversation for live message delivery.
  useEffect(() => {
    if (!currentUserId) return;
    const allIds = [
      ...Object.values(conversations).map((c) => c.conversationId),
      ...Object.keys(groupChats).map(Number),
    ];
    allIds.forEach((id) => {
      if (channelsRef.current[id]) return;
      channelsRef.current[id] = messagesApi.subscribeToMessages(id, () => reload());
    });
    return () => {
      Object.values(channelsRef.current).forEach((unsub) => unsub());
      channelsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, Object.keys(conversations).length, Object.keys(groupChats).length]);

  const typingTimeoutRef = useRef(null);

  /**
   * Call from the conversation view: joins the typing broadcast channel for
   * that thread and returns a `sendTyping()` function — call it on each
   * keystroke in the composer (debounce on the caller's side if you want to
   * limit broadcast frequency; a plain per-keystroke call is fine at this scale).
   */
  const useTypingChannel = (conversationId) => {
    const sendTypingRef = useRef(() => {});
    useEffect(() => {
      if (!conversationId || !currentUserId) return undefined;
      const { sendTyping, stop } = messagesApi.joinTypingChannel(conversationId, currentUserId, (typingUserId) => {
        setTypingIndicator({ key: conversationId, name: slugForId(typingUserId) ?? "Someone" });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingIndicator(null), 3000);
      });
      sendTypingRef.current = sendTyping;
      return () => {
        sendTypingRef.current = () => {};
        stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);
    return () => sendTypingRef.current();
  };

  return {
    conversations, groupChats, typingIndicator,
    sendMessage, sendGroupMessage, createGroup, markRead, useTypingChannel,
  };
}
