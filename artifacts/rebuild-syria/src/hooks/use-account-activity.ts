import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetUserActivityQueryKey,
  getGetUserNotificationsQueryKey,
  useGetUserActivity,
  useGetUserNotifications,
  useMarkNotificationsRead,
} from '@workspace/api-client-react';

const POLL_MS = 10_000;

/** Unread count for the account menu badge (polled every 10s). */
export function useUnreadCount(userId: string) {
  const q = useGetUserNotifications(userId, {
    query: { enabled: !!userId, queryKey: getGetUserNotificationsQueryKey(userId), refetchInterval: POLL_MS, retry: false },
  });
  return userId ? q.data?.unreadCount ?? 0 : 0;
}

/** Activity feed (polled for cross-session updates). Marks changes as seen only AFTER they were rendered. */
export function useAccountActivity(userId: string) {
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  const qc = useQueryClient();
  const activity = useGetUserActivity(userId, {
    query: { enabled: !!userId, queryKey: getGetUserActivityQueryKey(userId), refetchInterval: POLL_MS },
  });
  const mark = useMarkNotificationsRead();
  const markRef = useRef(mark.mutate);
  markRef.current = mark.mutate;
  const lastMarked = useRef<{ id: string; cursor: number } | null>(null);
  const n = activity.data?.notifications;
  const cursor = n?.latestChangeId;
  const unread = n?.unreadCount ?? 0;
  useEffect(() => {
    if (!visible || !userId || cursor === undefined || unread <= 0) return;
    const prev = lastMarked.current;
    if (prev && prev.id === userId && prev.cursor >= cursor) return; // unchanged cursor: never loop
    lastMarked.current = { id: userId, cursor };
    markRef.current({ id: userId, data: { latestChangeId: cursor } }, {
      onSuccess: () => { void qc.invalidateQueries({ queryKey: getGetUserNotificationsQueryKey(userId) }); },
      onError: () => { lastMarked.current = null; }, // Retry on the next fresh poll, not in a tight loop.
    });
  }, [userId, cursor, unread, visible, activity.dataUpdatedAt, qc]);
  return activity;
}
