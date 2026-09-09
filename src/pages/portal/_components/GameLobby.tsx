/**
 * GameLobby — browsable list of games shown on the iGaming tab.
 * Populated from a hardcoded catalog; wire GAME_CATALOG to an API call
 * once your provider supplies a games list endpoint.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import GameLauncher from "./GameLauncher.tsx";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type Game = {
  id: string;
  name: string;
  category: "slots" | "live" | "sports" | "crash" | "table" | "other";
  thumbnail?: string;
  tags?: string[];
  hot?: boolean;
  new?: boolean;
};

// ── Replace this catalog with a real API call once you have provider credentials ──
const GAME_CATALOG: Game[] = [
  { id: "sweet-bonanza",    name: "Sweet Bonanza",    category: "slots",  tags: ["Buy Feature", "Multiplier"],  hot: true },
  { id: "gates-olympus",    name: "Gates of Olympus", category: "slots",  tags: ["Tumbling Reels", "Free Spins"], new: true },
  { id: "aviator",          name: "Aviator",          category: "crash",  tags: ["Crash", "Multiplier"],         hot: true },
  { id: "baccarat-live",    name: "Live Baccarat",    category: "live",   tags: ["Live Dealer", "HD Stream"] },
  { id: "roulette-live",    name: "Live Roulette",    category: "live",   tags: ["Live Dealer", "Auto Roulette"] },
  { id: "blackjack-live",   name: "Live Blackjack",   category: "live",   tags: ["Live Dealer", "Side Bets"] },
  { id: "dragon-tiger",     name: "Dragon Tiger",     category: "live",   tags: ["Fast Pace", "Simple Rules"] },
  { id: "book-of-dead",     name: "Book of Dead",     category: "slots",  tags: ["Free Spins", "Expanding Wild"] },
  { id: "big-bass-bonanza", name: "Big Bass Bonanza", category: "slots",  tags: ["Buy Feature", "Multiplier"] },
  { id: "lucky-neko",       name: "Lucky Neko",       category: "slots",  tags: ["Cluster Pays"],                new: true },
  { id: "mines",            name: "Mines",            category: "other",  tags: ["Strategy", "Instant Win"] },
  { id: "plinko",           name: "Plinko",           category: "other",  tags: ["Instant Win", "Risk Levels"] },
];

const CATEGORY_LABELS: Record<string, string> = {
  all: "All Games",
  slots: "Slots",
  live: "Live Casino",
  crash: "Crash",
  table: "Table Games",
  other: "Mini Games",
};

const CATEGORY_EMOJI: Record<string, string> = {
  all: "🎮", slots: "🎰", live: "🎭", crash: "✈️", table: "♠️", other: "🎯",
};

type Props = {
  currency: string;
};

export default function GameLobby({ currency }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [launchGame, setLaunchGame] = useState<Game | null>(null);

  const categories = ["all", ...Array.from(new Set(GAME_CATALOG.map(g => g.category)))];

  const filtered = GAME_CATALOG.filter(g => {
    const matchCat = activeCategory === "all" || g.category === activeCategory;
    const matchSearch = search === "" || g.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search games…"
          className="pl-8 rounded-2xl h-10 text-sm bg-muted/60 border-0"
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all",
              activeCategory === cat
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-muted/60 text-slate-400 hover:bg-muted",
            )}
          >
            {CATEGORY_EMOJI[cat]} {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {/* Game grid */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-slate-400 text-sm">No games found</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(game => (
            <GameCard
              key={game.id}
              game={game}
              onPlay={() => setLaunchGame(game)}
            />
          ))}
        </div>
      )}

      {/* Game launcher overlay */}
      {launchGame && (
        <GameLauncher
          game={launchGame}
          onClose={() => setLaunchGame(null)}
        />
      )}
    </>
  );
}

function GameCard({ game, onPlay }: { game: Game; onPlay: () => void }) {
  const CATEGORY_COLORS: Record<string, string> = {
    slots: "from-violet-900/60 to-purple-900/40",
    live:  "from-rose-900/60 to-pink-900/40",
    crash: "from-orange-900/60 to-amber-900/40",
    table: "from-emerald-900/60 to-teal-900/40",
    other: "from-blue-900/60 to-indigo-900/40",
  };
  const gradient = CATEGORY_COLORS[game.category] ?? "from-slate-800 to-slate-900";

  const EMOJIS: Record<string, string> = {
    slots: "🎰", live: "🎭", crash: "✈️", table: "♠️", other: "🎯",
  };

  return (
    <button
      onClick={onPlay}
      className="rounded-2xl overflow-hidden bg-card border border-white/5 text-left cursor-pointer hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-900/20 transition-all group"
    >
      {/* Thumbnail / placeholder */}
      <div className={cn("w-full aspect-[4/3] bg-gradient-to-br flex items-center justify-center relative", gradient)}>
        {game.thumbnail ? (
          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">{EMOJIS[game.category] ?? "🎮"}</span>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {game.hot && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">🔥 HOT</span>}
          {game.new && <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">NEW</span>}
        </div>
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full">
            Play
          </span>
        </div>
      </div>
      <div className="px-2.5 py-2">
        <p className="text-xs font-semibold text-foreground truncate">{game.name}</p>
        <p className="text-[10px] text-slate-400 capitalize">{game.category}</p>
      </div>
    </button>
  );
}
