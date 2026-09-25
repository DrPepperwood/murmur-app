// lib/api/messages.js
//
// Conversations table covers both 1:1 DMs and groups (is_group flag).
// Realtime: messages use Postgres Changes (durable, in the DB already).
// Typing indicators use Broadcast instead — they're intentionally NOT
// written to the database; they're just an ephemeral signal between
// connected clients, which is exactly what Supabase's broadcast channels
// are for (no table, no row, nothing to clean up).

import { supabase } from "../supabaseClient";

// ---------------------------------------------------------------------------
// CONVERSATIONS
// ---------------------------------------------------------------------------

/** All conversations (DMs + groups) the user is a member of, most recent first. */
export async function fetchConversations(userId) {
  const { data, error } = await supabase
    .from("conversation_members")
    .select(`
      last_read_at,
      conversations (
        id, is_group, name, created_at,
        conversation_members ( user_id, profiles ( id, name, handle, avatar_url ) ),
        messages ( id, sender_id, text, media_url, created_at )
      )
    `)
    .eq("user_id", userId);
  if (error) throw error;

  return data.map((row) => {
    const convo = row.conversations;
    const messages = [...convo.messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const unread = messages.filter((m) => new Date(m.created_at) > new Date(row.last_read_at) && m.sender_id !== userId).length;
    return {
      id: convo.id,
      isGroup: convo.is_group,
      name: convo.name,
      members: convo.conversation_members.map((m) => m.profiles),
      messages,
      unread,
    };
  });
}

/** Find (or implicitly need to create) the 1:1 conversation with another user. */
export async function findOrCreateDirectConversation(userId, otherUserId) {
  // Look for an existing non-group conversation containing exactly these two members.
  const { data: existing, error: findErr } = await supabase.rpc("find_direct_conversation", {
    user_a: userId,
    user_b: otherUserId,
  });
  if (findErr) throw findErr;
  if (existing) return existing;

  const { data: convo, error } = await supabase
    .from("conversations")
    .insert({ is_group: false, created_by: userId })
    .select()
    .single();
  if (error) throw error;

  const { error: memErr } = await supabase
    .from("conversation_members")
    .insert([{ conversation_id: convo.id, user_id: userId }, { conversation_id: convo.id, user_id: otherUserId }]);
  if (memErr) throw memErr;

  return convo.id;
}

export async function createGroup(creatorId, name, memberIds) {
  const { data: convo, error } = await supabase
    .from("conversations")
    .insert({ is_group: true, name, created_by: creatorId })
    .select()
    .single();
  if (error) throw error;

  const rows = [creatorId, ...memberIds].map((user_id) => ({ conversation_id: convo.id, user_id }));
  const { error: memErr } = await supabase.from("conversation_members").insert(rows);
  if (memErr) throw memErr;

  return convo.id;
}

export async function sendMessage(conversationId, senderId, { text, mediaUrl }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, text: text ?? null, media_url: mediaUrl ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markConversationRead(conversationId, userId) {
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// REALTIME: new messages
// ---------------------------------------------------------------------------
/**
 * Subscribe to new messages in a conversation. Call the returned function
 * to unsubscribe (e.g. in a useEffect cleanup).
 */
export function subscribeToMessages(conversationId, onMessage) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ---------------------------------------------------------------------------
// REALTIME: typing indicator (broadcast — never touches the database)
// ---------------------------------------------------------------------------
/**
 * Join the typing-indicator channel for a conversation. Returns
 * { sendTyping, stop } — call sendTyping() while the user has text in the
 * composer (debounce this on the caller's side, e.g. on each keystroke),
 * and call stop() when you unmount / leave the conversation.
 *
 * onTyping(userId) fires when someone else in the conversation is typing;
 * the caller is responsible for clearing that state after a couple of
 * seconds of silence (no explicit "stopped typing" event is sent — that's
 * the standard, simpler pattern for this kind of ephemeral signal).
 */
export function joinTypingChannel(conversationId, currentUserId, onTyping) {
  const channel = supabase
    .channel(`typing:${conversationId}`)
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.userId !== currentUserId) onTyping(payload.userId);
    })
    .subscribe();

  const sendTyping = () => channel.send({ type: "broadcast", event: "typing", payload: { userId: currentUserId } });
  const stop = () => supabase.removeChannel(channel);

  return { sendTyping, stop };
}
