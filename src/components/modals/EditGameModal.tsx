import React, { useState, useEffect } from 'react';
import { X, Gamepad2, Sparkles, Link as LinkIcon, Check, Image as ImageIcon } from 'lucide-react';
import type { Game } from '../../types';
import { apiRequest, localStore } from '../../lib/apiClient';
import { toast } from 'sonner';

interface EditGameModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onGameUpdated: (updatedGame: Game) => void;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({
  game,
  isOpen,
  onClose,
  onGameUpdated,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Slots',
    categorySlug: 'slots',
    provider: '',
    thumbnail: '',
    banner: '',
    gameUrl: '',
    minBet: 1.0,
    maxBet: 500.0,
    status: 'HOT' as 'HOT' | 'NEW' | 'POPULAR' | 'DEFAULT',
    isFeatured: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (game && isOpen) {
      setFormData({
        name: game.name || '',
        category: game.category || 'Slots',
        categorySlug: game.categorySlug || 'slots',
        provider: game.provider || '',
        thumbnail: game.thumbnail || '',
        banner: game.banner || game.thumbnail || '',
        gameUrl: game.gameUrl || '',
        minBet: game.minBet ?? 1.0,
        maxBet: game.maxBet ?? 500.0,
        status: (game.status as any) || 'HOT',
        isFeatured: game.isFeatured ?? true,
      });
    }
  }, [game, isOpen]);

  if (!isOpen || !game) return null;

  const handleCategoryChange = (catName: string) => {
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    setFormData((prev) => ({
      ...prev,
      category: catName,
      categorySlug: slug,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Game title is required');
      return;
    }

    setLoading(true);

    const updatedGame: Game = {
      ...game,
      name: formData.name.trim(),
      category: formData.category,
      categorySlug: formData.categorySlug,
      provider: formData.provider.trim() || 'WorkPlay Games',
      thumbnail: formData.thumbnail.trim() || game.thumbnail,
      banner: formData.banner.trim() || formData.thumbnail.trim() || game.banner,
      gameUrl: formData.gameUrl.trim() || undefined,
      minBet: Number(formData.minBet) || 1.0,
      maxBet: Number(formData.maxBet) || 500.0,
      status: formData.status,
      tag: formData.status,
      isFeatured: formData.isFeatured,
    };

    try {
      // 1. Update in localStore immediately
      const idx = localStore.games.findIndex((g) => g.id === game.id);
      if (idx !== -1) {
        localStore.games[idx] = updatedGame;
      } else {
        localStore.games.unshift(updatedGame);
      }
      localStore.save();

      // 2. Call backend update endpoint
      await apiRequest(`/games/${game.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedGame),
      });

      // 3. Notify parent component
      onGameUpdated(updatedGame);
      toast.success(`Game "${updatedGame.name}" updated successfully!`);
      onClose();
    } catch (err) {
      console.warn('Backend update note:', err);
      // Fallback update was already saved in localStore
      onGameUpdated(updatedGame);
      toast.success(`Game "${updatedGame.name}" saved!`);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0B141C] border border-[#7B22FF]/40 rounded-[28px] p-6 text-white shadow-2xl shadow-[#7B22FF]/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#172631]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7B22FF] to-[#A83DF4] p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full rounded-[10px] bg-[#0B141C] flex items-center justify-center text-[#E0A7FF]">
                <Gamepad2 size={20} />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white">Edit Game Details</h3>
              <p className="text-[11px] text-[#8493A1]">Modify game information, provider, bet limits & URL</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101B24] text-[#8493A1] hover:text-white flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-xs">
          {/* Game Title */}
          <div>
            <label className="block text-[#8493A1] mb-1 font-semibold">Game Title</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Space Pinball, Candy Fortune"
              className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3.5 text-white outline-none transition font-medium"
            />
          </div>

          {/* Category & Provider */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8493A1] mb-1 font-semibold">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
              >
                <option value="Arcade">Arcade</option>
                <option value="Slots">Slots</option>
                <option value="Action">Action</option>
                <option value="Table Games">Table Games</option>
                <option value="Dice">Dice</option>
                <option value="Crash">Crash</option>
                <option value="Live Casino">Live Casino</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8493A1] mb-1 font-semibold">Provider / Studio</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                placeholder="e.g. Bandai Classic, SweetWorks"
                className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
              />
            </div>
          </div>

          {/* Web Game URL (iframe) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[#8493A1] font-semibold flex items-center gap-1">
                <LinkIcon size={12} className="text-[#1687FF]" /> Interactive Web Game URL (Optional)
              </label>
              <span className="text-[10px] text-[#8493A1]">e.g. Vercel game link</span>
            </div>
            <input
              type="url"
              value={formData.gameUrl}
              onChange={(e) => setFormData({ ...formData, gameUrl: e.target.value })}
              placeholder="https://pinballfe.vercel.app/"
              className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none font-mono text-[11px]"
            />
          </div>

          {/* Thumbnail URL with live preview */}
          <div>
            <label className="block text-[#8493A1] mb-1 font-semibold flex items-center gap-1">
              <ImageIcon size={12} className="text-[#7B22FF]" /> Thumbnail Image URL
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="url"
                required
                value={formData.thumbnail}
                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
              />
              {formData.thumbnail && (
                <div className="w-12 h-10 rounded-xl overflow-hidden border border-[#172631] shrink-0 bg-[#0A1118]">
                  <img
                    src={formData.thumbnail}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => ((e.target as any).style.display = 'none')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Min & Max Bet */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#8493A1] mb-1 font-semibold">Min Bet (MYR)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={formData.minBet}
                onChange={(e) => setFormData({ ...formData, minBet: parseFloat(e.target.value) || 1 })}
                className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[#8493A1] mb-1 font-semibold">Max Bet (MYR)</label>
              <input
                type="number"
                step="10"
                min="10"
                required
                value={formData.maxBet}
                onChange={(e) => setFormData({ ...formData, maxBet: parseFloat(e.target.value) || 500 })}
                className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
              />
            </div>
          </div>

          {/* Status Badge & Featured */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-[#8493A1] mb-1 font-semibold">Status Badge</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none font-bold"
              >
                <option value="HOT">🔥 HOT</option>
                <option value="POPULAR">⭐ POPULAR</option>
                <option value="NEW">✨ NEW</option>
                <option value="DEFAULT">DEFAULT</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="editFeatGame"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded text-[#7B22FF] accent-[#7B22FF] cursor-pointer"
              />
              <label htmlFor="editFeatGame" className="text-white font-semibold cursor-pointer">
                Feature on Gaming Hub
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#1A2834] hover:bg-[#223544] text-[#8493A1] hover:text-white font-bold text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#7B22FF] to-[#A83DF4] hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#7B22FF]/30 transition flex items-center justify-center gap-1.5"
            >
              <Check size={14} />
              <span>{loading ? 'Saving...' : 'Save Game Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
