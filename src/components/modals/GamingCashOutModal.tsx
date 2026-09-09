import React, { useState } from 'react';
import { X, ArrowDownRight, Wallet, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

interface GamingCashOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  gamingWalletBalance?: number;
}

export const GamingCashOutModal: React.FC<GamingCashOutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  gamingWalletBalance = 0,
}) => {
  const [amount, setAmount] = useState<number>(Math.min(50, gamingWalletBalance));
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const presets = [10, 25, 50, 100, 250];

  const handleCashOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > gamingWalletBalance) {
      toast.error(`Invalid amount (Available Gaming Balance: MYR ${gamingWalletBalance.toFixed(2)})`);
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/gaming-wallet/cash-out', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      });
      toast.success(`MYR ${amount.toFixed(2)} cashed out to Main Wallet!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Cash out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] bg-[#0B141C] border-t sm:border border-[#172631] rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#172631]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00C982] to-[#00E599] flex items-center justify-center text-black shadow-lg shadow-[#00C982]/30">
              <ArrowDownRight size={22} className="font-black" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F8FA]">Cash Out Winnings</h3>
              <p className="text-xs text-[#8493A1]">Transfer directly back to Main Wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101B24] flex items-center justify-center text-[#8493A1] hover:text-[#F5F8FA]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCashOut} className="mt-5 space-y-4">
          {/* Source Gaming Balance */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-2">
              Transfer From
            </label>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#101B24] border border-[#7B22FF]/50 ring-1 ring-[#7B22FF]/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#7B22FF]/20 flex items-center justify-center text-[#7B22FF]">
                  <Wallet size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#F5F8FA]">Gaming Wallet</p>
                  <p className="text-[10px] text-[#A83DF4] font-semibold">
                    Current Balance: MYR {gamingWalletBalance.toFixed(2)}
                  </p>
                </div>
              </div>
              <CheckCircle2 size={18} className="text-[#00C982]" />
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-[#8493A1]">
                Cash Out Amount
              </label>
              <button
                type="button"
                onClick={() => setAmount(gamingWalletBalance)}
                className="text-[11px] font-bold text-[#00C982] hover:underline"
              >
                Cash Out All (MYR {gamingWalletBalance.toFixed(2)})
              </button>
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-base font-bold text-[#8493A1]">MYR</span>
              <input
                type="number"
                min="1"
                max={gamingWalletBalance}
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-[#101B24] border border-[#172631] focus:border-[#00C982] rounded-xl py-3.5 pl-16 pr-4 text-xl font-bold text-[#F5F8FA] outline-none transition"
              />
            </div>
          </div>

          {/* Chip Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                  amount === preset
                    ? 'bg-[#00C982]/20 border-[#00C982] text-[#00C982]'
                    : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:border-[#8493A1]/40'
                }`}
              >
                +{preset}
              </button>
            ))}
          </div>

          <div className="p-3 bg-[#101B24]/70 border border-[#172631] rounded-xl text-[11px] text-[#8493A1] flex items-center gap-2">
            <span className="text-[#00C982] font-bold">✓ 0% Fee</span>
            <span>• Cashed out funds are instantly spendable in Shop or bank withdrawable.</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || gamingWalletBalance <= 0 || amount <= 0 || amount > gamingWalletBalance}
            className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#00C982] to-[#00E599] text-black font-bold text-sm shadow-lg shadow-[#00C982]/20 hover:opacity-95 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing Transfer...' : `Confirm Cash Out (MYR ${(amount || 0).toFixed(2)})`}
          </button>
        </form>
      </div>
    </div>
  );
};
