import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Wallet, Sparkles } from 'lucide-react';
import { localStore } from '../../lib/apiClient';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = localStore.notifications.filter((n) => !n.isRead).length;
  const isHome = location.pathname === '/';

  const getPageTitle = () => {
    if (title) return title;
    if (location.pathname === '/gaming') return 'Gaming Arena';
    if (location.pathname === '/shop') return 'Company Store';
    if (location.pathname === '/notifications') return 'Notifications';
    if (location.pathname === '/profile') return 'My Profile';
    return 'WorkPay';
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#050B10]/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3 safe-top transition-all">
      <div className="flex items-center justify-between">
        {/* Left: User Avatar on Home OR Brand on Subpages */}
        {isHome ? (
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 cursor-pointer group active:scale-95 transition-transform"
          >
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                alt="John Doe"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-[#1687FF]/40 group-hover:ring-[#1687FF] transition-all"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00C982] ring-2 ring-[#050B10]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#8493A1] uppercase tracking-wider leading-none">
                Hi, John
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs font-bold text-white tracking-tight">EMP-001</span>
                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-[#1687FF]/20 text-[#1687FF] border border-[#1687FF]/30">
                  PRO
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer select-none active:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#075DA8] via-[#1264B4] to-[#1687FF] flex items-center justify-center shadow-md shadow-[#1687FF]/25 border border-white/20">
              <Wallet size={16} className="text-white" />
            </div>
            <span className="font-black text-sm tracking-tight text-white">
              Work<span className="text-[#1687FF]">Pay</span>
            </span>
          </div>
        )}

        {/* Center: Brand badge or Subpage Title */}
        {isHome ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1687FF] animate-pulse" />
            <span className="font-extrabold text-xs tracking-tight text-white/90">
              Work<span className="text-[#1687FF]">Pay</span>
            </span>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-sm font-bold text-white tracking-tight">{getPageTitle()}</h2>
            {subtitle && <p className="text-[10px] text-[#8493A1]">{subtitle}</p>}
          </div>
        )}

        {/* Right: Notification Bell */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-[#1687FF]/40 flex items-center justify-center text-[#8493A1] hover:text-white active:scale-90 transition-all shadow-sm"
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1687FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1687FF] ring-2 ring-[#050B10]" />
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
