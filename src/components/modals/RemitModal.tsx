import React, { useState } from 'react';
import { X, Send, ArrowRightLeft, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface RemitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  availableBalance?: number;
}

export const RemitModal: React.FC<RemitModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableBalance = 1200,
}) => {
  const [country, setCountry] = useState('Indonesia');
  const [amount, setAmount] = useState(200);
  const [receiver, setReceiver] = useState('Siti Nurhaliza');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const rates: Record<string, { currency: string; rate: number; fee: number; flag: string }> = {
    Indonesia: { currency: 'IDR', rate: 3550.0, fee: 8.0, flag: '🇮🇩' },
    Philippines: { currency: 'PHP', rate: 12.8, fee: 10.0, flag: '🇵🇭' },
    Nepal: { currency: 'NPR', rate: 29.6, fee: 10.0, flag: '🇳🇵' },
    Bangladesh: { currency: 'BDT', rate: 26.4, fee: 10.0, flag: '🇧🇩' },
    India: { currency: 'INR', rate: 19.1, fee: 8.0, flag: '🇮🇳' },
  };

  const currentCountry = rates[country];
  const receivedAmount = (amount * currentCountry.rate).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount + currentCountry.fee > availableBalance) {
      toast.error('Total amount with fee exceeds available balance');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(
        `Remittance of MYR ${amount.toFixed(2)} (${currentCountry.currency} ${receivedAmount}) sent to ${receiver}!`
      );
      onSuccess?.();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] bg-[#0B141C] border-t sm:border border-[#172631] rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#172631]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1687FF]/15 border border-[#1687FF]/30 flex items-center justify-center text-[#1687FF]">
              <Send size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F8FA]">Send Remittance</h3>
              <p className="text-xs text-[#8493A1]">Low fee global money transfer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101B24] flex items-center justify-center text-[#8493A1] hover:text-[#F5F8FA]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Destination Country */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-1.5">
              Destination Country
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#101B24] border border-[#172631] text-sm text-[#F5F8FA] outline-none"
            >
              {Object.entries(rates).map(([c, data]) => (
                <option key={c} value={c} className="bg-[#101B24]">
                  {data.flag} {c} ({data.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Receiver */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-1.5">
              Beneficiary Name
            </label>
            <input
              type="text"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#101B24] border border-[#172631] text-xs text-[#F5F8FA] outline-none"
              required
            />
          </div>

          {/* Amount In MYR */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-1.5">
              You Send (MYR)
            </label>
            <input
              type="number"
              min="20"
              max={availableBalance - currentCountry.fee}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl bg-[#101B24] border border-[#172631] text-sm font-bold text-[#F5F8FA] outline-none"
              required
            />
          </div>

          {/* Real-time Calculation Summary */}
          <div className="p-3.5 rounded-xl bg-[#101B24] border border-[#172631] space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-[#8493A1]">Exchange Rate</span>
              <span className="text-[#F5F8FA] font-medium">
                1 MYR = {currentCountry.rate} {currentCountry.currency}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#8493A1]">Transfer Fee</span>
              <span className="text-[#F5F8FA] font-medium">MYR {currentCountry.fee.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-[#172631] flex justify-between items-center">
              <span className="text-xs font-semibold text-[#8493A1]">Receiver Gets</span>
              <span className="text-base font-extrabold text-[#00C982]">
                {receivedAmount} {currentCountry.currency}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#075DA8] to-[#1687FF] hover:opacity-90 font-bold text-sm text-white shadow-lg shadow-[#1687FF]/25 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Processing Transfer...' : `Confirm & Send (MYR ${(amount + currentCountry.fee).toFixed(2)})`}
          </button>
        </form>
      </div>
    </div>
  );
};
