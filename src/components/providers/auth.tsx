import React, { createContext, useContext, useState, useMemo } from "react";
import { HerculesAuthProvider } from "@usehercules/auth/react";

export interface DevAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    name: string;
    email: string;
    profile?: {
      name: string;
      email: string;
      sub: string;
      role: string;
    };
  } | null;
  signin: () => Promise<void>;
  signout: () => Promise<void>;
  signinRedirect: () => Promise<void>;
  error: Error | null;
}

export const DevAuthContext = createContext<DevAuthContextType | null>(null);

export const isDevAuthMode = !import.meta.env.VITE_HERCULES_OIDC_AUTHORITY;

function DevAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("dev_auth_logged_in") !== "false";
  });

  const user = useMemo(() => {
    if (!isAuthenticated) return null;
    return {
      name: "Admin User",
      email: "admin@example.com",
      profile: {
        name: "Admin User",
        email: "admin@example.com",
        sub: "dev-superadmin",
        role: "superadmin",
      },
    };
  }, [isAuthenticated]);

  const signin = async () => {
    localStorage.setItem("dev_auth_logged_in", "true");
    setIsAuthenticated(true);
  };

  const signout = async () => {
    localStorage.setItem("dev_auth_logged_in", "false");
    setIsAuthenticated(false);
  };

  const signinRedirect = async () => {
    await signin();
    const returnTo = sessionStorage.getItem("auth_redirect") || "/dashboard";
    sessionStorage.removeItem("auth_redirect");
    window.location.href = returnTo;
  };

  return (
    <DevAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading: false,
        user,
        signin,
        signout,
        signinRedirect,
        error: null,
      }}
    >
      {children}
    </DevAuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (isDevAuthMode) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }

  return (
    <HerculesAuthProvider
      authority={import.meta.env.VITE_HERCULES_OIDC_AUTHORITY!}
      client_id={import.meta.env.VITE_HERCULES_OIDC_CLIENT_ID!}
      userManagerSettings={{
        prompt: import.meta.env.VITE_HERCULES_OIDC_PROMPT ?? "select_account",
        response_type:
          import.meta.env.VITE_HERCULES_OIDC_RESPONSE_TYPE ?? "code",
        scope:
          import.meta.env.VITE_HERCULES_OIDC_SCOPE ??
          "openid profile email offline_access",
        redirect_uri:
          import.meta.env.VITE_HERCULES_OIDC_REDIRECT_URI ??
          `${window.location.origin}/auth/callback`,
      }}
    >
      {children}
    </HerculesAuthProvider>
  );
}
