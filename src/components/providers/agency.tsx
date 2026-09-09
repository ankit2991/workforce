import { createContext, useContext, useState, useEffect } from "react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Role = "superadmin" | "agency_admin" | "branch_admin" | "site_admin" | "worker" | null;

type AgencyContextValue = {
  agencyId: Id<"agencies"> | null;
  setAgencyId: (id: Id<"agencies"> | null) => void;
  role: Role;
  setRole: (role: Role) => void;
  isSuperadmin: boolean;
};

const AgencyContext = createContext<AgencyContextValue>({
  agencyId: null,
  setAgencyId: () => {},
  role: null,
  setRole: () => {},
  isSuperadmin: false,
});

const STORAGE_KEY = "wfp_active_agency";

export function AgencyProvider({ children }: { children: React.ReactNode }) {
  const [agencyId, setAgencyIdState] = useState<Id<"agencies"> | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (stored as Id<"agencies">) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState<Role>(null);

  const setAgencyId = (id: Id<"agencies"> | null) => {
    setAgencyIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const isSuperadmin = role === "superadmin";

  return (
    <AgencyContext.Provider value={{ agencyId, setAgencyId, role, setRole, isSuperadmin }}>
      {children}
    </AgencyContext.Provider>
  );
}

export function useAgency() {
  return useContext(AgencyContext);
}
