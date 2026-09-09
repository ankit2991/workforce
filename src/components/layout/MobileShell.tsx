import React from 'react';
import { useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { BottomNavigation } from './BottomNavigation';

interface MobileShellProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  children,
  showHeader = true,
  showBottomNav = true,
  headerTitle,
  headerSubtitle,
}) => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  // If Admin panel, render full-width responsive desktop shell
  if (isAdmin) {
    return <div className="min-h-screen bg-[#050B10] text-[#F5F8FA]">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-[#020508] flex justify-center items-start sm:py-6 selection:bg-[#1687FF]/30">
      {/* Centered Mobile App Container */}
      <div className="w-full max-w-[430px] min-h-screen sm:min-h-[920px] sm:max-h-[940px] bg-[#050B10] text-[#F5F8FA] relative flex flex-col sm:rounded-[36px] sm:border sm:border-[#172631] shadow-2xl sm:shadow-black/80 overflow-hidden">
        {/* Decorative Top Phone Speaker Indicator on Desktop */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full bg-[#172631] z-50 pointer-events-none" />

        {/* Global App Header */}
        {showHeader && (
          <AppHeader title={headerTitle} subtitle={headerSubtitle} />
        )}

        {/* Scrollable Main Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden safe-bottom">
          {children}
        </main>

        {/* Fixed Mobile Bottom Navigation */}
        {showBottomNav && <BottomNavigation />}
      </div>
    </div>
  );
};
