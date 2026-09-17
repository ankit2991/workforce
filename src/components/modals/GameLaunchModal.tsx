import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Trophy,
  RotateCcw,
  Volume2,
  ShieldCheck,
  Flame,
  ExternalLink,
  Maximize2,
  Gamepad2,
} from 'lucide-react';
import type { Game } from '../../types';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

interface GameLaunchModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  gamingBalance: number;
  onBalanceUpdate: () => void;
  onOpenTopUp: () => void;
}

export const GameLaunchModal: React.FC<GameLaunchModalProps> = ({
  game,
  isOpen,
  onClose,
  gamingBalance,
  onBalanceUpdate,
  onOpenTopUp,
}) => {
  const [activeMode, setActiveMode] = useState<'LIVE' | 'BET'>(game?.gameUrl ? 'LIVE' : 'BET');
  const [betAmount, setBetAmount] = useState<number>(2);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const [slotSymbols, setSlotSymbols] = useState<string[]>(['🍒', '💎', '7️⃣']);

  if (!isOpen || !game) return null;

  const allSymbols = ['🍒', '🍋', '🍇', '💎', '👑', '7️⃣', '⭐'];

  const handlePlaySpin = async () => {
    if (betAmount > gamingBalance) {
      toast.error('Insufficient Gaming Wallet balance! Please top up.');
      return;
    }

    setIsSpinning(true);
    setLastWin(null);
    setMultiplier(null);

    // Animate slot spinning
    const interval = setInterval(() => {
      setSlotSymbols([
        allSymbols[Math.floor(Math.random() * allSymbols.length)],
        allSymbols[Math.floor(Math.random() * allSymbols.length)],
        allSymbols[Math.floor(Math.random() * allSymbols.length)],
      ]);
    }, 100);

    setTimeout(async () => {
      clearInterval(interval);

      // Outcome logic
      const roll = Math.random();
      let winMult = 0;
      let winningSymbols = ['🍋', '🍒', '🍇'];

      if (roll > 0.65) {
        if (roll > 0.95) {
          winMult = 10;
          winningSymbols = ['7️⃣', '7️⃣', '7️⃣'];
        } else if (roll > 0.85) {
          winMult = 4;
          winningSymbols = ['💎', '💎', '💎'];
        } else {
          winMult = 2;
          winningSymbols = ['👑', '👑', '⭐'];
        }
      }

      setSlotSymbols(winningSymbols);
      setIsSpinning(false);

      const netWin = betAmount * winMult;
      setMultiplier(winMult);
      setLastWin(netWin);

      try {
        if (winMult > 0) {
          await apiRequest('/gaming-wallet/win', {
            method: 'POST',
            body: JSON.stringify({
              gameId: game.id,
              betAmount,
              winAmount: netWin,
            }),
          });
          toast.success(`🎉 WINNER! You won MYR ${netWin.toFixed(2)} (${winMult}x)!`);
        } else {
          await apiRequest('/gaming-wallet/bet', {
            method: 'POST',
            body: JSON.stringify({
              gameId: game.id,
              betAmount,
            }),
          });
          toast.info('Better luck next spin!');
        }
        onBalanceUpdate();
      } catch (err) {
        // Handled gracefully
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] sm:max-w-xl bg-[#0A131A] border border-[#172631] rounded-[28px] overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="p-4 bg-[#081017] border-b border-[#172631] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7B22FF] to-[#A83DF4] flex items-center justify-center text-white shadow-md">
              <Gamepad2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate max-w-[200px]">{game.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#7B22FF] text-[9px] font-black text-white uppercase">
                  {game.status || 'HOT'}
                </span>
              </div>
              <p className="text-[11px] text-[#8493A1]">{game.provider} • {game.category}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {game.gameUrl && (
              <a
                href={game.gameUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-[#101B24] hover:bg-[#172631] text-[#8493A1] hover:text-white transition"
                title="Open in new window"
              >
                <ExternalLink size={15} />
              </a>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#101B24] border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* View Mode Switcher if gameUrl exists */}
        {game.gameUrl && (
          <div className="flex items-center bg-[#0B141C] p-1 border-b border-[#172631] text-xs font-bold">
            <button
              onClick={() => setActiveMode('LIVE')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeMode === 'LIVE'
                  ? 'bg-[#7B22FF] text-white shadow-sm'
                  : 'text-[#8493A1] hover:text-white'
              }`}
            >
              🎮 Play Interactive Game
            </button>
            <button
              onClick={() => setActiveMode('BET')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeMode === 'BET'
                  ? 'bg-[#7B22FF] text-white shadow-sm'
                  : 'text-[#8493A1] hover:text-white'
              }`}
            >
              🎰 RNG Bet Simulator
            </button>
          </div>
        )}

        {/* Live Game Iframe Mode */}
        {activeMode === 'LIVE' && game.gameUrl ? (
          <div className="flex-1 p-3 flex flex-col bg-[#050B10] space-y-2">
            <div className="relative w-full h-[480px] sm:h-[540px] rounded-2xl overflow-hidden border border-[#172631] bg-black">
              <iframe
                src={game.gameUrl}
                title={game.name}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; gamepad"
                loading="eager"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#8493A1] px-1">
              <span className="flex items-center gap-1 text-[#00C982] font-semibold">
                <ShieldCheck size={13} /> Verified Web Game Host
              </span>
              <a
                href={game.gameUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#1687FF] hover:underline flex items-center gap-1"
              >
                Launch Fullscreen <ExternalLink size={11} />
              </a>
            </div>
          </div>
        ) : (
          /* RNG Bet Simulator Mode */
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-2xl bg-[#101B24] border border-[#1E2E3C] flex flex-col items-center justify-center relative shadow-inner">
              <div className="flex items-center gap-3 py-4">
                {slotSymbols.map((sym, idx) => (
                  <div
                    key={idx}
                    className={`w-20 h-24 rounded-2xl bg-[#060D12] border-2 ${
                      isSpinning ? 'border-[#7B22FF] animate-pulse' : 'border-[#1E2E3C]'
                    } flex items-center justify-center text-4xl shadow-lg transition-transform ${
                      isSpinning ? 'scale-95' : 'scale-100'
                    }`}
                  >
                    {sym}
                  </div>
                ))}
              </div>

              {multiplier !== null && !isSpinning && (
                <div
                  className={`mt-2 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 animate-bounce ${
                    multiplier > 0
                      ? 'bg-[#00C982]/20 border border-[#00C982] text-[#00C982]'
                      : 'bg-[#FF455B]/10 border border-[#FF455B]/30 text-[#FF455B]'
                  }`}
                >
                  {multiplier > 0 ? (
                    <>
                      <Trophy size={14} /> BIG WIN {multiplier}x! (+MYR {lastWin?.toFixed(2)})
                    </>
                  ) : (
                    <>Try Again!</>
                  )}
                </div>
              )}
            </div>

            {/* Bet Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[#8493A1]">Select Bet Amount</label>
                <span className="text-xs font-bold text-white">MYR {betAmount.toFixed(2)}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setBetAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      betAmount === amt
                        ? 'bg-[#7B22FF] border-[#7B22FF] text-white shadow-md shadow-[#7B22FF]/30'
                        : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:text-white'
                    }`}
                  >
                    MYR {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              {gamingBalance < betAmount ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTopUp();
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#7B22FF] to-[#A83DF4] text-white font-bold text-sm shadow-lg shadow-[#7B22FF]/30 hover:opacity-95 transition flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} /> Top Up Gaming Wallet
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={handlePlaySpin}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00C982] via-[#00E599] to-[#00C982] text-black font-black text-sm shadow-xl shadow-[#00C982]/25 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={17} className={isSpinning ? 'animate-spin' : ''} />
                  {isSpinning ? 'SPINNING...' : `SPIN & WIN (MYR ${betAmount.toFixed(2)})`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
