// lib/api/notifications.js

import { supabase } from "../supabaseClient";

export async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(id, name, handle, avatar_url)")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function markAllRead(userId) {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("recipient_id", userId).eq("read", false);
  if (error) throw error;
}

/**
 * Live-updates the bell badge without polling. Respect the per-type
 * notification preferences (Settings > Notifications) by filtering
 * `enabledTypes` client-side before calling onNotification — the insert
 * still happens server-side regardless of the recipient's preferences
 * (that's correct: preferences control what you're shown, not what
 * happened), so filter at the display layer, same as the current app does.
 */
export function subscribeToNotifications(userId, onNotification) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
      (payload) => onNotification(payload.new)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
