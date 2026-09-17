import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  ShoppingBag,
  CreditCard,
  Plus,
  Trash2,
  LogOut,
  Smartphone,
  Shield,
  Search,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Send,
  X,
  CheckCircle2,
  Flame,
  Sparkles,
  ExternalLink,
  Package,
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import type { Game, Product, User } from '../../types';
import { toast } from 'sonner';

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'USERS' | 'GAMES' | 'SHOP' | 'PAYROLL'>('OVERVIEW');

  // Games & Products state
  const [games, setGames] = useState<Game[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showCreditWalletModal, setShowCreditWalletModal] = useState(false);

  // Add Game Form state
  const [newGame, setNewGame] = useState({
    name: '',
    category: 'Slots',
    provider: 'WorkPlay Originals',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
    minBet: 1.0,
    maxBet: 500.0,
    status: 'HOT',
    isFeatured: true,
  });

  // Add Product Form state
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Vouchers',
    price: 50.0,
    stock: 100,
    image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
    description: 'Workforce exclusive discount voucher',
    isFeatured: true,
  });

  // Credit Wallet Form state
  const [creditAmount, setCreditAmount] = useState<number>(250);
  const [creditMemo, setCreditMemo] = useState('Quarterly Performance Bonus');
  const [disbursalGateway, setDisbursalGateway] = useState<'RAZORPAY' | 'INTERNAL'>('RAZORPAY');

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('Overtime Stipend Disbursed');
  const [broadcastMsg, setBroadcastMsg] = useState('All active warehouse staff have received an extra overtime stipend.');

  // Advances & Withdrawals sample queues
  const [advances, setAdvances] = useState([
    { id: 'adv-1', employee: 'John Doe (EMP001)', amount: 500.0, time: 'Today, 10:15 AM', status: 'APPROVED' },
    { id: 'adv-2', employee: 'Ahmad Faiz (EMP002)', amount: 350.0, time: 'Today, 11:30 AM', status: 'PENDING' },
    { id: 'adv-3', employee: 'Sarah Wong (EMP004)', amount: 400.0, time: 'Today, 01:20 PM', status: 'PENDING' },
  ]);

  const [withdrawals, setWithdrawals] = useState([
    { id: 'wdr-1', employee: 'John Doe (EMP001)', bank: 'Maybank Berhad (*4821)', amount: 300.0, time: 'Today, 02:30 PM', status: 'COMPLETED' },
    { id: 'wdr-2', employee: 'Ravi Kumar (EMP003)', bank: 'CIMB Bank (*8319)', amount: 250.0, time: 'Today, 03:45 PM', status: 'PENDING' },
  ]);

  const fetchItems = async () => {
    try {
      const [gRes, pRes]: any = await Promise.all([
        apiRequest('/games'),
        apiRequest('/products'),
      ]);
      if (gRes) setGames(gRes);
      if (pRes) setProducts(pRes);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Check admin authentication
    const token = localStorage.getItem('workpay_admin_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }
    fetchItems();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('workpay_admin_token');
    localStorage.removeItem('workpay_admin_user');
    toast.success('Admin session ended. Logged out.');
    navigate('/admin/login');
  };

  // Add Game handler
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGame.name) {
      toast.error('Please enter game name');
      return;
    }
    setLoading(true);
    try {
      const created: any = await apiRequest('/games', {
        method: 'POST',
        body: JSON.stringify(newGame),
      });
      toast.success(`Game "${newGame.name}" added successfully! Visible to users in Gaming Hub.`);
      setShowAddGameModal(false);
      setNewGame({
        name: '',
        category: 'Slots',
        provider: 'WorkPlay Originals',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
        minBet: 1.0,
        maxBet: 500.0,
        status: 'HOT',
        isFeatured: true,
      });
      fetchItems();
    } catch (err) {
      toast.error('Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  // Delete Game handler
  const handleDeleteGame = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete game "${name}"?`)) return;
    try {
      await apiRequest(`/games/${id}`, { method: 'DELETE' });
      toast.success(`Game "${name}" removed`);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete game');
    }
  };

  // Add Product handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) {
      toast.error('Please enter product name and price');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(newProduct),
      });
      toast.success(`Product "${newProduct.name}" added! Visible to users in Company Shop.`);
      setShowAddProductModal(false);
      setNewProduct({
        name: '',
        category: 'Vouchers',
        price: 50.0,
        stock: 100,
        image: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400',
        description: 'Workforce exclusive discount voucher',
        isFeatured: true,
      });
      fetchItems();
    } catch (err) {
      toast.error('Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  // Delete Product handler
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      await apiRequest(`/products/${id}`, { method: 'DELETE' });
      toast.success(`Product "${name}" removed`);
      fetchItems();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  // Credit Wallet handler
  const handleCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/credit-wallet', {
        method: 'POST',
        body: JSON.stringify({
          employeeCode: 'EMP001',
          amount: creditAmount,
          reason: creditMemo,
          gateway: disbursalGateway,
        }),
      });
      const rzpRef = `pout_rzp_${Math.random().toString(36).substring(2, 9)}`;
      toast.success(
        disbursalGateway === 'RAZORPAY'
          ? `Disbursed MYR ${creditAmount.toFixed(2)} to John Doe via Razorpay Payout (ID: ${rzpRef})!`
          : `Disbursed MYR ${creditAmount.toFixed(2)} to John Doe (EMP001)!`
      );
      setShowCreditWalletModal(false);
    } catch (err) {
      toast.error('Credit failed');
    }
  };

  // Broadcast announcement handler
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMsg }),
      });
      toast.success('Announcement broadcast pushed to all workforce mobile apps!');
    } catch (err) {
      toast.error('Broadcast failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#050B10] text-[#F5F8FA] flex flex-col selection:bg-[#1687FF]/30">
      {/* 1. FIXED TOP HEADER */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#081017]/95 border-b border-[#172631] backdrop-blur-md z-40 px-6 flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1687FF] to-[#7B22FF] flex items-center justify-center text-white shadow-lg shadow-[#1687FF]/25">
            <Shield size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">WorkPay</span>
              <span className="px-2 py-0.5 rounded-md bg-[#1687FF]/20 text-[#1687FF] text-[10px] font-black border border-[#1687FF]/30 uppercase tracking-wide">
                Admin Console
              </span>
            </div>
            <p className="text-[11px] text-[#8493A1]">MongoDB Enterprise Architecture</p>
          </div>
        </div>

        {/* Right: Quick Actions & Profile */}
        <div className="flex items-center gap-3">
          {/* Switch to User App */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#101B24] border border-[#172631] hover:border-[#1687FF] text-xs font-semibold text-white transition shadow-sm"
          >
            <Smartphone size={14} className="text-[#1687FF]" />
            <span className="hidden sm:inline">View User App</span>
          </button>

          {/* Admin User Badge */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0B141C] border border-[#172631]">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00C982] to-[#1687FF] flex items-center justify-center text-black font-black text-xs">
              AD
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-tight">Super Admin</p>
              <p className="text-[10px] text-[#00C982] font-semibold">Active Session</p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-[#101B24] hover:bg-[#FF455B]/15 border border-[#172631] hover:border-[#FF455B]/40 text-[#8493A1] hover:text-[#FF455B] transition"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex pt-16">
        {/* 2. FIXED LEFT SIDEBAR */}
        <aside className="w-64 fixed left-0 top-16 bottom-0 bg-[#081017] border-r border-[#172631] p-4 flex flex-col justify-between z-30 overflow-y-auto">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold text-[#536270] uppercase tracking-wider">
              Management Modules
            </div>

            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'OVERVIEW'
                  ? 'bg-[#1687FF] text-white shadow-md shadow-[#1687FF]/20'
                  : 'text-[#8493A1] hover:text-white hover:bg-[#101B24]'
              }`}
            >
              <LayoutDashboard size={17} />
              <span>Dashboard & KPIs</span>
            </button>

            <button
              onClick={() => setActiveTab('USERS')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'USERS'
                  ? 'bg-[#1687FF] text-white shadow-md shadow-[#1687FF]/20'
                  : 'text-[#8493A1] hover:text-white hover:bg-[#101B24]'
              }`}
            >
              <Users size={17} />
              <span>Workforce Users</span>
            </button>

            <button
              onClick={() => setActiveTab('GAMES')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'GAMES'
                  ? 'bg-[#7B22FF] text-white shadow-md shadow-[#7B22FF]/25'
                  : 'text-[#8493A1] hover:text-white hover:bg-[#101B24]'
              }`}
            >
              <Gamepad2 size={17} />
              <div className="flex items-center justify-between flex-1">
                <span>Games Catalog</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-bold">
                  {games.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('SHOP')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'SHOP'
                  ? 'bg-[#1687FF] text-white shadow-md shadow-[#1687FF]/20'
                  : 'text-[#8493A1] hover:text-white hover:bg-[#101B24]'
              }`}
            >
              <ShoppingBag size={17} />
              <div className="flex items-center justify-between flex-1">
                <span>Shop Products</span>
                <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-bold">
                  {products.length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('PAYROLL')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'PAYROLL'
                  ? 'bg-[#1687FF] text-white shadow-md shadow-[#1687FF]/20'
                  : 'text-[#8493A1] hover:text-white hover:bg-[#101B24]'
              }`}
            >
              <CreditCard size={17} />
              <span>Payroll & Advances</span>
            </button>
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3 rounded-xl bg-[#0B141C] border border-[#172631] text-[11px] text-[#8493A1] space-y-1">
            <div className="flex items-center justify-between text-white font-semibold">
              <span>Database</span>
              <span className="text-[#00C982] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C982] animate-pulse" />
                MongoDB
              </span>
            </div>
            <p className="text-[10px]">Port: 27017 • workforce_wallet</p>
          </div>
        </aside>

        {/* 3. MAIN CONTENT VIEWPORT */}
        <main className="ml-64 flex-1 p-6 sm:p-8 min-h-[calc(100vh-64px)] space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Header Info */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">System & Workforce Overview</h2>
                  <p className="text-xs text-[#8493A1]">Real-time operational metrics & quick disburse controls</p>
                </div>
                <button
                  onClick={() => setShowCreditWalletModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00C982] to-[#00E599] text-black font-black text-xs shadow-md shadow-[#00C982]/20 hover:opacity-95 transition flex items-center gap-1.5"
                >
                  <DollarSign size={15} /> Credit Employee Stipend
                </button>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#101B24] border border-[#172631] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#8493A1]">Total Workforce</span>
                    <Users size={16} className="text-[#1687FF]" />
                  </div>
                  <p className="text-2xl font-black text-white">128</p>
                  <span className="text-[11px] text-[#00C982] font-semibold">100% active enrolled</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#101B24] border border-[#172631] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#8493A1]">Advances Disbursed</span>
                    <TrendingUp size={16} className="text-[#00C982]" />
                  </div>
                  <p className="text-2xl font-black text-[#00C982]">MYR 24,500.00</p>
                  <span className="text-[11px] text-[#8493A1]">Payroll backed • 0% bad debt</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#101B24] border border-[#172631] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#8493A1]">Active Games</span>
                    <Gamepad2 size={16} className="text-[#7B22FF]" />
                  </div>
                  <p className="text-2xl font-black text-[#A83DF4]">{games.length}</p>
                  <span className="text-[11px] text-[#00C982] font-semibold">RNG certified fair</span>
                </div>

                <div className="p-5 rounded-2xl bg-[#101B24] border border-[#172631] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#8493A1]">Shop Catalog Items</span>
                    <ShoppingBag size={16} className="text-[#F59E0B]" />
                  </div>
                  <p className="text-2xl font-black text-white">{products.length}</p>
                  <span className="text-[11px] text-[#8493A1]">Direct wallet checkout</span>
                </div>
              </div>

              {/* Broadcast Announcement & Fast Disburse Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Broadcast box */}
                <div className="p-6 rounded-2xl bg-[#101B24] border border-[#172631] space-y-4">
                  <div className="flex items-center gap-2">
                    <Send className="text-[#1687FF]" size={18} />
                    <h3 className="text-sm font-bold text-white">Broadcast Mobile Push Announcement</h3>
                  </div>
                  <p className="text-xs text-[#8493A1]">
                    Pushes instant push alerts to all workforce mobile apps in real-time.
                  </p>

                  <form onSubmit={handleBroadcast} className="space-y-3">
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="Announcement Title"
                      className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
                    />
                    <textarea
                      rows={3}
                      value={broadcastMsg}
                      onChange={(e) => setBroadcastMsg(e.target.value)}
                      placeholder="Announcement details..."
                      className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2 px-3 text-xs text-white outline-none resize-none"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-xs shadow hover:opacity-95 transition"
                    >
                      Broadcast to All Workforce Devices
                    </button>
                  </form>
                </div>

                {/* Quick Advance Requests preview */}
                <div className="p-6 rounded-2xl bg-[#101B24] border border-[#172631] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Pending Advance Requests</h3>
                    <button
                      onClick={() => setActiveTab('PAYROLL')}
                      className="text-xs text-[#1687FF] hover:underline"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {advances.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl bg-[#0B141C] border border-[#172631] flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{a.employee}</p>
                          <p className="text-[10px] text-[#8493A1]">{a.time} • MYR {a.amount.toFixed(2)}</p>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            a.status === 'APPROVED'
                              ? 'bg-[#00C982]/15 text-[#00C982]'
                              : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                          }`}
                        >
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS / EMPLOYEES */}
          {activeTab === 'USERS' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Workforce Employees</h2>
                  <p className="text-xs text-[#8493A1]">Enrolled workforce roster, salary bases & live wallet balances</p>
                </div>
                <button
                  onClick={() => setShowCreditWalletModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#1687FF] hover:bg-[#389AFF] text-white font-bold text-xs transition flex items-center gap-1.5 shadow"
                >
                  <DollarSign size={14} /> Credit Wallet Stipend
                </button>
              </div>

              {/* Employees Table */}
              <div className="rounded-2xl bg-[#101B24] border border-[#172631] overflow-hidden shadow">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B141C] text-[#8493A1] border-b border-[#172631]">
                    <tr>
                      <th className="py-3 px-4 font-bold">Employee</th>
                      <th className="py-3 px-4 font-bold">Department</th>
                      <th className="py-3 px-4 font-bold">Monthly Base</th>
                      <th className="py-3 px-4 font-bold">Wallet Balance</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#172631]">
                    <tr className="hover:bg-[#142331]/50 transition">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <img
                          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
                          alt="John Doe"
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-bold text-white">John Doe</p>
                          <span className="text-[10px] text-[#1687FF]">EMP001</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#8493A1]">Logistics & Operations</td>
                      <td className="py-3.5 px-4 font-bold text-white">MYR 1,500.00</td>
                      <td className="py-3.5 px-4 font-black text-[#00C982]">MYR 1,200.00</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#00C982]/15 text-[#00C982] text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setShowCreditWalletModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-[#1687FF]/20 text-[#1687FF] hover:bg-[#1687FF] hover:text-white font-bold transition text-[11px]"
                        >
                          Credit Stipend
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#142331]/50 transition">
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#7B22FF]/20 text-[#A83DF4] flex items-center justify-center font-bold">
                          AF
                        </div>
                        <div>
                          <p className="font-bold text-white">Ahmad Faiz</p>
                          <span className="text-[10px] text-[#1687FF]">EMP002</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#8493A1]">Distribution & Fleet</td>
                      <td className="py-3.5 px-4 font-bold text-white">MYR 1,800.00</td>
                      <td className="py-3.5 px-4 font-black text-[#00C982]">MYR 950.00</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-[#00C982]/15 text-[#00C982] text-[10px] font-bold">
                          ACTIVE
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setShowCreditWalletModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-[#1687FF]/20 text-[#1687FF] hover:bg-[#1687FF] hover:text-white font-bold transition text-[11px]"
                        >
                          Credit Stipend
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: GAMES MANAGEMENT */}
          {activeTab === 'GAMES' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Games Catalog Management</h2>
                  <p className="text-xs text-[#8493A1]">
                    Add new games or remove existing ones. Any game added here will immediately appear in the User Gaming Hub!
                  </p>
                </div>
                <button
                  onClick={() => setShowAddGameModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#7B22FF] to-[#A83DF4] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-[#7B22FF]/25"
                >
                  <Plus size={15} /> + Add New Game
                </button>
              </div>

              {/* Games Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {games.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl bg-[#101B24] border border-[#172631] hover:border-[#7B22FF]/40 overflow-hidden shadow transition flex flex-col justify-between"
                  >
                    <div className="relative aspect-[16/10] bg-[#0A131A] overflow-hidden">
                      <img
                        src={g.thumbnail}
                        alt={g.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#7B22FF] text-[9px] font-black text-white uppercase">
                        {g.status || 'HOT'}
                      </span>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[9px] font-bold text-white">
                        Min: MYR {g.minBet.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white">{g.name}</h4>
                          <p className="text-[10px] text-[#8493A1]">{g.provider} • {g.category}</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#172631] flex items-center justify-between">
                        <span className="text-[10px] text-[#00C982] font-semibold">Active in App</span>
                        <button
                          onClick={() => handleDeleteGame(g.id, g.name)}
                          className="p-1.5 rounded-lg bg-[#FF455B]/10 hover:bg-[#FF455B]/25 text-[#FF455B] transition text-xs flex items-center gap-1"
                          title="Delete Game"
                        >
                          <Trash2 size={13} />
                          <span className="text-[10px]">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SHOP PRODUCTS */}
          {activeTab === 'SHOP' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">Company Shop Products</h2>
                  <p className="text-xs text-[#8493A1]">
                    Manage inventory & catalog. Any product added here will immediately appear in the User Shop!
                  </p>
                </div>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-[#1687FF]/25"
                >
                  <Plus size={15} /> + Add New Product
                </button>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl bg-[#101B24] border border-[#172631] hover:border-[#1687FF]/40 overflow-hidden shadow transition flex flex-col justify-between"
                  >
                    <div className="relative aspect-square bg-[#0A131A] overflow-hidden">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#1687FF] text-[9px] font-black text-white uppercase">
                        {p.category}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">{p.name}</h4>
                        <p className="text-sm font-black text-[#00C982] mt-0.5">
                          MYR {p.price.toFixed(2)}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#172631] flex items-center justify-between text-xs">
                        <span className="text-[10px] text-[#8493A1]">Stock: {p.stock} units</span>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 rounded-lg bg-[#FF455B]/10 hover:bg-[#FF455B]/25 text-[#FF455B] transition text-xs flex items-center gap-1"
                          title="Delete Product"
                        >
                          <Trash2 size={13} />
                          <span className="text-[10px]">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PAYROLL & REQUESTS */}
          {activeTab === 'PAYROLL' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-black text-white">Payroll & Employee Requests</h2>
                <p className="text-xs text-[#8493A1]">Manage salary advances and bank withdrawal settlements</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Advances Queue */}
                <div className="p-6 rounded-2xl bg-[#101B24] border border-[#172631] space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Salary Advance Requests</span>
                    <span className="text-xs text-[#8493A1]">{advances.length} records</span>
                  </h3>

                  <div className="space-y-2.5">
                    {advances.map((adv) => (
                      <div
                        key={adv.id}
                        className="p-3.5 rounded-xl bg-[#0B141C] border border-[#172631] flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{adv.employee}</p>
                          <p className="text-[10px] text-[#8493A1]">{adv.time} • MYR {adv.amount.toFixed(2)}</p>
                        </div>
                        {adv.status === 'PENDING' ? (
                          <button
                            onClick={() => {
                              setAdvances((prev) =>
                                prev.map((a) => (a.id === adv.id ? { ...a, status: 'APPROVED' } : a))
                              );
                              toast.success('Advance approved and disbursed!');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#00C982] hover:bg-[#00E599] text-black font-bold text-xs"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#00C982]/15 text-[#00C982] text-[10px] font-bold">
                            Disbursed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Withdrawals Queue */}
                <div className="p-6 rounded-2xl bg-[#101B24] border border-[#172631] space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span>Bank Withdrawal Settlements</span>
                    <span className="text-xs text-[#8493A1]">{withdrawals.length} records</span>
                  </h3>

                  <div className="space-y-2.5">
                    {withdrawals.map((w) => (
                      <div
                        key={w.id}
                        className="p-3.5 rounded-xl bg-[#0B141C] border border-[#172631] flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{w.employee}</p>
                          <p className="text-[10px] text-[#8493A1]">{w.bank} • MYR {w.amount.toFixed(2)}</p>
                        </div>
                        {w.status === 'PENDING' ? (
                          <button
                            onClick={() => {
                              setWithdrawals((prev) =>
                                prev.map((item) => (item.id === w.id ? { ...item, status: 'COMPLETED' } : item))
                              );
                              toast.success('Bank payout completed!');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#1687FF] hover:bg-[#389AFF] text-white font-bold text-xs"
                          >
                            Process Payout
                          </button>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md bg-[#00C982]/15 text-[#00C982] text-[10px] font-bold">
                            Settled
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 4. MODALS */}

      {/* MODAL: ADD GAME */}
      {showAddGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0B141C] border border-[#172631] rounded-[24px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#172631]">
              <div className="flex items-center gap-2">
                <Gamepad2 size={20} className="text-[#7B22FF]" />
                <h3 className="text-base font-bold text-white">Add New Game</h3>
              </div>
              <button
                onClick={() => setShowAddGameModal(false)}
                className="w-8 h-8 rounded-full bg-[#101B24] text-[#8493A1] hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8493A1] mb-1 font-semibold">Game Title</label>
                <input
                  type="text"
                  required
                  value={newGame.name}
                  onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                  placeholder="e.g. Fortune Panda Slots"
                  className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8493A1] mb-1 font-semibold">Category</label>
                  <select
                    value={newGame.category}
                    onChange={(e) => setNewGame({ ...newGame, category: e.target.value })}
                    className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
                  >
                    <option value="Slots">Slots</option>
                    <option value="Live Casino">Live Casino</option>
                    <option value="Crash">Crash</option>
                    <option value="Arcade">Arcade</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8493A1] mb-1 font-semibold">Provider</label>
                  <input
                    type="text"
                    value={newGame.provider}
                    onChange={(e) => setNewGame({ ...newGame, provider: e.target.value })}
                    placeholder="e.g. Pragmatic Play"
                    className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8493A1] mb-1 font-semibold">Min Bet (MYR)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newGame.minBet}
                    onChange={(e) => setNewGame({ ...newGame, minBet: parseFloat(e.target.value) || 1 })}
                    className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#8493A1] mb-1 font-semibold">Max Bet (MYR)</label>
                  <input
                    type="number"
                    step="10"
                    value={newGame.maxBet}
                    onChange={(e) => setNewGame({ ...newGame, maxBet: parseFloat(e.target.value) || 500 })}
                    className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8493A1] mb-1 font-semibold">Thumbnail Image URL</label>
                <input
                  type="url"
                  value={newGame.thumbnail}
                  onChange={(e) => setNewGame({ ...newGame, thumbnail: e.target.value })}
                  className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8493A1] mb-1 font-semibold">Status Badge</label>
                  <select
                    value={newGame.status}
                    onChange={(e) => setNewGame({ ...newGame, status: e.target.value })}
                    className="w-full bg-[#101B24] border border-[#172631] focus:border-[#7B22FF] rounded-xl py-2.5 px-3 text-white outline-none"
                  >
                    <option value="HOT">HOT</option>
                    <option value="NEW">NEW</option>
                    <option value="POPULAR">POPULAR</option>
                    <option value="DEFAULT">DEFAULT</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="featGame"
                    checked={newGame.isFeatured}
                    onChange={(e) => setNewGame({ ...newGame, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-[#7B22FF]"
                  />
                  <label htmlFor="featGame" className="text-white font-semibold cursor-pointer">
                    Feature on Home
                  </label>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7B22FF] to-[#A83DF4] text-white font-bold text-xs shadow-lg shadow-[#7B22FF]/30 hover:opacity-95 transition"
                >
                  {loading ? 'Publishing Game...' : 'Publish Game to User App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0B141C] border border-[#172631] rounded-[24px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#172631]">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[#1687FF]" />
                <h3 className="text-base font-bold text-white">Add New Shop Product</h3>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="w-8 h-8 rounded-full bg-[#101B24] text-[#8493A1] hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8493A1] mb-1 font-semibold">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g. Starbucks RM30 Gift Voucher"
                  className="w-full bg-[#101B24] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2.5 px-3 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8493A1] mb-1 font-semibold">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-[#101B24] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2.5 px-3 text-white outline-none"
                  >
                    <option value="Vouchers">Vouchers</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Essentials">Essentials</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8493A1] mb-1 font-semibold">Price (MYR)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#101B24] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2.5 px-3 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8493A1] mb-1 font-semibold">Initial Stock</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 10 })}
                    className="w-full bg-[#101B24] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2.5 px-3 text-white outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="featProd"
                    checked={newProduct.isFeatured}
                    onChange={(e) => setNewProduct({ ...newProduct, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-[#1687FF]"
                  />
                  <label htmlFor="featProd" className="text-white font-semibold cursor-pointer">
                    Featured Deal
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[#8493A1] mb-1 font-semibold">Image URL</label>
                <input
                  type="url"
                  value={newProduct.image}
                  onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                  className="w-full bg-[#101B24] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2.5 px-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-[#8493A1] mb-1 font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-[#101B24] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2 px-3 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-xs shadow-lg shadow-[#1687FF]/30 hover:opacity-95 transition"
                >
                  {loading ? 'Publishing Product...' : 'Publish Product to User Shop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREDIT WALLET */}
      {showCreditWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0B141C] border border-[#172631] rounded-[24px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#172631]">
              <div className="flex items-center gap-2">
                <DollarSign size={20} className="text-[#00C982]" />
                <h3 className="text-base font-bold text-white">Credit Employee Wallet</h3>
              </div>
              <button
                onClick={() => setShowCreditWalletModal(false)}
                className="w-8 h-8 rounded-full bg-[#101B24] text-[#8493A1] hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreditWallet} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#8493A1] mb-1 font-semibold">Target Employee</label>
                <input
                  type="text"
                  disabled
                  value="John Doe (EMP001) • Logistics"
                  className="w-full bg-[#101B24] border border-[#172631] rounded-xl py-2.5 px-3 text-white"
                />
              </div>

              <div>
                <label className="block text-[#8493A1] mb-1 font-semibold">Credit Amount (MYR)</label>
                <input
                  type="number"
                  step="10"
                  required
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#101B24] border border-[#172631] focus:border-[#3395FF] rounded-xl py-2.5 px-3 text-sm font-bold text-white outline-none"
                />
              </div>

              {/* Razorpay Gateway Selector */}
              <div>
                <label className="block text-[#8493A1] mb-1.5 font-semibold">
                  Disbursal / Payment Gateway
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDisbursalGateway('RAZORPAY')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                      disbursalGateway === 'RAZORPAY'
                        ? 'bg-[#0C2340] border-[#3395FF] text-white ring-1 ring-[#3395FF]/40'
                        : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#3395FF] tracking-wider">
                        RAZORPAY
                      </span>
                      {disbursalGateway === 'RAZORPAY' && (
                        <CheckCircle2 size={13} className="text-[#3395FF]" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-white">Corporate Payout</p>
                    <span className="text-[9px] text-[#8493A1]">Instant UPI / IMPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisbursalGateway('INTERNAL')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1 ${
                      disbursalGateway === 'INTERNAL'
                        ? 'bg-[#101B24] border-[#00C982] text-white ring-1 ring-[#00C982]/40'
                        : 'bg-[#101B24] border-[#172631] text-[#8493A1] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-[#8493A1] tracking-wider">
                        INTERNAL
                      </span>
                      {disbursalGateway === 'INTERNAL' && (
                        <CheckCircle2 size={13} className="text-[#00C982]" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-white">Direct Debit</p>
                    <span className="text-[9px] text-[#8493A1]">Company Ledger</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[#8493A1] mb-1 font-semibold">Memo / Disbursal Reason</label>
                <input
                  type="text"
                  value={creditMemo}
                  onChange={(e) => setCreditMemo(e.target.value)}
                  className="w-full bg-[#101B24] border border-[#172631] focus:border-[#3395FF] rounded-xl py-2.5 px-3 text-white outline-none"
                />
              </div>

              {/* Razorpay Trust Badge */}
              {disbursalGateway === 'RAZORPAY' && (
                <div className="flex items-center justify-between p-2 bg-[#0C2340]/60 border border-[#3395FF]/30 rounded-xl text-[11px] text-[#8493A1]">
                  <span className="flex items-center gap-1.5 text-white font-semibold text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3395FF] animate-pulse" />
                    Powered by Razorpay Payouts
                  </span>
                  <span className="text-[#3395FF] font-bold text-[10px]">256-bit Encrypted</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl font-black text-xs shadow-lg transition active:scale-[0.98] ${
                    disbursalGateway === 'RAZORPAY'
                      ? 'bg-gradient-to-r from-[#0C2340] via-[#1859B4] to-[#3395FF] text-white shadow-[#3395FF]/25 hover:opacity-95'
                      : 'bg-gradient-to-r from-[#00C982] to-[#00E599] text-black shadow-[#00C982]/20 hover:opacity-95'
                  }`}
                >
                  {disbursalGateway === 'RAZORPAY'
                    ? `Disburse MYR ${creditAmount.toFixed(2)} via Razorpay`
                    : `Disburse MYR ${creditAmount.toFixed(2)} to Wallet`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
