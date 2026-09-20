"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export function Notifications() {
  const { user, profile, role } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const targetUserId = profile?.id;
    if (!targetUserId) return;

    async function fetchNotifications() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(15);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    }

    fetchNotifications();

    // Setup realtime subscription
    const subscription = supabase
      .channel(`notifications-${targetUserId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${targetUserId}`
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 15));
        setUnreadCount(prev => prev + 1);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${targetUserId}`
      }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
        setUnreadCount(prev => Math.max(0, prev - (payload.new.read ? 1 : 0)));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile?.id]);

  const markAllAsRead = async () => {
    if (!profile?.id) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getNotificationLink = (notification: any) => {
    if (role === 'ADMIN') {
      return `/admin/projects/${notification.entity_id}`;
    }
    return `/user/projects/${notification.entity_id}`;
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors relative cursor-pointer"
        title="Notifications"
      >
        <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-84 bg-surface-container-lowest border border-outline-variant/30 shadow-xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-title-sm font-bold text-on-surface">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-container text-on-primary-container">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-medium text-on-surface-variant hover:text-on-surface ml-1 cursor-pointer"
              >
                View all
              </Link>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto divide-y divide-outline-variant/10">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant text-sm">
                <span className="material-symbols-outlined text-3xl text-outline mb-1 block">notifications_off</span>
                You're all caught up.
              </div>
            ) : (
              <ul>
                {notifications.map(notif => (
                  <li key={notif.id} className={`p-3.5 hover:bg-surface-container-low transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}>
                    <Link 
                      href={getNotificationLink(notif)} 
                      onClick={() => {
                        markAsRead(notif.id);
                        setIsOpen(false);
                      }} 
                      className="block"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`material-symbols-outlined mt-0.5 text-[20px] shrink-0 ${
                          notif.type === 'PROJECT_APPROVED' ? 'text-green-600' :
                          notif.type === 'REVISION_REQUESTED' ? 'text-amber-500' :
                          notif.type === 'PROJECT_ASSIGNED' ? 'text-primary' : 'text-on-surface-variant'
                        }`}>
                          {notif.type === 'PROJECT_APPROVED' ? 'check_circle' :
                           notif.type === 'REVISION_REQUESTED' ? 'edit_note' :
                           notif.type === 'PROJECT_ASSIGNED' ? 'assignment' : 'info'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-tight ${!notif.read ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-outline mt-1 block">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
