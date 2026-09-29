import React, { useState, useEffect } from 'react';
import {
  Gamepad2,
  PlusCircle,
  ArrowDownRight,
  Search,
  Flame,
  Sparkles,
  Trophy,
  History,
  Play,
  RotateCw,
} from 'lucide-react';
import { apiRequest, localStore } from '../../lib/apiClient';
import type { Game, GameCategory, GamingWallet, Wallet } from '../../types';
import { GamingTopUpModal } from '../../components/modals/GamingTopUpModal';
import { GamingCashOutModal } from '../../components/modals/GamingCashOutModal';
import { GameLaunchModal } from '../../components/modals/GameLaunchModal';

export const GamingPage: React.FC = () => {
  const [gamingWallet, setGamingWallet] = useState<GamingWallet | null>(null);
  const [mainWallet, setMainWallet] = useState<Wallet | null>(null);
  const [categories, setCategories] = useState<GameCategory[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'GAMES' | 'HISTORY'>('GAMES');
  const [history, setHistory] = useState<any[]>([]);

  // Modals
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showCashOutModal, setShowCashOutModal] = useState(false);
  const [selectedGameToPlay, setSelectedGameToPlay] = useState<Game | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gWalletRes, mWalletRes, catsRes, gamesRes]: any = await Promise.all([
        apiRequest('/gaming-wallet'),
        apiRequest('/wallet'),
        apiRequest('/games/categories'),
        apiRequest('/games'),
      ]);

      if (gWalletRes) setGamingWallet(gWalletRes);
      if (mWalletRes) setMainWallet(mWalletRes);
      if (catsRes && Array.isArray(catsRes) && catsRes.length > 0) {
        setCategories(catsRes);
      }
      if (gamesRes && Array.isArray(gamesRes) && gamesRes.length > 0) {
        setGames(gamesRes);
      } else {
        // Fallback to localStore games if backend returns empty
        setGames(localStore.games);
      }
    } catch (err) {
      console.error('Error fetching games data:', err);
      // Resilience fallback
      setGames(localStore.games);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const histRes: any = await apiRequest('/gaming-wallet/history');
      if (histRes) setHistory(histRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchHistory();
    }
  }, [activeTab]);

  const filteredGames = games.filter((game) => {
    const matchesCat =
      selectedCategory === 'all' || game.categorySlug === selectedCategory;
    const matchesSearch =
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="pb-24 pt-2 space-y-5 animate-in fade-in duration-300">
      {/* Gaming Wallet Hero Card */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#4E10A5] via-[#350779] to-[#17033B] p-5 text-white shadow-xl shadow-[#7B22FF]/20 border border-[#7B22FF]/40">
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-[#A83DF4]/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#1687FF]/20 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#E0A7FF]">
              <Gamepad2 size={18} />
            </div>
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-200/80">
                Gaming Wallet
              </span>
              <p className="text-[10px] text-purple-300">Play & Win Instant Cash</p>
            </div>
          </div>
          <div className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold text-[#E0A7FF]">
            PROVABLY FAIR
          </div>
        </div>

        {/* Balance */}
        <div className="mt-4 relative z-10">
          <span className="text-xs font-bold text-purple-200">MYR</span>
          <div className="text-3xl sm:text-4xl font-black tracking-tight">
            {(gamingWallet?.balance ?? 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        {/* Action Buttons on Card */}
        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 relative z-10">
          <button
            onClick={() => setShowTopUpModal(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#7B22FF] to-[#A83DF4] text-white font-bold text-xs hover:opacity-95 active:scale-[0.98] transition shadow-md shadow-[#7B22FF]/30"
          >
            <PlusCircle size={15} />
            Top Up
          </button>
          <button
            onClick={() => setShowCashOutModal(true)}
            disabled={(gamingWallet?.balance ?? 0) <= 0}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xs hover:bg-white/20 active:scale-[0.98] transition disabled:opacity-40"
          >
            <ArrowDownRight size={15} className="text-[#00C982]" />
            Cash Out
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Games / History) */}
      <div className="flex items-center bg-[#101B24] p-1 rounded-xl border border-[#172631]">
        <button
          onClick={() => setActiveTab('GAMES')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === 'GAMES'
              ? 'bg-[#7B22FF] text-white shadow-md'
              : 'text-[#8493A1] hover:text-[#F5F8FA]'
          }`}
        >
          <Gamepad2 size={15} /> All Games{' '}
          {loading ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin ml-1" />
          ) : (
            `(${games.length})`
          )}
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === 'HISTORY'
              ? 'bg-[#7B22FF] text-white shadow-md'
              : 'text-[#8493A1] hover:text-[#F5F8FA]'
          }`}
        >
          <History size={15} /> Bet History
        </button>
      </div>

      {activeTab === 'GAMES' ? (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8493A1]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games or providers..."
              className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#F5F8FA] outline-none transition"
            />
          </div>

          {/* Horizontal Category Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                selectedCategory === 'all'
                  ? 'bg-[#7B22FF] border-[#7B22FF] text-white shadow-sm'
                  : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:border-[#8493A1]/30'
              }`}
            >
              🔥 All Games
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                  selectedCategory === cat.slug
                    ? 'bg-[#7B22FF] border-[#7B22FF] text-white shadow-sm'
                    : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:border-[#8493A1]/30'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Loading Skeletons vs Game Grid vs Empty State */}
          {loading ? (
            <div className="space-y-4">
              {/* Premium Gaming Loading Header Card */}
              <div className="p-4 rounded-2xl bg-[#101B24] border border-[#7B22FF]/30 flex items-center justify-between shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#7B22FF]/10 to-transparent animate-[shimmer_2s_infinite]" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-[#7B22FF]/20 border border-[#7B22FF]/50 flex items-center justify-center text-[#E0A7FF]">
                    <RotateCw size={18} className="animate-spin text-[#A83DF4]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      Loading Arena Games...
                      <span className="w-2 h-2 rounded-full bg-[#00C982] animate-ping inline-block" />
                    </h4>
                    <p className="text-[10px] text-[#8493A1]">Connecting to game catalog & live providers</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-[#7B22FF]/20 text-[10px] font-bold text-[#E0A7FF] border border-[#7B22FF]/40 relative z-10 animate-pulse">
                  Loading...
                </div>
              </div>

              {/* 2-Column Skeleton Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl bg-[#101B24] border border-[#172631] overflow-hidden shadow-md animate-pulse flex flex-col justify-between"
                  >
                    <div className="relative aspect-[4/3] w-full bg-[#0D161F] flex items-center justify-center">
                      <Gamepad2 size={24} className="text-[#8493A1]/20" />
                      <div className="absolute top-2 left-2 w-12 h-3.5 rounded-md bg-[#1F3342]/70" />
                      <div className="absolute bottom-2 left-2 w-16 h-3.5 rounded-md bg-[#1F3342]/70" />
                    </div>
                    <div className="p-3 space-y-2.5">
                      <div className="space-y-1.5">
                        <div className="h-3 w-3/4 rounded-md bg-[#1F3342]" />
                        <div className="h-2 w-1/2 rounded-md bg-[#172631]" />
                      </div>
                      <div className="h-8 w-full rounded-xl bg-[#7B22FF]/20 border border-[#7B22FF]/30" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredGames.length > 0 ? (
            /* 2-Column Game Grid */
            <div className="grid grid-cols-2 gap-3">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className="group rounded-2xl bg-[#101B24] border border-[#172631] hover:border-[#7B22FF]/50 overflow-hidden shadow-md transition flex flex-col justify-between"
                >
                  {/* Thumbnail Container */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0A131A]">
                    <img
                      src={game.thumbnail}
                      alt={game.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101B24] via-transparent to-transparent opacity-80" />

                    {/* Status Badge */}
                    {game.status && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#7B22FF] text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1 shadow">
                        <Flame size={10} /> {game.status}
                      </div>
                    )}

                    {/* Min Bet Pill */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-bold text-[#E0A7FF]">
                      Min: MYR {game.minBet.toFixed(2)}
                    </div>
                  </div>

                  {/* Details & Play Button */}
                  <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-[#F5F8FA] line-clamp-1 group-hover:text-[#E0A7FF] transition">
                        {game.name}
                      </h4>
                      <p className="text-[10px] text-[#8493A1] mt-0.5">{game.provider}</p>
                    </div>

                    <button
                      onClick={() => setSelectedGameToPlay(game)}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#7B22FF] to-[#A83DF4] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#7B22FF]/20 hover:opacity-95 active:scale-[0.98] transition"
                    >
                      <Play size={13} fill="currentColor" /> Play Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="p-8 text-center bg-[#101B24] rounded-2xl border border-[#172631] space-y-3">
              <Gamepad2 size={36} className="mx-auto text-[#8493A1]/40" />
              <div>
                <p className="text-sm font-bold text-white">No Games Found</p>
                <p className="text-xs text-[#8493A1] mt-1">
                  {searchQuery ? `No games match "${searchQuery}"` : 'No games found in this category.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSearchQuery('');
                  setGames(localStore.games);
                }}
                className="px-4 py-2 rounded-xl bg-[#7B22FF] text-white text-xs font-bold shadow-md hover:opacity-90 transition"
              >
                Reset & View All Games ({localStore.games.length})
              </button>
            </div>
          )}
        </>
      ) : (
        /* Bet History */
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="p-8 text-center bg-[#101B24] rounded-2xl border border-[#172631]">
              <Trophy size={28} className="mx-auto text-[#8493A1] mb-2 opacity-50" />
              <p className="text-xs text-[#8493A1]">No recent game rounds yet</p>
              <p className="text-[11px] text-[#8493A1]/70 mt-1">
                Play any slot or casino game to see rounds recorded here.
              </p>
            </div>
          ) : (
            history.map((tx: any, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-[#101B24] border border-[#172631] flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white">{tx.gameName || 'Game Spin'}</p>
                  <p className="text-[10px] text-[#8493A1]">
                    {new Date(tx.createdAt || Date.now()).toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-black ${
                      tx.winAmount > 0 ? 'text-[#00C982]' : 'text-[#FF455B]'
                    }`}
                  >
                    {tx.winAmount > 0 ? `+MYR ${tx.winAmount.toFixed(2)}` : `-MYR ${tx.betAmount.toFixed(2)}`}
                  </p>
                  <span className="text-[9px] text-[#8493A1]">
                    {tx.winAmount > 0 ? 'WON' : 'SETTLED'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <GamingTopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={fetchData}
        mainWalletBalance={mainWallet?.availableBalance ?? 1200}
      />
      <GamingCashOutModal
        isOpen={showCashOutModal}
        onClose={() => setShowCashOutModal(false)}
        onSuccess={fetchData}
        gamingWalletBalance={gamingWallet?.balance ?? 0}
      />
      <GameLaunchModal
        game={selectedGameToPlay}
        isOpen={!!selectedGameToPlay}
        onClose={() => setSelectedGameToPlay(null)}
        gamingBalance={gamingWallet?.balance ?? 0}
        onBalanceUpdate={fetchData}
        onOpenTopUp={() => setShowTopUpModal(true)}
      />
    </div>
  );
};
