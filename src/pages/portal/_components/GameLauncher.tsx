/**
 * GameLauncher — iFrame-based game launcher for the worker portal.
 * Creates a session token, builds the launch URL, and opens the game in an iFrame.
 */
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Maximize2, Minimize2, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Game = {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
  tags?: string[];
};

type Props = {
  game: Game;
  onClose: () => void;
};

type LaunchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; launchUrl: string; token: string }
  | { status: "error"; message: string };

export default function GameLauncher({ game, onClose }: Props) {
  const createSession  = useMutation(api.igamingProvider.createGameSession);
  const endSession     = useMutation(api.igamingProvider.endGameSession);

  const [state, setState]     = useState<LaunchState>({ status: "idle" });
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const launch = async () => {
    setState({ status: "loading" });
    setIframeLoaded(false);
    try {
      const result = await createSession({ gameId: game.id, gameName: game.name });
      setState({ status: "ready", launchUrl: result.launchUrl, token: result.token });
    } catch (err) {
      const msg = err instanceof ConvexError
        ? (err.data as { message: string }).message
        : "Failed to launch game";
      setState({ status: "error", message: msg });
      toast.error(msg);
    }
  };

  const handleClose = async () => {
    if (state.status === "ready") {
      await endSession({ token: state.token }).catch(() => {/* best effort */});
    }
    onClose();
  };

  const handleReload = () => {
    if (state.status === "ready") {
      setIframeLoaded(false);
      // Re-trigger by briefly clearing
      const prev = state;
      setState({ status: "loading" });
      setTimeout(() => setState(prev), 100);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          "fixed inset-0 z-50 bg-black/90 flex flex-col",
          fullscreen ? "" : "md:inset-8 md:rounded-2xl md:overflow-hidden",
        )}
      >
        {/* Header bar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#0f0f1a] border-b border-white/10 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{game.name}</p>
            <p className="text-purple-400 text-xs capitalize">{game.category}</p>
          </div>
          <div className="flex items-center gap-1">
            {state.status === "ready" && (
              <>
                <button
                  onClick={handleReload}
                  className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                  title="Reload game"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  onClick={() => setFullscreen(f => !f)}
                  className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
                  title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer transition-colors"
              title="Close game"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Game area */}
        <div className="flex-1 relative bg-[#0a0a14] flex items-center justify-center overflow-hidden">
          {state.status === "idle" && (
            <div className="flex flex-col items-center gap-6 px-8 text-center">
              {game.thumbnail ? (
                <img src={game.thumbnail} alt={game.name}
                  className="w-32 h-32 rounded-2xl object-cover shadow-xl shadow-purple-900/40" />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-purple-900/40 flex items-center justify-center text-5xl">
                  🎮
                </div>
              )}
              <div>
                <h2 className="text-white text-2xl font-bold">{game.name}</h2>
                <p className="text-slate-400 text-sm mt-1 capitalize">{game.category}</p>
                {game.tags && (
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {game.tags.map(tag => (
                      <span key={tag} className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={launch}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl text-base font-bold shadow-lg shadow-purple-900/40 gap-2"
                size="lg"
              >
                Play Now
              </Button>
              <p className="text-slate-500 text-xs max-w-xs">
                Play responsibly. Only wager what you can afford to lose.
              </p>
            </div>
          )}

          {state.status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Wifi size={32} className="text-purple-400" />
              </motion.div>
              <p className="text-slate-400 text-sm">Connecting to game server…</p>
            </div>
          )}

          {state.status === "error" && (
            <div className="flex flex-col items-center gap-4 px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
                <X size={28} className="text-red-400" />
              </div>
              <p className="text-white font-semibold">Failed to launch</p>
              <p className="text-slate-400 text-sm">{state.message}</p>
              <Button onClick={launch} variant="secondary" className="rounded-xl">Try Again</Button>
            </div>
          )}

          {state.status === "ready" && (
            <>
              {/* Loading skeleton while iFrame hydrates */}
              {!iframeLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a14] z-10">
                  <div className="flex flex-col items-center gap-3">
                    <Skeleton className="w-full h-full absolute inset-0 rounded-none opacity-10" />
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <RefreshCw size={28} className="text-purple-400" />
                    </motion.div>
                    <p className="text-slate-400 text-sm">Loading game…</p>
                  </div>
                </div>
              )}
              <iframe
                key={state.launchUrl}
                src={state.launchUrl}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
                onLoad={() => setIframeLoaded(true)}
                title={game.name}
              />
            </>
          )}
        </div>

        {/* Footer — responsible gambling notice */}
        {state.status === "ready" && (
          <div className="px-4 py-2 bg-[#0f0f1a] border-t border-white/10 flex-shrink-0">
            <p className="text-center text-[10px] text-slate-500">
              18+ · Gambling can be addictive. Please play responsibly. · Session expires in 4 hours.
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
