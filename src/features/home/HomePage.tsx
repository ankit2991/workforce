import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  Sparkles,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building,
  Gamepad2,
  ShoppingBag,
  Flame,
  X,
  Share2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import type { Wallet, WalletTransaction, BannerItem } from '../../types';
import { SalaryAdvanceModal } from '../../components/modals/SalaryAdvanceModal';
import { WithdrawalModal } from '../../components/modals/WithdrawalModal';
import { RemitModal } from '../../components/modals/RemitModal';
import { useNavigate } from 'react-router-dom';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  const fetchDashboard = async () => {
    try {
      const data: any = await apiRequest('/dashboard');
      if (data) {
        setWallet(data.wallet);
        setTransactions(data.recentTransactions || []);
        setBanners(data.banners || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    if (activeTab === 'IN') {
      return (
        tx.type === 'SALARY_CREDIT' ||
        tx.type === 'SALARY_ADVANCE' ||
        tx.type === 'GAMING_CASHOUT' ||
        tx.type === 'REFUND'
      );
    }
    if (activeTab === 'OUT') {
      return (
        tx.type === 'WITHDRAWAL' ||
        tx.type === 'REMITTANCE' ||
        tx.type === 'GAMING_TOPUP' ||
        tx.type === 'SHOP_PAYMENT'
      );
    }
    return true;
  });

  const isIncome = (type: string) => {
    return ['SALARY_CREDIT', 'SALARY_ADVANCE', 'GAMING_CASHOUT', 'REFUND'].includes(type);
  };

  const getTxConfig = (type: string) => {
    switch (type) {
      case 'SALARY_ADVANCE':
      case 'SALARY_CREDIT':
        return {
          icon: <ArrowDownLeft size={18} className="text-[#00C982]" />,
          bg: 'bg-[#00C982]/10 border-[#00C982]/20',
          label: 'Salary Advance',
        };
      case 'WITHDRAWAL':
        return {
          icon: <ArrowUpRight size={18} className="text-[#FF455B]" />,
          bg: 'bg-[#FF455B]/10 border-[#FF455B]/20',
          label: 'Bank Withdrawal',
        };
      case 'REMITTANCE':
        return {
          icon: <Send size={16} className="text-[#1687FF]" />,
          bg: 'bg-[#1687FF]/10 border-[#1687FF]/20',
          label: 'Remittance',
        };
      case 'GAMING_TOPUP':
        return {
          icon: <Gamepad2 size={18} className="text-[#A855F7]" />,
          bg: 'bg-[#A855F7]/10 border-[#A855F7]/20',
          label: 'Gaming Top-Up',
        };
      case 'GAMING_CASHOUT':
        return {
          icon: <Sparkles size={18} className="text-[#F59E0B]" />,
          bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/20',
          label: 'Gaming Payout',
        };
      case 'SHOP_PAYMENT':
        return {
          icon: <ShoppingBag size={18} className="text-[#38BDF8]" />,
          bg: 'bg-[#38BDF8]/10 border-[#38BDF8]/20',
          label: 'Store Purchase',
        };
      default:
        return {
          icon: <CreditCard size={18} className="text-[#94A3B8]" />,
          bg: 'bg-[#94A3B8]/10 border-[#94A3B8]/20',
          label: 'Transaction',
        };
    }
  };

  return (
    <div className="px-4 sm:px-5 pb-28 pt-3 space-y-5 animate-in fade-in duration-300">
      {/* User Greeting & Status Banner */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-[#8493A1] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C982] animate-pulse" />
            Apex Workforce Global
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-0.5">
            Welcome, John 👋
          </h1>
        </div>
        <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#1687FF]/15 to-[#7B22FF]/15 border border-[#1687FF]/30 text-[11px] font-bold text-[#1687FF] flex items-center gap-1.5 shadow-sm">
          <Sparkles size={13} className="text-[#FCD34D]" />
          Verified Account
        </div>
      </div>

      {/* 🌟 Top Main Wallet Hero Card */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0B3A75] via-[#0A2750] to-[#06162D] p-5 text-white shadow-2xl shadow-[#1687FF]/20 border border-white/[0.12] transition-all">
        {/* Glow ambient background effects */}
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-[#1687FF]/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#7B22FF]/20 blur-3xl pointer-events-none" />

        {/* Card Header Row */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-100/80">
              Total Wallet Balance
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 rounded-full text-blue-200/70 hover:text-white transition"
              aria-label="Toggle balance visibility"
            >
              {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.12] text-[11px] font-bold text-white/90 shadow-sm">
            <span>🇲🇾 MYR</span>
          </div>
        </div>

        {/* Large Balance Display */}
        <div className="mt-2.5 relative z-10">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-blue-300/90">RM</span>
            <span className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-sm">
              {showBalance
                ? (wallet?.availableBalance ?? 1200).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '••••••••'}
            </span>
          </div>
        </div>

        {/* Instant Advance Micro-Banner (Inside Hero Card) */}
        <div className="mt-4 pt-3.5 border-t border-white/[0.1] relative z-10 flex items-center justify-between bg-black/25 backdrop-blur-md rounded-2xl p-3 border border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00C982] to-[#22E5A1] text-[#050B10] flex items-center justify-center font-black shadow-md shadow-[#00C982]/20">
              <Zap size={16} fill="currentColor" />
            </div>
            <div>
              <p className="text-xs font-black text-white">Instant Salary Advance</p>
              <p className="text-[10px] text-blue-200/80">Up to RM 500.00 zero fee approval</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdvanceModal(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#0E6CD4] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[#1687FF]/30"
          >
            Get Cash
          </button>
        </div>

        {/* Financial Sub-Metrics Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center relative z-10">
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl py-2 px-1 border border-white/[0.05]">
            <span className="block text-[10px] text-blue-200/80 uppercase font-medium">Earned</span>
            <span className="text-xs font-bold text-white">
              RM {(wallet?.totalEarned ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl py-2 px-1 border border-white/[0.05]">
            <span className="block text-[10px] text-blue-200/80 uppercase font-medium">Advances</span>
            <span className="text-xs font-bold text-[#FCD34D]">
              RM {(wallet?.totalAdvance ?? 1500).toFixed(2)}
            </span>
          </div>
          <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl py-2 px-1 border border-white/[0.05]">
            <span className="block text-[10px] text-blue-200/80 uppercase font-medium">Withdrawn</span>
            <span className="text-xs font-bold text-[#38BDF8]">
              RM {(wallet?.totalWithdrawn ?? 300).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 🚀 Quick Action Tray (Modern 4-Grid Icon Tray) */}
      <div className="grid grid-cols-4 gap-2.5">
        {/* Advance */}
        <button
          onClick={() => setShowAdvanceModal(true)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-[#1687FF]/50 transition-all duration-200 group active:scale-95 shadow-sm"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0F4A80] to-[#1687FF] text-white flex items-center justify-center mb-1.5 shadow-md shadow-[#1687FF]/25 group-hover:scale-105 transition-transform">
            <Zap size={20} fill="currentColor" />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Advance</span>
          <span className="text-[10px] text-[#8493A1]">Instant</span>
        </button>

        {/* Withdraw */}
        <button
          onClick={() => setShowWithdrawalModal(true)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-[#00C982]/50 transition-all duration-200 group active:scale-95 shadow-sm"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#065F46] to-[#00C982] text-white flex items-center justify-center mb-1.5 shadow-md shadow-[#00C982]/25 group-hover:scale-105 transition-transform">
            <ArrowUpRight size={20} />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Withdraw</span>
          <span className="text-[10px] text-[#8493A1]">To Bank</span>
        </button>

        {/* Remit */}
        <button
          onClick={() => setShowRemitModal(true)}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-[#7B22FF]/50 transition-all duration-200 group active:scale-95 shadow-sm"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#581C87] to-[#9333EA] text-white flex items-center justify-center mb-1.5 shadow-md shadow-[#9333EA]/25 group-hover:scale-105 transition-transform">
            <Send size={18} />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Remit</span>
          <span className="text-[10px] text-[#8493A1]">Overseas</span>
        </button>

        {/* Gaming shortcut */}
        <button
          onClick={() => navigate('/gaming')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-[#EC4899]/50 transition-all duration-200 group active:scale-95 shadow-sm"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#831843] to-[#EC4899] text-white flex items-center justify-center mb-1.5 shadow-md shadow-[#EC4899]/25 group-hover:scale-105 transition-transform">
            <Gamepad2 size={20} />
          </div>
          <span className="text-xs font-bold text-white tracking-tight">Gaming</span>
          <span className="text-[10px] text-[#8493A1]">Arena</span>
        </button>
      </div>

      {/* 🎮 Featured Gaming Promotional Banner */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#4C1D95] via-[#2E1065] to-[#1E1B4B] p-4.5 border border-[#8B5CF6]/30 shadow-xl shadow-purple-950/30">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1.5 max-w-[68%]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase text-white tracking-wider">
              <Flame size={12} className="text-[#F59E0B]" />
              Tournament Live
            </div>
            <h3 className="text-base font-black text-white tracking-tight">Play & Win Big Rewards</h3>
            <p className="text-xs text-purple-200/80 line-clamp-2 leading-relaxed">
              Top up your Gaming Wallet and unlock Aviator, Plinko & weekend jackpot bonuses up to RM 1,000.
            </p>
            <button
              onClick={() => navigate('/gaming')}
              className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-[#1E1B4B] font-extrabold text-xs hover:bg-white/90 active:scale-95 transition-all shadow-md"
            >
              Play Arena <ChevronRight size={14} />
            </button>
          </div>
          <div className="relative flex-shrink-0">
            <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-[#7C3AED]/40 to-[#C084FC]/30 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Gamepad2 size={36} className="text-[#E9D5FF] drop-shadow-md animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* 📜 Recent Transactions Section */}
      <div className="space-y-3">
        {/* Section Header with Pill Filter */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-sm font-black text-white tracking-tight">Recent Transactions</h2>
          <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-[11px] font-bold">
            {(['ALL', 'IN', 'OUT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-[#1687FF] text-white shadow-md shadow-[#1687FF]/30'
                    : 'text-[#8493A1] hover:text-white'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'IN' ? 'In (+)' : 'Out (-)'}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Cards List */}
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center bg-white/[0.02] rounded-2xl border border-white/[0.06]">
              <Clock size={28} className="mx-auto text-[#64748B] mb-2 opacity-60" />
              <p className="text-xs font-semibold text-[#8493A1]">No transactions in this filter</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const income = isIncome(tx.type);
              const { icon, bg } = getTxConfig(tx.type);

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] active:scale-[0.99] transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${bg}`}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white tracking-tight truncate max-w-[170px] sm:max-w-[220px]">
                        {tx.description || tx.type.replace(/_/g, ' ')}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-[#8493A1]">
                        <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-[#00C982] font-semibold">Completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-sm font-black tracking-tight ${
                        income ? 'text-[#00C982]' : 'text-[#FF455B]'
                      }`}
                    >
                      {income ? '+' : '-'}RM {tx.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] font-mono text-[#64748B] group-hover:text-[#8493A1] transition-colors">
                      {tx.referenceNumber.slice(0, 12)}...
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 🧾 Transaction Detail Modal (Interactive Receipt) */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-[420px] bg-[#07111A] border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl relative animate-in slide-in-from-bottom-5 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-[#00C982]" />
                <h3 className="text-sm font-extrabold text-white">Transaction Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#8493A1] hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Receipt Amount Center */}
            <div className="my-5 text-center">
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  isIncome(selectedTx.type) ? 'text-[#00C982]' : 'text-[#FF455B]'
                }`}
              >
                {isIncome(selectedTx.type) ? '+' : '-'}RM {selectedTx.amount.toFixed(2)}
              </span>
              <p className="text-xs font-bold text-white mt-1">
                {selectedTx.description || selectedTx.type.replace(/_/g, ' ')}
              </p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-[#00C982]/15 text-[#00C982] border border-[#00C982]/30 text-[10px] font-extrabold">
                {selectedTx.status}
              </span>
            </div>

            {/* Receipt Details List */}
            <div className="space-y-2.5 bg-white/[0.03] p-4 rounded-2xl border border-white/[0.06] text-xs">
              <div className="flex justify-between">
                <span className="text-[#8493A1]">Reference ID</span>
                <span className="font-mono font-bold text-white">{selectedTx.referenceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8493A1]">Date & Time</span>
                <span className="font-medium text-white">
                  {new Date(selectedTx.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8493A1]">Type</span>
                <span className="font-medium text-white">{selectedTx.type.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8493A1]">Balance Before</span>
                <span className="font-medium text-white">RM {selectedTx.balanceBefore.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8493A1]">Balance After</span>
                <span className="font-bold text-[#1687FF]">RM {selectedTx.balanceAfter.toFixed(2)}</span>
              </div>
            </div>

            {/* Close CTA */}
            <button
              onClick={() => setSelectedTx(null)}
              className="mt-5 w-full py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-bold text-xs transition"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}

      {/* Action Modals */}
      <SalaryAdvanceModal
        isOpen={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        onSuccess={fetchDashboard}
        availableLimit={500}
      />
      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onSuccess={fetchDashboard}
        availableBalance={wallet?.availableBalance ?? 1200}
      />
      <RemitModal
        isOpen={showRemitModal}
        onClose={() => setShowRemitModal(false)}
        onSuccess={fetchDashboard}
        availableBalance={wallet?.availableBalance ?? 1200}
      />
    </div>
  );
};
