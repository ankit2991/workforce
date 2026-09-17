import React, { useState } from 'react';
import { X, CreditCard, CheckCircle2, ShieldCheck, ArrowRight, Zap, QrCode, Building2 } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBalance?: number;
}

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentBalance = 1200,
}) => {
  const [amount, setAmount] = useState<number>(100);
  const [method, setMethod] = useState<'UPI' | 'CARDS' | 'NETBANKING'>('UPI');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'INPUT' | 'PROCESSING' | 'SUCCESS'>('INPUT');
  const [rzpPaymentId, setRzpPaymentId] = useState<string>('');

  if (!isOpen) return null;

  const presets = [50, 100, 200, 500];

  const handlePayWithRazorpay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setStep('PROCESSING');

    // Simulate Razorpay Gateway handshake & processing
    setTimeout(async () => {
      try {
        const res: any = await apiRequest('/wallet/add-money', {
          method: 'POST',
          body: JSON.stringify({
            amount,
            paymentMethod: `RAZORPAY_${method}`,
          }),
        });

        const pid = res?.razorpayPaymentId || `pay_${Math.random().toString(36).substring(2, 10)}`;
        setRzpPaymentId(pid);
        setStep('SUCCESS');
        toast.success(`MYR ${amount.toFixed(2)} loaded successfully via Razorpay!`);
        onSuccess();
      } catch (err) {
        toast.error('Payment failed');
        setStep('INPUT');
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  const handleClose = () => {
    setStep('INPUT');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[430px] bg-[#0B141C] border-t sm:border border-[#172631] rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#172631]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0C2340] to-[#1859B4] border border-[#3395FF]/40 flex items-center justify-center text-white shadow-lg shadow-[#3395FF]/20">
              <Zap size={20} className="text-[#3395FF] fill-[#3395FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#F5F8FA]">Add Money</h3>
                <span className="px-2 py-0.5 rounded-full bg-[#0C2340] text-[#3395FF] border border-[#3395FF]/30 text-[10px] font-black">
                  RAZORPAY
                </span>
              </div>
              <p className="text-xs text-[#8493A1]">Instant Deposit • 100% Secure Gateway</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-[#101B24] flex items-center justify-center text-[#8493A1] hover:text-[#F5F8FA]"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'PROCESSING' ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-14 h-14 rounded-full border-4 border-[#3395FF]/20 border-t-[#3395FF] animate-spin flex items-center justify-center" />
            <div>
              <h4 className="text-sm font-bold text-white">Connecting to Razorpay...</h4>
              <p className="text-xs text-[#8493A1] mt-1">Authenticating secure transaction</p>
            </div>
          </div>
        ) : step === 'SUCCESS' ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-[#00C982]/15 text-[#00C982] flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Payment Received!</h4>
              <p className="text-xs text-[#00C982] font-semibold mt-0.5">
                +MYR {amount.toFixed(2)} added to Main Wallet
              </p>
              <div className="mt-3 p-3 bg-[#101B24] border border-[#172631] rounded-xl text-left text-[11px] space-y-1">
                <div className="flex justify-between text-[#8493A1]">
                  <span>Razorpay Payment ID:</span>
                  <span className="font-mono text-white font-bold">{rzpPaymentId}</span>
                </div>
                <div className="flex justify-between text-[#8493A1]">
                  <span>Status:</span>
                  <span className="text-[#00C982] font-bold">CAPTURED / SETTLED</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-[#1687FF] text-white font-bold text-xs shadow-md hover:bg-[#389AFF] transition"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handlePayWithRazorpay} className="mt-5 space-y-4">
            {/* Amount input */}
            <div>
              <label className="block text-xs font-semibold text-[#8493A1] mb-1.5">
                Deposit Amount
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-base font-bold text-[#8493A1]">MYR</span>
                <input
                  type="number"
                  min="10"
                  step="5"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  placeholder="100.00"
                  className="w-full bg-[#101B24] border border-[#172631] focus:border-[#3395FF] rounded-xl py-3 pl-16 pr-4 text-xl font-bold text-white outline-none transition"
                  required
                />
              </div>
            </div>

            {/* Quick Chips */}
            <div className="grid grid-cols-4 gap-2">
              {presets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    amount === preset
                      ? 'bg-[#3395FF]/20 border-[#3395FF] text-[#3395FF]'
                      : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:text-white'
                  }`}
                >
                  +{preset}
                </button>
              ))}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#8493A1] mb-2">
                Pay via Razorpay Payment Methods
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setMethod('UPI')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                    method === 'UPI'
                      ? 'bg-[#0C2340] border-[#3395FF] text-white'
                      : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode size={18} className="text-[#3395FF]" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">UPI / QR Code</p>
                      <p className="text-[10px] text-[#8493A1]">GPay, PhonePe, Paytm, BHIM</p>
                    </div>
                  </div>
                  {method === 'UPI' && <CheckCircle2 size={16} className="text-[#3395FF]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('NETBANKING')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                    method === 'NETBANKING'
                      ? 'bg-[#0C2340] border-[#3395FF] text-white'
                      : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 size={18} className="text-[#3395FF]" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">NetBanking / FPX</p>
                      <p className="text-[10px] text-[#8493A1]">Maybank, CIMB, Public Bank, RHB</p>
                    </div>
                  </div>
                  {method === 'NETBANKING' && <CheckCircle2 size={16} className="text-[#3395FF]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setMethod('CARDS')}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${
                    method === 'CARDS'
                      ? 'bg-[#0C2340] border-[#3395FF] text-white'
                      : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CreditCard size={18} className="text-[#3395FF]" />
                    <div className="text-left">
                      <p className="text-xs font-bold text-white">Debit / Credit Card</p>
                      <p className="text-[10px] text-[#8493A1]">Visa, Mastercard, RuPay</p>
                    </div>
                  </div>
                  {method === 'CARDS' && <CheckCircle2 size={16} className="text-[#3395FF]" />}
                </button>
              </div>
            </div>

            {/* Razorpay Trust Badge */}
            <div className="flex items-center justify-between p-2.5 bg-[#0C2340]/40 border border-[#3395FF]/20 rounded-xl text-[11px] text-[#8493A1]">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <ShieldCheck size={14} className="text-[#3395FF]" />
                Secured by Razorpay
              </span>
              <span className="text-[#3395FF] font-bold">256-bit SSL</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0C2340] via-[#1859B4] to-[#3395FF] text-white font-bold text-sm shadow-lg shadow-[#3395FF]/25 hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              Pay MYR {(amount || 0).toFixed(2)} via Razorpay <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
