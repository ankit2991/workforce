import React, { useState } from 'react';
import { X, Banknote, Building2 } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalance?: number;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  availableBalance = 1200,
}) => {
  const [amount, setAmount] = useState<number>(300);
  const [bankName, setBankName] = useState('Maybank');
  const [accountHolder, setAccountHolder] = useState('John Doe');
  const [accountNumber, setAccountNumber] = useState('514012348921');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const banks = ['Maybank', 'CIMB Bank', 'Public Bank', 'RHB Bank', 'Hong Leong Bank'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > availableBalance) {
      toast.error(`Invalid withdrawal amount (Available: MYR ${availableBalance.toFixed(2)})`);
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          amount,
          bankName,
          accountHolder,
          accountNumber,
        }),
      });
      toast.success(`Withdrawal of MYR ${amount.toFixed(2)} to ${bankName} initiated successfully!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit withdrawal');
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
            <div className="w-10 h-10 rounded-xl bg-[#00C982]/15 border border-[#00C982]/30 flex items-center justify-center text-[#00C982]">
              <Banknote size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F5F8FA]">Bank Withdrawal</h3>
              <p className="text-xs text-[#8493A1]">Direct bank transfer (DuitNow/IBG)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#101B24] flex items-center justify-center text-[#8493A1] hover:text-[#F5F8FA]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Available balance indicator */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#101B24] border border-[#172631]">
            <span className="text-xs text-[#8493A1]">Available to Withdraw</span>
            <span className="text-sm font-extrabold text-[#00C982]">MYR {availableBalance.toFixed(2)}</span>
          </div>

          {/* Amount input */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-1.5">
              Withdrawal Amount (MYR)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-base font-bold text-[#8493A1]">MYR</span>
              <input
                type="number"
                min="10"
                max={availableBalance}
                step="10"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-12 pl-16 pr-4 rounded-xl bg-[#101B24] border border-[#172631] focus:border-[#00C982] text-[#F5F8FA] font-bold text-lg outline-none transition-colors"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Bank Select */}
          <div>
            <label className="block text-xs font-medium text-[#8493A1] mb-1.5">
              Select Bank
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-[#101B24] border border-[#172631] text-sm text-[#F5F8FA] outline-none"
            >
              {banks.map((b) => (
                <option key={b} value={b} className="bg-[#101B24] text-[#F5F8FA]">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Account Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8493A1] mb-1.5">
                Account Holder
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#101B24] border border-[#172631] text-xs text-[#F5F8FA] outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8493A1] mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#101B24] border border-[#172631] text-xs text-[#F5F8FA] outline-none"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || availableBalance <= 0}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#075DA8] to-[#1687FF] hover:opacity-90 font-bold text-sm text-white shadow-lg shadow-[#1687FF]/25 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Submitting...' : `Withdraw MYR ${amount.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
};
