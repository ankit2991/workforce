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
import { AdminLogin } from "./features/admin/AdminLogin";
import { AdminLayout } from "./features/admin/AdminLayout";

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('workpay_admin_token');
  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  useServiceWorker();

  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Secure Admin Console (Fixed Header & Sidebar) */}
          <Route
            path="/admin/*"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          />

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
