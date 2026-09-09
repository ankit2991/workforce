import { useContext } from "react";
import { useAuth as useHerculesAuth, useUser as useHerculesUser } from "@usehercules/auth/react";
import { DevAuthContext, isDevAuthMode } from "@/components/providers/auth.tsx";

export function useAuth(): any {
  if (isDevAuthMode) {
    const devContext = useContext(DevAuthContext);
    return (
      devContext ?? {
        isAuthenticated: true,
        isLoading: false,
        user: {
          name: "Admin User",
          email: "admin@example.com",
          profile: {
            name: "Admin User",
            email: "admin@example.com",
            sub: "dev-superadmin",
            role: "superadmin",
          },
        },
        signin: async () => {},
        signout: async () => {},
        signinRedirect: async () => {},
        error: null,
      }
    );
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useHerculesAuth();
}

export function useUser(): any {
  if (isDevAuthMode) {
    const auth = useAuth();
    return auth?.user ?? null;
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useHerculesUser();
}
