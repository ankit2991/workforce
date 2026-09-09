import { useLocation } from "react-router-dom";
import { Clock } from "lucide-react";

export default function ComingSoonPage() {
  const location = useLocation();
  const pageName = location.pathname.replace("/", "").replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 p-8">
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
        <Clock size={24} className="text-accent" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold font-serif text-foreground mb-1">{pageName} — Coming Soon</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          This feature is part of an upcoming milestone and will be available soon.
        </p>
      </div>
    </div>
  );
}
