import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Calendar, User, LogOut, Settings, ChevronDown, ExternalLink, WifiOff, RefreshCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ActiveModule } from '../layout/Sidebar';
import { getSyncQueue } from '../../lib/offlineSync';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNavigate?: (mod: ActiveModule) => void;
}

export function Header({ title, subtitle, onNavigate }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-BD', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (profile) {
      loadNotifications();
      const subscription = supabase
        .channel('notifications-changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(c => c + 1);
        })
        .subscribe();
      return () => { subscription.unsubscribe(); };
    }
  }, [profile]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', profile?.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };
  // Offline sync state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getSyncQueue().length);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    
    // Offline sync listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleSyncUpdate = (e: any) => setPendingCount(e.detail);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-sync-update', handleSyncUpdate);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-sync-update', handleSyncUpdate);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-neutral-100 px-4 lg:px-6 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="pl-10 lg:pl-0">
          <h1 className="text-lg font-heading font-semibold text-neutral-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-50 px-3 py-1.5 rounded-lg mr-2">
          <Calendar size={13} className="text-primary-500" />
          {dateStr}
        </div>

        {isOffline && (
          <div className="flex items-center gap-1.5 text-xs text-error-600 bg-error-50 px-3 py-1.5 rounded-lg border border-error-100 animate-pulse">
            <WifiOff size={14} />
            <span className="font-bold">Offline</span>
          </div>
        )}

        {!isOffline && pendingCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-warning-600 bg-warning-50 px-3 py-1.5 rounded-lg border border-warning-100">
            <RefreshCcw size={14} className="animate-spin" />
            <span className="font-bold">Syncing {pendingCount} items...</span>
          </div>
        )}

        {/* Notifications Facility */}
        <div className="relative" ref={notificationRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative p-2 rounded-lg transition-colors ${showNotifications ? 'bg-primary-50 text-primary-600' : 'hover:bg-neutral-100 text-neutral-500'}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-100 py-2 animate-in fade-in zoom-in duration-200">
              <div className="px-4 py-2 border-b border-neutral-50 flex items-center justify-between">
                <span className="text-sm font-bold text-neutral-800">Notifications ({unreadCount})</span>
                <button 
                  onClick={markAllAsRead}
                  className="text-[10px] font-bold text-primary-500 hover:underline uppercase tracking-wider"
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 && (
                  <div className="px-4 py-8 text-center text-neutral-400 text-xs italic">
                    No notifications yet
                  </div>
                )}
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => markAsRead(n.id)}
                    className={`px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer border-b border-neutral-50 last:border-0 ${!n.is_read ? 'bg-primary-50/30' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${n.type === 'error' ? 'bg-error-500' : n.type === 'warning' ? 'bg-warning-500' : n.type === 'success' ? 'bg-success-500' : 'bg-primary-500'}`} />
                      <div className="flex-1">
                        <p className={`text-xs ${!n.is_read ? 'font-bold' : 'font-medium'} text-neutral-800`}>{n.title}</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-neutral-50 text-center">
                <button 
                  onClick={() => { setShowNotifications(false); onNavigate?.('notifications'); }}
                  className="text-xs font-bold text-primary-500 hover:text-primary-600"
                >
                  See all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Facility */}
        <div className="relative ml-2 pl-2 border-l border-neutral-100" ref={profileRef}>
          <button 
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-neutral-50 transition-colors group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden sm:block text-left mr-1">
              <div className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                {profile?.full_name || 'User'}
                <ChevronDown size={12} className={`transition-transform duration-200 ${showProfile ? 'rotate-180' : ''}`} />
              </div>
              <div className="text-[10px] text-neutral-400 font-medium capitalize">{profile?.role?.replace(/_/g, ' ')}</div>
            </div>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-100 py-2 animate-in fade-in zoom-in duration-200">
              <div className="px-4 py-3 border-b border-neutral-50 mb-1">
                <p className="text-xs font-bold text-neutral-800">{profile?.full_name}</p>
                <p className="text-[10px] text-neutral-400 capitalize">{profile?.role?.replace(/_/g, ' ')}</p>
              </div>
              <button 
                onClick={() => { setShowProfile(false); onNavigate?.('profile'); }}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                <User size={16} className="text-neutral-400" />
                My Profile
              </button>

              <button className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
                <ExternalLink size={16} className="text-neutral-400" />
                Help & Support
              </button>
              <div className="h-px bg-neutral-50 my-1" />
              <button 
                onClick={signOut}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-error-500 hover:bg-error-50 transition-colors"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
