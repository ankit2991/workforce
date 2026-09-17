import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@workforce.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter admin credentials');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      // Set admin session
      localStorage.setItem('workpay_admin_token', 'admin_secure_jwt_' + Date.now());
      localStorage.setItem(
        'workpay_admin_user',
        JSON.stringify({
          email,
          name: 'HR & System Administrator',
          role: 'SUPER_ADMIN',
        })
      );
      toast.success('Admin authentication successful! Access granted.');
      setLoading(false);
      navigate('/admin');
    }, 400);
  };

  const handleQuickAdminDemo = () => {
    localStorage.setItem('workpay_admin_token', 'admin_demo_token_active');
    localStorage.setItem(
      'workpay_admin_user',
      JSON.stringify({
        email: 'admin@workforce.com',
        name: 'HR & System Administrator',
        role: 'SUPER_ADMIN',
      })
    );
    toast.success('Logged in as System Administrator!');
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-[#050B10] flex items-center justify-center p-4 selection:bg-[#1687FF]/30">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#1687FF]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#7B22FF]/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#8493A1] hover:text-white transition"
        >
          <ArrowLeft size={14} /> Back to Employee Mobile View
        </button>

        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1687FF] to-[#7B22FF] mx-auto flex items-center justify-center text-white shadow-xl shadow-[#1687FF]/25 border border-white/10">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Admin Console</h1>
          <p className="text-xs text-[#8493A1]">
            Authorized personnel only • HR, Payroll, Games & Shop Management
          </p>
        </div>

        {/* Login Form Box */}
        <div className="p-7 rounded-[24px] bg-[#101B24] border border-[#172631] shadow-2xl space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8493A1] mb-1.5">
                Administrator Email / Username
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3.5 text-[#8493A1]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@workforce.com"
                  className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#1687FF] rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8493A1] mb-1.5">
                Security Passcode / Password
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[#8493A1]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#1687FF] rounded-xl py-3 pl-10 pr-4 text-xs font-medium text-white outline-none transition"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-[#0B141C] rounded-xl border border-[#172631] text-[11px] text-[#8493A1] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-[#00C982]" />
                Pre-configured Admin Credentials
              </span>
              <span className="text-white font-mono font-bold">admin123</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-xs shadow-lg shadow-[#1687FF]/25 hover:opacity-95 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Admin Panel'}
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Quick Demo Shortcut */}
          <div className="pt-4 border-t border-[#172631]">
            <button
              type="button"
              onClick={handleQuickAdminDemo}
              className="w-full py-3 rounded-xl bg-[#0B141C] hover:bg-[#172631]/80 border border-[#172631] text-xs font-bold text-white transition flex items-center justify-center gap-2 shadow-sm"
            >
              <KeyRound size={15} className="text-[#1687FF]" />
              1-Click Instant Admin Demo Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
