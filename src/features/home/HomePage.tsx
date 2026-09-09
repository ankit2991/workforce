import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  TrendingUp,
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
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { Wallet, WalletTransaction, BannerItem } from '../../types';
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

  const getTxIcon = (type: string) => {
    switch (type) {
      case 'SALARY_ADVANCE':
      case 'SALARY_CREDIT':
        return <ArrowDownLeft size={16} className="text-[#00C982]" />;
      case 'WITHDRAWAL':
        return <ArrowUpRight size={16} className="text-[#FF455B]" />;
      case 'REMITTANCE':
        return <Send size={16} className="text-[#1687FF]" />;
      case 'GAMING_TOPUP':
        return <Gamepad2 size={16} className="text-[#7B22FF]" />;
      case 'GAMING_CASHOUT':
        return <Gamepad2 size={16} className="text-[#00C982]" />;
      case 'SHOP_PAYMENT':
        return <ShoppingBag size={16} className="text-[#F59E0B]" />;
      default:
        return <CreditCard size={16} className="text-[#8493A1]" />;
    }
  };

  return (
    <div className="pb-24 pt-2 space-y-5 animate-in fade-in duration-300">
      {/* Top Main Wallet Hero Card */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1264B4] via-[#0E4984] to-[#0A2644] p-5 text-white shadow-xl shadow-[#1687FF]/15 border border-[#1E74D4]/30">
        {/* Glow ambient decoration */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#1687FF]/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#7B22FF]/20 blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-100/80">
              Workforce Balance
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 rounded-full text-blue-200/80 hover:text-white transition"
            >
              {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[11px] font-bold tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C982] animate-pulse" />
            EMP001
          </div>
        </div>

        {/* Big Balance Display */}
        <div className="mt-3 relative z-10">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-blue-200">MYR</span>
            <span className="text-3xl sm:text-4xl font-black tracking-tight">
              {showBalance
                ? (wallet?.availableBalance ?? 1200).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '••••••'}
            </span>
          </div>
          <p className="text-[11px] text-blue-200/80 mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-[#00C982]" />
            Salary Advance limit: MYR 500.00 instant approval
          </p>
        </div>

        {/* Financial Sub-Metrics Pills */}
        <div className="mt-5 pt-3.5 border-t border-white/10 grid grid-cols-3 gap-2 text-center relative z-10">
          <div className="bg-black/20 backdrop-blur-sm rounded-xl py-2 px-1">
            <span className="block text-[10px] text-blue-200 uppercase font-medium">Earned</span>
            <span className="text-xs font-bold text-white">
              MYR {(wallet?.totalEarned ?? 0).toFixed(2)}
            </span>
          </div>
          <div className="bg-black/20 backdrop-blur-sm rounded-xl py-2 px-1">
            <span className="block text-[10px] text-blue-200 uppercase font-medium">Advances</span>
            <span className="text-xs font-bold text-[#FCD34D]">
              MYR {(wallet?.totalAdvance ?? 1500).toFixed(2)}
            </span>
          </div>
          <div className="bg-black/20 backdrop-blur-sm rounded-xl py-2 px-1">
            <span className="block text-[10px] text-blue-200 uppercase font-medium">Withdrawn</span>
            <span className="text-xs font-bold text-white">
              MYR {(wallet?.totalWithdrawn ?? 300).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons (Advance, Withdraw, Remit) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setShowAdvanceModal(true)}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#101B24] border border-[#172631] hover:border-[#1687FF]/50 transition group shadow-md"
        >
          <div className="w-11 h-11 rounded-xl bg-[#1687FF]/15 text-[#1687FF] flex items-center justify-center mb-2 group-hover:scale-105 transition shadow-sm">
            <TrendingUp size={22} />
          </div>
          <span className="text-xs font-bold text-[#F5F8FA]">Advance</span>
          <span className="text-[10px] text-[#8493A1]">Instant cash</span>
        </button>

        <button
          onClick={() => setShowWithdrawalModal(true)}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#101B24] border border-[#172631] hover:border-[#00C982]/50 transition group shadow-md"
        >
          <div className="w-11 h-11 rounded-xl bg-[#00C982]/15 text-[#00C982] flex items-center justify-center mb-2 group-hover:scale-105 transition shadow-sm">
            <ArrowUpRight size={22} />
          </div>
          <span className="text-xs font-bold text-[#F5F8FA]">Withdraw</span>
          <span className="text-[10px] text-[#8493A1]">To local bank</span>
        </button>

        <button
          onClick={() => setShowRemitModal(true)}
          className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-[#101B24] border border-[#172631] hover:border-[#7B22FF]/50 transition group shadow-md"
        >
          <div className="w-11 h-11 rounded-xl bg-[#7B22FF]/15 text-[#A83DF4] flex items-center justify-center mb-2 group-hover:scale-105 transition shadow-sm">
            <Send size={20} />
          </div>
          <span className="text-xs font-bold text-[#F5F8FA]">Remit</span>
          <span className="text-[10px] text-[#8493A1]">Send home</span>
        </button>
      </div>

      {/* Featured Banner Carousel */}
      {banners.length > 0 && (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#5B16C8] via-[#2F0B7A] to-[#120532] p-4 border border-[#7B22FF]/30 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="max-w-[70%] space-y-1">
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase text-white tracking-wider">
                  HOT FEATURE
                </span>
                <h4 className="text-sm font-black text-white">Play & Win Big</h4>
                <p className="text-[11px] text-white/80 line-clamp-2">
                  Top up your Gaming Wallet and unlock slots, scratchers, and instant rewards.
                </p>
                <button
                  onClick={() => navigate('/gaming')}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-black font-bold text-xs hover:bg-slate-100 transition shadow"
                >
                  Play Now <ChevronRight size={14} />
                </button>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-[#7B22FF]/30 border border-white/10 flex items-center justify-center text-white shadow-inner">
                <Gamepad2 size={32} className="text-[#E0A7FF]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#F5F8FA]">Recent Transactions</h3>
          <div className="flex items-center bg-[#101B24] p-0.5 rounded-lg border border-[#172631] text-[11px] font-semibold">
            {(['ALL', 'IN', 'OUT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded-md transition ${
                  activeTab === tab
                    ? 'bg-[#1687FF] text-white'
                    : 'text-[#8493A1] hover:text-[#F5F8FA]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Transaction Rows */}
        <div className="space-y-2">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center bg-[#101B24] rounded-2xl border border-[#172631]">
              <Clock size={28} className="mx-auto text-[#8493A1] mb-2 opacity-50" />
              <p className="text-xs text-[#8493A1]">No transactions found</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const income = isIncome(tx.type);
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-[#101B24] border border-[#172631] hover:border-[#1E2E3C] transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0B141C] border border-[#172631] flex items-center justify-center shadow-inner">
                      {getTxIcon(tx.type)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#F5F8FA] line-clamp-1">
                        {tx.description || tx.type.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] text-[#8493A1] flex items-center gap-1 mt-0.5">
                        <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="text-[#00C982] font-medium">{tx.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-black ${
                        income ? 'text-[#00C982]' : 'text-[#FF455B]'
                      }`}
                    >
                      {income ? '+' : '-'}MYR {tx.amount.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-[#8493A1]">{tx.referenceNumber.slice(0, 14)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modals */}
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
