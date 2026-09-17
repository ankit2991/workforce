import React, { useState } from 'react';
import { X, Gamepad2, Wallet, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

interface GamingTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mainWalletBalance?: number;
}

export const GamingTopUpModal: React.FC<GamingTopUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mainWalletBalance = 1200,
}) => {
  const [amount, setAmount] = useState<number>(50);
  const [source, setSource] = useState<'main_wallet' | 'razorpay'>('main_wallet');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const presets = [10, 20, 50, 100, 500];

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (source === 'main_wallet' && amount > mainWalletBalance) {
      toast.error(`Invalid amount (Available in Main Wallet: MYR ${mainWalletBalance.toFixed(2)})`);
      return;
    }

    setLoading(true);
    try {
      if (source === 'razorpay') {
        // Direct Razorpay gateway deposit
        await apiRequest('/wallet/add-money', {
          method: 'POST',
          body: JSON.stringify({ amount, paymentMethod: 'RAZORPAY_GAMING' }),
        });
        await apiRequest('/gaming-wallet/top-up', {
          method: 'POST',
          body: JSON.stringify({ amount, source: 'razorpay' }),
        });
        toast.success(`MYR ${amount.toFixed(2)} added to Gaming Wallet via Razorpay!`);
      } else {
        await apiRequest('/gaming-wallet/top-up', {
          method: 'POST',
          body: JSON.stringify({ amount, source: 'main_wallet' }),
        });
        toast.success(`MYR ${amount.toFixed(2)} transferred from Main Wallet!`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Top up failed');
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7B22FF] to-[#A83DF4] flex items-center justify-center text-white shadow-lg shadow-[#7B22FF]/30">
              <Gamepad2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F8FA]">Top Up Gaming Wallet</h3>
              <p className="text-xs text-[#8493A1]">Load chips instantly to play</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101B24] flex items-center justify-center text-[#8493A1] hover:text-[#F5F8FA]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleTopUp} className="mt-5 space-y-4">
          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-2">
              Payment Source
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSource('main_wallet')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  source === 'main_wallet'
                    ? 'bg-[#101B24] border-[#1687FF] ring-1 ring-[#1687FF]/40'
                    : 'bg-[#101B24]/60 border-[#172631] hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Wallet size={16} className={source === 'main_wallet' ? 'text-[#1687FF]' : 'text-[#8493A1]'} />
                  {source === 'main_wallet' && <CheckCircle2 size={14} className="text-[#1687FF]" />}
                </div>
                <p className="text-xs font-bold text-white">Main Wallet</p>
                <p className="text-[10px] text-[#00C982]">MYR {mainWalletBalance.toFixed(2)}</p>
              </button>

              <button
                type="button"
                onClick={() => setSource('razorpay')}
                className={`p-3 rounded-xl text-left border transition-all ${
                  source === 'razorpay'
                    ? 'bg-[#101B24] border-[#3395FF] ring-1 ring-[#3395FF]/40'
                    : 'bg-[#101B24]/60 border-[#172631] hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="px-1.5 py-0.5 rounded bg-[#0C2340] border border-[#3395FF]/30 text-[9px] font-black text-[#3395FF]">
                    RZP
                  </div>
                  {source === 'razorpay' && <CheckCircle2 size={14} className="text-[#3395FF]" />}
                </div>
                <p className="text-xs font-bold text-white">Razorpay</p>
                <p className="text-[10px] text-[#3395FF]">UPI / NetBanking</p>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-2">
              Select or Enter Top Up Amount
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-base font-bold text-[#8493A1]">MYR</span>
              <input
                type="number"
                min="5"
                max={source === 'main_wallet' ? mainWalletBalance : 10000}
                step="5"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-12 pl-16 pr-4 rounded-xl bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] text-[#F5F8FA] font-bold text-lg outline-none transition-colors"
                placeholder="0.00"
                required
              />
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-2 mt-2.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    amount === p
                      ? 'bg-[#7B22FF] text-white border-[#7B22FF] shadow-sm shadow-[#7B22FF]/40 scale-105'
                      : 'bg-[#101B24] text-[#8493A1] border-[#172631] hover:border-[#7B22FF]/50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading || (source === 'main_wallet' && mainWalletBalance < amount)}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#7B22FF] to-[#A83DF4] hover:opacity-90 font-bold text-sm text-white shadow-lg shadow-[#7B22FF]/30 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Processing Top Up...'
              : source === 'razorpay'
              ? `Pay MYR ${amount.toFixed(2)} via Razorpay`
              : `Continue • Top Up MYR ${amount.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
};
