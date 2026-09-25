// hooks/useNotifications.js

import { useCallback, useEffect, useState } from "react";
import * as notifApi from "../lib/api/notifications";
import { cacheProfile, slugForId } from "./profileCache";

function toAppNotification(row) {
  if (row.actor) cacheProfile(row.actor);
  return {
    id: row.id,
    type: row.type,
    actor: slugForId(row.actor_id) ?? row.actor?.handle?.slice(1),
    postId: row.post_id,
    text: null, // the current app shows a short snippet on like/reply notifications; fetch post.text separately if you want that back
    time: "now",
    read: row.read,
  };
}

export function useNotifications(currentUserId, notificationPrefs) {
  const [notifications, setNotifications] = useState([]);

  const reload = useCallback(async () => {
    if (!currentUserId) return;
    const rows = await notifApi.fetchNotifications(currentUserId);
    setNotifications(rows.map(toAppNotification));
  }, [currentUserId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!currentUserId) return undefined;
    return notifApi.subscribeToNotifications(currentUserId, (row) => {
      // Respect per-type prefs at the display layer (see api/notifications.js comment).
      if (notificationPrefs && notificationPrefs[row.type] === false) return;
      setNotifications((prev) => [toAppNotification(row), ...prev]);
    });
  }, [currentUserId, notificationPrefs]);

  const markAllRead = useCallback(async () => {
    await notifApi.markAllRead(currentUserId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [currentUserId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, reload };
}
