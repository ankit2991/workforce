import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  Send,
  Gamepad2,
  ShoppingBag,
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { NotificationItem } from '../../types';
import { toast } from 'sonner';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data: any = await apiRequest('/notifications');
      if (data && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark notifications');
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 size={16} className="text-[#00C982]" />;
      case 'WARNING':
        return <AlertCircle size={16} className="text-[#FCD34D]" />;
      case 'FINANCE':
        return <TrendingUp size={16} className="text-[#1687FF]" />;
      case 'GAMING':
        return <Gamepad2 size={16} className="text-[#7B22FF]" />;
      default:
        return <Bell size={16} className="text-[#1687FF]" />;
    }
  };

  return (
    <div className="pb-24 pt-2 space-y-4 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Notifications</h2>
          <p className="text-xs text-[#8493A1]">
            {notifications.filter((n) => !n.isRead).length} unread updates
          </p>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101B24] border border-[#172631] text-xs font-semibold text-[#8493A1] hover:text-white hover:border-[#1687FF]/40 transition"
        >
          <CheckCheck size={14} />
          Mark all read
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center bg-[#101B24] p-1 rounded-xl border border-[#172631]">
        <button
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
            filter === 'ALL'
              ? 'bg-[#1687FF] text-white shadow-sm'
              : 'text-[#8493A1] hover:text-white'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
            filter === 'UNREAD'
              ? 'bg-[#1687FF] text-white shadow-sm'
              : 'text-[#8493A1] hover:text-white'
          }`}
        >
          Unread ({notifications.filter((n) => !n.isRead).length})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center bg-[#101B24] rounded-2xl border border-[#172631]">
            <Bell size={32} className="mx-auto text-[#8493A1] mb-2 opacity-40" />
            <p className="text-xs text-[#8493A1]">No notifications to display</p>
          </div>
        ) : (
          filteredNotifs.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition relative ${
                item.isRead
                  ? 'bg-[#101B24]/70 border-[#172631]'
                  : 'bg-[#101B24] border-[#1687FF]/40 shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0B141C] border border-[#172631] flex items-center justify-center shrink-0">
                  {getIcon(item.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#F5F8FA]">{item.title}</h4>
                    <span className="text-[10px] text-[#8493A1]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-[#8493A1] leading-relaxed">
                    {item.message}
                  </p>
                </div>

                {!item.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#1687FF] shrink-0 mt-1" />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
