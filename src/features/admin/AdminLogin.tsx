import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/apiClient';

interface AdminLoginResponse {
  accessToken: string;
  user: { id: string; email: string; role: 'ADMIN' | 'SUPER_ADMIN' };
}

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const session = await apiRequest<AdminLoginResponse>('/auth/admin/login', {
        method: 'POST', body: JSON.stringify({ email: email.trim(), password }),
      }, { fallback: false, timeoutMs: 10000 });
      if (!session?.accessToken || !['ADMIN', 'SUPER_ADMIN'].includes(session.user?.role)) {
        throw new Error('Server did not return an authorized admin session');
      }
      localStorage.setItem('workpay_admin_token', session.accessToken);
      localStorage.setItem('workpay_admin_user', JSON.stringify(session.user));
      setPassword('');
      toast.success('Administrator authenticated');
      navigate('/admin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Admin sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050B10] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-xs text-[#8493A1] hover:text-white"><ArrowLeft size={14}/> Back to Employee View</button>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1687FF] to-[#7B22FF] flex items-center justify-center text-white"><Shield size={32}/></div>
          <h1 className="text-2xl font-black text-white">Admin Console</h1>
          <p className="text-xs text-[#8493A1]">Log in with the administrator account provisioned on the backend.</p>
        </div>
        <form onSubmit={handleLogin} className="p-7 rounded-[24px] bg-[#101B24] border border-[#172631] space-y-5">
          <label className="block text-xs font-bold text-[#8493A1]">Administrator Email
            <div className="relative mt-2"><Mail size={16} className="absolute top-3.5 left-3 text-[#8493A1]"/>
              <input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required className="w-full rounded-xl py-3 pl-10 pr-4 bg-[#0B141C] border border-[#172631] text-white outline-none focus:border-[#1687FF]"/>
            </div>
          </label>
          <label className="block text-xs font-bold text-[#8493A1]">Password
            <div className="relative mt-2"><Lock size={16} className="absolute top-3.5 left-3 text-[#8493A1]"/>
              <input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full rounded-xl py-3 pl-10 pr-4 bg-[#0B141C] border border-[#172631] text-white outline-none focus:border-[#1687FF]"/>
            </div>
          </label>
          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-xs flex gap-2 justify-center items-center disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={15}/>
          </button>
        </form>
      </div>
    </div>
  );
};
