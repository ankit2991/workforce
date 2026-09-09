import React, { useState } from 'react';
import { X, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

interface SalaryAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  monthlySalary?: number;
  availableLimit?: number;
  previouslyAdvanced?: number;
}

export const SalaryAdvanceModal: React.FC<SalaryAdvanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  monthlySalary = 1500,
  availableLimit = 500,
  previouslyAdvanced = 1000,
}) => {
  const [amount, setAmount] = useState<number>(availableLimit);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const presets = [100, 200, 300, 500].filter((p) => p <= availableLimit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > availableLimit) {
      toast.error(`Please enter an amount up to MYR ${availableLimit.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/salary-advances', {
        method: 'POST',
        body: JSON.stringify({ amount, reason: 'Emergency Cash Advance' }),
      });
      toast.success(`Salary advance of MYR ${amount.toFixed(2)} approved & disbursed!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to request advance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-[430px] bg-[#0B141C] border-t sm:border border-[#172631] rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#172631]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1687FF]/15 border border-[#1687FF]/30 flex items-center justify-center text-[#1687FF]">
              <TrendingUp size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F8FA]">Salary Advance</h3>
              <p className="text-xs text-[#8493A1]">Zero fee • Instant disbursement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101B24] flex items-center justify-center text-[#8493A1] hover:text-[#F5F8FA]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Metrics summary */}
          <div className="grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-[#101B24] border border-[#172631] text-center">
            <div>
              <p className="text-[10px] text-[#8493A1]">MONTHLY SALARY</p>
              <p className="text-xs font-bold text-[#F5F8FA] mt-0.5">MYR {monthlySalary.toFixed(2)}</p>
            </div>
            <div className="border-x border-[#172631]">
              <p className="text-[10px] text-[#1687FF]">AVAILABLE LIMIT</p>
              <p className="text-xs font-bold text-[#1687FF] mt-0.5">MYR {availableLimit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[#8493A1]">ADVANCED</p>
              <p className="text-xs font-bold text-[#FF455B] mt-0.5">MYR {previouslyAdvanced.toFixed(2)}</p>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-2">
              Select or Enter Amount
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-base font-bold text-[#8493A1]">MYR</span>
              <input
                type="number"
                min="10"
                max={availableLimit}
                step="10"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-13 pl-16 pr-4 rounded-xl bg-[#101B24] border border-[#172631] focus:border-[#1687FF] text-[#F5F8FA] font-bold text-lg outline-none transition-colors"
                placeholder="0.00"
                required
              />
            </div>

            {/* Presets */}
            {presets.length > 0 && (
              <div className="flex gap-2 mt-2.5 overflow-x-auto no-scrollbar">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      amount === p
                        ? 'bg-[#1687FF] text-white border-[#1687FF]'
                        : 'bg-[#101B24] text-[#8493A1] border-[#172631] hover:border-[#1687FF]/40'
                    }`}
                  >
                    MYR {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#00C982]/10 border border-[#00C982]/20 text-[#00C982] text-xs">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>Funds will be credited directly to your Main Wallet in real time.</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || availableLimit <= 0}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#075DA8] to-[#1687FF] hover:opacity-90 font-bold text-sm text-white shadow-lg shadow-[#1687FF]/25 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : `Request Advance (MYR ${amount.toFixed(2)})`}
          </button>
        </form>
      </div>
    </div>
  );
};
