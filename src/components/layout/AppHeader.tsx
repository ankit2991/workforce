import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Wallet } from 'lucide-react';
import { localStore } from '../../lib/apiClient';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = localStore.notifications.filter((n) => !n.isRead).length;

  const getPageTitle = () => {
    if (title) return title;
    if (location.pathname === '/') return 'Hi, John 👋';
    if (location.pathname === '/gaming') return 'Gaming Arena';
    if (location.pathname === '/shop') return 'Company Shop';
    if (location.pathname === '/notifications') return 'Notifications';
    if (location.pathname === '/profile') return 'My Profile';
    return 'WorkPay';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B141C]/95 backdrop-blur-md border-b border-[#172631] px-4 py-3 safe-top">
      <div className="flex items-center justify-between">
        {/* Left: Brand Logo */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 cursor-pointer select-none active:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#075DA8] to-[#1687FF] flex items-center justify-center shadow-md shadow-[#1687FF]/20">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-[#F5F8FA]">
              Work<span className="text-[#1687FF]">Pay</span>
            </span>
          </div>
        </div>

        {/* Center: Contextual Title */}
        <div className="text-center">
          <p className="text-xs font-semibold text-[#8493A1] tracking-wide uppercase">
            {getPageTitle()}
          </p>
          {subtitle && (
            <p className="text-[10px] text-[#536270]">{subtitle}</p>
          )}
        </div>

        {/* Right: Notifications Bell */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-9 h-9 rounded-xl bg-[#101B24] border border-[#172631] flex items-center justify-center text-[#8493A1] hover:text-[#F5F8FA] hover:border-[#1687FF]/40 active:scale-95 transition-all"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1687FF] ring-2 ring-[#0B141C] animate-pulse" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
