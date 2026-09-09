/**
 * ProviderConfigPanel — admin panel to configure the iGaming provider.
 * Placed inside the admin iGaming page.
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { ConvexError } from "convex/values";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const CONVEX_SITE_URL = "https://enchanted-oriole-185.convex.site";

type Props = {
  agencyId: Id<"agencies">;
};

export default function ProviderConfigPanel({ agencyId }: Props) {
  const config     = useQuery(api.igamingProvider.getProviderConfig, { agencyId });
  const saveConfig = useMutation(api.igamingProvider.saveProviderConfig);

  const [form, setForm] = useState({
    providerName:       "",
    operatorId:         "",
    apiKey:             "",
    launchUrlTemplate:  "",
    callbackSecret:     "",
    sandboxMode:        true,
    enabled:            false,
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState<string | null>(null);

  // Sync form from saved config
  useEffect(() => {
    if (config) {
      setForm({
        providerName:      config.providerName,
        operatorId:        config.operatorId,
        apiKey:            config.apiKey,
        launchUrlTemplate: config.launchUrlTemplate,
        callbackSecret:    config.callbackSecret,
        sandboxMode:       config.sandboxMode,
        enabled:           config.enabled,
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!form.providerName) { toast.error("Provider name is required"); return; }
    setLoading(true);
    try {
      await saveConfig({ agencyId, ...form });
      toast.success("Provider config saved");
    } catch (err) {
      const msg = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : "Failed to save";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ value, id }: { value: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(value, id)}
      className="flex-shrink-0 p-1.5 text-slate-400 hover:text-foreground cursor-pointer transition-colors rounded-md hover:bg-muted"
    >
      {copied === id ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );

  const ENDPOINTS = [
    { label: "Balance",  path: "/igaming/balance"  },
    { label: "Debit",    path: "/igaming/debit"    },
    { label: "Credit",   path: "/igaming/credit"   },
    { label: "Rollback", path: "/igaming/rollback" },
  ];

  const TEMPLATE_EXAMPLES = [
    { name: "Pragmatic Play",    tpl: "https://gameserverus.pragmaticplay.net/GreenTube/index.html?token={TOKEN}&symbol={GAME_ID}&stylename=default" },
    { name: "Spribe / Aviator",  tpl: "https://aviator.spribe.io/?token={TOKEN}&operator_id={OPERATOR_ID}&currency={CURRENCY}" },
    { name: "Evolution Gaming",  tpl: "https://games.cdn.evo.casino/?token={TOKEN}&game={GAME_ID}&currency={CURRENCY}" },
    { name: "Generic Seamless",  tpl: "https://provider.example.com/launch?token={TOKEN}&game={GAME_ID}&currency={CURRENCY}&operator={OPERATOR_ID}&sandbox={SANDBOX}" },
  ];

  return (
    <div className="space-y-6">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">Provider Configuration</h2>
        {config ? (
          config.enabled ? (
            <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-300">Live</Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-600 border-amber-300">Configured / Disabled</Badge>
          )
        ) : (
          <Badge variant="secondary">Not configured</Badge>
        )}
      </div>

      {/* Callback URLs (give to provider) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 text-xs flex items-center justify-center font-bold">1</span>
            Give these callback URLs to your provider
          </CardTitle>
          <CardDescription className="text-xs">
            The provider will POST to these endpoints during gameplay. Configure them in your operator account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {ENDPOINTS.map(ep => {
            const full = `${CONVEX_SITE_URL}${ep.path}`;
            return (
              <div key={ep.path} className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2">
                <span className="text-xs text-slate-500 w-16 flex-shrink-0">{ep.label}</span>
                <span className="font-mono text-xs flex-1 text-foreground truncate">{full}</span>
                <CopyButton value={full} id={ep.path} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Provider details form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-violet-500/15 text-violet-600 text-xs flex items-center justify-center font-bold">2</span>
            Enter your provider credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Provider Name</Label>
              <Input value={form.providerName} onChange={e => setForm(f => ({ ...f, providerName: e.target.value }))}
                placeholder="e.g. Pragmatic Play, SBO, Custom" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">Operator ID</Label>
              <Input value={form.operatorId} onChange={e => setForm(f => ({ ...f, operatorId: e.target.value }))}
                placeholder="Your operator ID from the provider" className="mt-1 rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs">API Key (for signing requests)</Label>
            <Input type="password" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
              placeholder="API key / secret key from provider dashboard" className="mt-1 rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Callback Secret (for verifying their requests to us)</Label>
            <Input type="password" value={form.callbackSecret} onChange={e => setForm(f => ({ ...f, callbackSecret: e.target.value }))}
              placeholder="Shared secret from provider" className="mt-1 rounded-xl" />
          </div>

          {/* Launch URL template */}
          <div>
            <Label className="text-xs">Game Launch URL Template</Label>
            <Input value={form.launchUrlTemplate} onChange={e => setForm(f => ({ ...f, launchUrlTemplate: e.target.value }))}
              placeholder="https://provider.com/launch?token={TOKEN}&game={GAME_ID}…" className="mt-1 rounded-xl font-mono text-xs" />
            <p className="text-[10px] text-slate-400 mt-1">
              Use <code className="bg-muted px-1 rounded">{"{TOKEN}"}</code> <code className="bg-muted px-1 rounded">{"{GAME_ID}"}</code> <code className="bg-muted px-1 rounded">{"{CURRENCY}"}</code> <code className="bg-muted px-1 rounded">{"{OPERATOR_ID}"}</code> as placeholders.
            </p>
            {/* Example templates */}
            <div className="mt-2 space-y-1">
              <p className="text-[10px] text-slate-400 font-medium">Quick fill — example templates:</p>
              {TEMPLATE_EXAMPLES.map(ex => (
                <button
                  key={ex.name}
                  onClick={() => setForm(f => ({ ...f, launchUrlTemplate: ex.tpl }))}
                  className="block w-full text-left text-[10px] text-violet-500 hover:text-violet-400 cursor-pointer truncate bg-muted/30 rounded px-2 py-1"
                >
                  {ex.name}: {ex.tpl}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="flex items-center gap-3 flex-1 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Sandbox / Test Mode</p>
                <p className="text-[10px] text-slate-500">Use staging URLs — no real money</p>
              </div>
              <Switch checked={form.sandboxMode} onCheckedChange={v => setForm(f => ({ ...f, sandboxMode: v }))} />
            </div>
            <div className={cn(
              "flex items-center gap-3 flex-1 rounded-xl px-4 py-3 border",
              form.enabled
                ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                : "bg-muted/40 border-border",
            )}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">Integration Enabled</p>
                <p className="text-[10px] text-slate-500">Workers can launch real games</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))} />
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full rounded-xl gap-2">
            {loading && <RefreshCw size={14} className="animate-spin" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Next steps */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-500/15 text-slate-600 text-xs flex items-center justify-center font-bold">3</span>
            Implementation checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-xs text-slate-500">
            {[
              "Give the provider the 4 callback URLs above",
              "Enter your operator credentials in the form",
              "Ask your provider for their signature scheme (HMAC header name + algorithm)",
              "Update verifySignature() in convex/http.ts with the real implementation",
              "Map the provider's field names in the HTTP action handlers if they differ",
              "Test in sandbox mode first — check igamingProviderTransactions for raw payloads",
              "Once verified, disable sandbox mode and enable the integration",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>
                {step}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
