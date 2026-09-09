import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House, Gamepad2, ShoppingBag, User } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/', icon: House },
    { label: 'Gaming', path: '/gaming', icon: Gamepad2 },
    { label: 'Shop', path: '/shop', icon: ShoppingBag },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav className="sticky bottom-0 z-40 w-full bg-[#050B10]/95 backdrop-blur-2xl border-t border-white/[0.08] px-4 py-2 safe-bottom transition-all">
      <div className="w-full flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 py-1 px-3 relative group transition-all duration-200 active:scale-90"
            >
              <div
                className={`relative w-10 h-7 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'text-[#1687FF]'
                    : 'text-[#64748B] hover:text-[#94A3B8]'
                }`}
              >
                <Icon size={21} strokeWidth={isActive ? 2.5 : 1.8} />
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-[#1687FF]/15 blur-sm" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold tracking-tight transition-colors duration-200 ${
                  isActive ? 'text-[#1687FF]' : 'text-[#64748B]'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-4 h-1 rounded-full bg-gradient-to-r from-[#1687FF] to-[#00C982] shadow-sm shadow-[#1687FF]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
