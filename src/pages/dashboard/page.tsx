import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated, Unauthenticated } from "convex/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Building2, GitBranch, MapPin, Users } from "lucide-react";

function StatCard({
  title,
  value,
  icon,
  description,
  loading,
}: {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  description: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold font-serif text-foreground">{value ?? 0}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function DashboardInner() {
  const agencyCount = useQuery(api.agencies.countAll, {});
  const branchCount = useQuery(api.branches.countAll, {});
  const siteCount = useQuery(api.sites.countAll, {});
  const workerCount = useQuery(api.userRoles.countWorkers, {});

  const loading = agencyCount === undefined;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your workforce operations</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Agencies"
          value={agencyCount}
          icon={<Building2 size={18} />}
          description="Total registered agencies"
          loading={loading}
        />
        <StatCard
          title="Branches"
          value={branchCount}
          icon={<GitBranch size={18} />}
          description="Active branch offices"
          loading={branchCount === undefined}
        />
        <StatCard
          title="Sites"
          value={siteCount}
          icon={<MapPin size={18} />}
          description="Operational work sites"
          loading={siteCount === undefined}
        />
        <StatCard
          title="Workers"
          value={workerCount}
          icon={<Users size={18} />}
          description="Registered workforce"
          loading={workerCount === undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold font-serif">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "Add a new agency", href: "/agencies" },
              { label: "Register a branch", href: "/branches" },
              { label: "Create a work site", href: "/sites" },
              { label: "Enroll a worker", href: "/workers" },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer"
              >
                → {action.label}
              </a>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold font-serif">Platform Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Database", status: "Operational" },
              { label: "Authentication", status: "Operational" },
              { label: "Backend Functions", status: "Operational" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="flex items-center gap-1.5 text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  {s.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Authenticated>
        <DashboardInner />
      </Authenticated>
      <Unauthenticated>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold font-serif">Sign in to continue</h2>
            <p className="text-sm text-muted-foreground">Access your workforce management dashboard</p>
          </div>
          <SignInButton />
        </div>
      </Unauthenticated>
    </>
  );
}
