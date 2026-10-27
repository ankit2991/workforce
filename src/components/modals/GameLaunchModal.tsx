import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Gamepad2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Game } from '../../types';

interface GameLaunchModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  gamingBalance: number;
  onBalanceUpdate: () => void;
  onOpenTopUp: () => void;
  isPreview?: boolean;
}

/**
 * Links/embeds published game frontends only. This Workpay backend does not
 * implement a game provider session, round settlement, or betting API. Never
 * credit wallets using a locally generated random result.
 */
export const GameLaunchModal: React.FC<GameLaunchModalProps> = ({ game, isOpen, onClose, isPreview = false }) => {
  const [showFrame, setShowFrame] = useState(true);
  const [frameLoading, setFrameLoading] = useState(true);
  const [frameTimedOut, setFrameTimedOut] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    setShowFrame(true);
    setFrameLoading(true);
    setFrameTimedOut(false);
  }, [isOpen, game?.id]);
  useEffect(() => {
    if (!isOpen || !showFrame || !frameLoading) return;
    const timer = setTimeout(() => setFrameTimedOut(true), 10000);
    return () => clearTimeout(timer);
  }, [isOpen, showFrame, frameLoading, game?.id]);
  if (!isOpen || !game) return null;

  const gameUrl = game.gameUrl && /^https:\/\//i.test(game.gameUrl) ? game.gameUrl : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-[480px] sm:max-w-xl bg-[#0A131A] border border-[#172631] rounded-[28px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        <div className="p-4 bg-[#081017] border-b border-[#172631] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#7B22FF] flex items-center justify-center text-white"><Gamepad2 size={18}/></div>
            <div className="min-w-0"><h3 className="text-sm font-bold text-white truncate">{game.name}</h3><p className="text-[11px] text-[#8493A1]">{game.provider} • {game.category}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#101B24] flex items-center justify-center text-white" aria-label="Close game"><X size={16}/></button>
        </div>
        <div className="p-3 text-[11px] bg-amber-500/10 border-b border-amber-500/25 text-amber-100 flex gap-2">
          <AlertTriangle size={15} className="shrink-0"/>
          <span>{isPreview ? 'Preview only. The server or wallet connection is not confirmed. ' : ''}The external game is not integrated with the Workpay wallet. Any in-game balance or results are managed by the game host, not Workpay.</span>
        </div>
        {gameUrl ? (
          <div className="p-3 space-y-3 overflow-auto">
            {showFrame && (
              <div className="relative w-full h-[460px] sm:h-[540px] rounded-xl bg-[#070D14] border border-[#172631] overflow-hidden">
                {frameLoading && !frameTimedOut && <div role="status" className="absolute inset-0 flex items-center justify-center text-xs text-[#8493A1]">Loading external game…</div>}
                {frameTimedOut && <div className="absolute inset-0 z-10 flex flex-col gap-3 items-center justify-center bg-[#070D14]/95 p-6 text-center text-xs text-[#8493A1]">
                  <p>Embedded game did not finish loading. Its host may block iframe embedding.</p>
                  <a href={gameUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-[#7B22FF] text-white font-bold inline-flex items-center gap-2">Open Game Directly <ExternalLink size={14}/></a>
                </div>}
                <iframe key={gameUrl} src={gameUrl} title={game.name} className="w-full h-full border-0" allow="autoplay; fullscreen; gamepad" onLoad={() => { setFrameLoading(false); setFrameTimedOut(false); }}/>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <button type="button" onClick={() => { setShowFrame(!showFrame); setFrameLoading(true); setFrameTimedOut(false); }} className="inline-flex items-center gap-1 text-xs text-[#8493A1] hover:text-white"><RefreshCw size={14}/> {showFrame ? 'Close embedded view' : 'Try embedded view'}</button>
              <a href={gameUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-4 py-2 rounded-lg bg-[#7B22FF] text-white font-bold inline-flex items-center gap-2">Open Game <ExternalLink size={14}/></a>
            </div>
          </div>
        ) : (
          <div className="p-10 text-center space-y-2"><Gamepad2 size={32} className="mx-auto text-[#8493A1]"/><h4 className="text-sm font-bold text-white">Game is not available</h4><p className="text-xs text-[#8493A1]">An administrator must configure a valid HTTPS launch URL and activate this game.</p></div>
        )}
      </div>
    </div>
  );
};
