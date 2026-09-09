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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B141C]/95 backdrop-blur-lg border-t border-[#172631] py-2 px-6 safe-bottom">
      <div className="max-w-[430px] mx-auto flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1 relative group transition-all"
            >
              <div
                className={`w-10 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#1687FF]/15 text-[#1687FF] shadow-sm shadow-[#1687FF]/20 scale-105'
                    : 'text-[#8493A1] hover:text-[#F5F8FA]'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight transition-colors ${
                  isActive ? 'text-[#1687FF] font-semibold' : 'text-[#536270]'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-3 h-0.5 rounded-full bg-[#1687FF]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
