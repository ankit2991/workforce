import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import { MobileShell } from "./components/layout/MobileShell";
import { HomePage } from "./features/home/HomePage";
import { GamingPage } from "./features/gaming/GamingPage";
import { ShopPage } from "./features/shop/ShopPage";
import { NotificationsPage } from "./features/notifications/NotificationsPage";
import { ProfilePage } from "./features/profile/ProfilePage";
import { LoginPage } from "./features/auth/LoginPage";
import { AdminDashboard } from "./features/admin/AdminDashboard";

export default function App() {
  useServiceWorker();

  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          {/* Auth Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* HR & Payroll Admin Console (Desktop Responsive) */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Core Mobile Workforce App Routes */}
          <Route
            path="/"
            element={
              <MobileShell>
                <HomePage />
              </MobileShell>
            }
          />
          <Route
            path="/gaming"
            element={
              <MobileShell>
                <GamingPage />
              </MobileShell>
            }
          />
          <Route
            path="/shop"
            element={
              <MobileShell>
                <ShopPage />
              </MobileShell>
            }
          />
          <Route
            path="/notifications"
            element={
              <MobileShell>
                <NotificationsPage />
              </MobileShell>
            }
          />
          <Route
            path="/profile"
            element={
              <MobileShell>
                <ProfilePage />
              </MobileShell>
            }
          />

          {/* Aliases & Fallbacks */}
          <Route path="/wallet" element={<Navigate to="/" replace />} />
          <Route path="/portal" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
