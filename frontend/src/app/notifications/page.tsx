"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsPage() {
  const { profile, role, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    async function fetchAllNotifications() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile!.id)
          .order('created_at', { ascending: false });

        if (error) console.error("Error fetching notifications:", error);
        setNotifications(data || []);
      } finally {
        setLoading(false);
      }
    }

    fetchAllNotifications();

    // Supabase Realtime channel
    const subscription = supabase
      .channel(`notifications-page-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile.id}`
      }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  const markAllRead = async () => {
    if (!profile?.id) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const getNotificationLink = (notification: any) => {
    if (role === 'ADMIN') {
      return `/admin/projects/${notification.entity_id}`;
    }
    return `/user/projects/${notification.entity_id}`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-space-lg pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-container text-primary">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Stay informed on project assignments, review results, and studio updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-3.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary transition-colors cursor-pointer border border-outline-variant/30"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading || authLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-xl border border-surface-container-high">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-body-md text-on-surface-variant">Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-xl border border-surface-container-high text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-1">notifications_off</span>
          <p className="font-title-md font-bold text-on-surface">You're all caught up.</p>
          <p className="font-body-sm text-on-surface-variant max-w-sm">
            You will receive alerts here when projects are assigned, submitted, or reviewed.
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm divide-y divide-surface-container-high/40 overflow-hidden">
          {notifications.map((notif) => {
            const isApproved = notif.type === 'PROJECT_APPROVED';
            const isRevision = notif.type === 'REVISION_REQUESTED';
            const isAssigned = notif.type === 'PROJECT_ASSIGNED';

            return (
              <div
                key={notif.id}
                className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                  !notif.read ? 'bg-primary/5' : 'hover:bg-surface-container-low/40'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isApproved ? 'bg-emerald-50 text-emerald-700' :
                    isRevision ? 'bg-error/10 text-error' :
                    isAssigned ? 'bg-primary-container text-primary' : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {isApproved ? 'check_circle' : isRevision ? 'rate_review' : isAssigned ? 'assignment' : 'notifications'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={getNotificationLink(notif)}
                        onClick={() => markAsRead(notif.id)}
                        className="font-title-sm font-bold text-on-surface hover:text-primary transition-colors cursor-pointer"
                      >
                        {notif.title}
                      </Link>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[11px] text-outline mt-1.5 block">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={getNotificationLink(notif)}
                    onClick={() => markAsRead(notif.id)}
                    className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors cursor-pointer"
                  >
                    View
                  </Link>
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="p-1 text-outline hover:text-on-surface transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <span className="material-symbols-outlined text-[18px]">done</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
