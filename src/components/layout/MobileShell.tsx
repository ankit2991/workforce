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
    <div className="min-h-screen w-full bg-[#020509] flex justify-center items-start sm:py-8 selection:bg-[#1687FF]/30 relative overflow-x-hidden">
      {/* Ambient background glow for desktop preview */}
      <div className="hidden sm:block absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#1687FF]/10 via-[#7B22FF]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Centered Mobile App Container */}
      <div className="w-full max-w-[430px] min-h-screen sm:min-h-[880px] sm:max-h-[920px] bg-[#050B10] text-[#F5F8FA] relative flex flex-col sm:rounded-[40px] sm:border sm:border-white/[0.12] shadow-[0_25px_70px_rgba(0,0,0,0.85)] sm:ring-1 sm:ring-white/[0.05] overflow-hidden">
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
