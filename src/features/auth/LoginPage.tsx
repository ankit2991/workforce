import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, KeyRound, ShieldCheck, ArrowRight, Wallet, Sparkles } from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('+60123456789');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile) {
      toast.error('Please enter mobile number');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile }),
      });
      toast.success('OTP sent! Use demo code: 123456');
      setStep('OTP');
      setOtp('123456'); // Pre-fill for convenience
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error('Please enter OTP');
      return;
    }
    setLoading(true);
    try {
      const data: any = await apiRequest('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ mobile, otp }),
      });
      if (data && data.accessToken) {
        localStorage.setItem('workpay_token', data.accessToken);
      }
      toast.success('Login successful! Welcome back.');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = (role: 'EMPLOYEE' | 'ADMIN') => {
    localStorage.setItem('workpay_token', 'demo_jwt_token');
    toast.success(`Logged in as ${role === 'ADMIN' ? 'HR Admin' : 'John Doe (EMP001)'}!`);
    if (role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#050B10] flex items-center justify-center p-4">
      <div className="w-full max-w-[430px] space-y-6">
        {/* Brand Logo & Intro */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#1687FF] via-[#389AFF] to-[#7B22FF] mx-auto flex items-center justify-center shadow-xl shadow-[#1687FF]/25 border border-white/20">
            <Wallet size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Workforce Wallet</h2>
          <p className="text-xs text-[#8493A1]">
            Earned wage access, gaming rewards & marketplace
          </p>
        </div>

        {/* Card Form */}
        <div className="p-6 rounded-[28px] bg-[#101B24] border border-[#172631] shadow-2xl space-y-5">
          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8493A1] mb-2">
                  Mobile Phone Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs font-bold text-[#8493A1]">
                    🇲🇾 +60
                  </span>
                  <input
                    type="tel"
                    value={mobile.replace('+60', '')}
                    onChange={(e) => setMobile(`+60${e.target.value}`)}
                    placeholder="123456789"
                    className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#1687FF] rounded-xl py-3 pl-20 pr-4 text-sm font-bold text-white outline-none transition"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#0B141C] rounded-xl border border-[#172631] text-[11px] text-[#8493A1] flex items-center justify-between">
                <span>Demo Employee: +60 12-345 6789</span>
                <span className="text-[#00C982] font-bold">OTP: 123456</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-sm shadow-lg shadow-[#1687FF]/20 hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                {loading ? 'Sending OTP...' : 'Send Verification Code'}{' '}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-[#8493A1]">
                    Enter 6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('PHONE')}
                    className="text-[11px] text-[#1687FF] hover:underline"
                  >
                    Change Phone
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#1687FF] rounded-xl py-3 px-4 text-center tracking-widest text-xl font-black text-white outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00C982] to-[#00E599] text-black font-black text-sm shadow-lg shadow-[#00C982]/20 hover:opacity-95 active:scale-[0.98] transition"
              >
                {loading ? 'Verifying...' : 'Verify & Enter Wallet'}
              </button>
            </form>
          )}

          {/* Quick Demo Shortcuts */}
          <div className="pt-4 border-t border-[#172631] space-y-2">
            <span className="block text-center text-[10px] uppercase font-bold text-[#8493A1]">
              Or 1-Click Instant Demo Login
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickLoginAs('EMPLOYEE')}
                className="py-2.5 px-2 rounded-xl bg-[#0B141C] border border-[#172631] text-xs font-bold text-white hover:border-[#1687FF]/50 transition"
              >
                👤 Employee
              </button>
              <button
                type="button"
                onClick={() => quickLoginAs('ADMIN')}
                className="py-2.5 px-2 rounded-xl bg-[#0B141C] border border-[#172631] text-xs font-bold text-white hover:border-[#7B22FF]/50 transition"
              >
                🛡️ HR Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
