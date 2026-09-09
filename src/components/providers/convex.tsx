import React, { useMemo } from "react";
import { ConvexProviderWithHerculesAuth } from "@usehercules/auth/convex-react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { isDevAuthMode } from "./auth.tsx";
import { useAuth } from "@/hooks/use-auth.ts";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://127.0.0.1:3210";
const convex = new ConvexReactClient(convexUrl);

function DevConvexProvider({ children }: { children: React.ReactNode }) {
  const devAuth = useAuth();

  const useDevAuthAdapter = () => {
    return useMemo(
      () => ({
        isLoading: devAuth.isLoading,
        isAuthenticated: devAuth.isAuthenticated,
        fetchAccessToken: async () => (devAuth.isAuthenticated ? "mock-dev-token" : null),
      }),
      [devAuth.isLoading, devAuth.isAuthenticated],
    );
  };

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useDevAuthAdapter}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  if (isDevAuthMode) {
    return <DevConvexProvider>{children}</DevConvexProvider>;
  }

  return (
    <ConvexProviderWithHerculesAuth client={convex}>
      {children}
    </ConvexProviderWithHerculesAuth>
  );
}
