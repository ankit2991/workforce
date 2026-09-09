import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  ArrowUpRight,
  Gamepad2,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Bell,
  Smartphone,
  Search,
  DollarSign,
  Shield,
  Send,
  Building,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import { apiRequest } from '../../lib/apiClient';
import { toast } from 'sonner';

interface EmployeeOption {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  monthlySalary: number;
  walletBalance: number;
  status: string;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Employee roster state
  const [employees, setEmployees] = useState<EmployeeOption[]>([
    {
      id: 'emp-001',
      employeeCode: 'EMP001',
      name: 'John Doe',
      department: 'Logistics & Operations',
      designation: 'Senior Warehouse Specialist',
      monthlySalary: 1500.0,
      walletBalance: 1200.0,
      status: 'ACTIVE',
    },
    {
      id: 'emp-002',
      employeeCode: 'EMP002',
      name: 'Ahmad Faiz',
      department: 'Warehouse & Inventory',
      designation: 'Inventory Coordinator',
      monthlySalary: 1400.0,
      walletBalance: 850.0,
      status: 'ACTIVE',
    },
    {
      id: 'emp-003',
      employeeCode: 'EMP003',
      name: 'Priya Sharma',
      department: 'Supply Chain & Procurement',
      designation: 'Supply Chain Lead',
      monthlySalary: 2100.0,
      walletBalance: 1450.0,
      status: 'ACTIVE',
    },
    {
      id: 'emp-004',
      employeeCode: 'EMP004',
      name: 'Sarah Wong',
      department: 'Quality Assurance',
      designation: 'Senior QA Inspector',
      monthlySalary: 1650.0,
      walletBalance: 620.0,
      status: 'ACTIVE',
    },
    {
      id: 'emp-005',
      employeeCode: 'EMP005',
      name: 'Michael Chen',
      department: 'Transport & Fleet',
      designation: 'Fleet Logistics Supervisor',
      monthlySalary: 1800.0,
      walletBalance: 1100.0,
      status: 'ACTIVE',
    },
    {
      id: 'emp-006',
      employeeCode: 'EMP006',
      name: 'Siti Aminah',
      department: 'Fulfilment & Packing',
      designation: 'Fulfilment Specialist',
      monthlySalary: 1350.0,
      walletBalance: 420.0,
      status: 'ACTIVE',
    },
  ]);
  const [selectedEmpCode, setSelectedEmpCode] = useState<string>('EMP001');

  // Employee wallet credit state
  const [creditEmpAmount, setCreditEmpAmount] = useState<number>(200);
  const [creditReason, setCreditReason] = useState('Monthly Overtime Bonus');
  const [isCrediting, setIsCrediting] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res: any = await apiRequest('/admin/employees');
        if (res && Array.isArray(res) && res.length > 0) {
          setEmployees(res);
        }
      } catch (err) {
        // Fallback already preloaded
      }
    };
    loadEmployees();
  }, []);

  const selectedEmployee =
    employees.find((e) => e.employeeCode === selectedEmpCode) || employees[0];

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = useState('Company Bonus Disbursed');
  const [broadcastMsg, setBroadcastMsg] = useState('All active employees have received an overtime stipend.');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const [advances, setAdvances] = useState([
    {
      id: 'adv-req-1',
      employee: 'John Doe (EMP001)',
      amount: 500.0,
      requestedAt: 'Today, 10:15 AM',
      status: 'APPROVED',
    },
    {
      id: 'adv-req-2',
      employee: 'Ahmad Faiz (EMP002)',
      amount: 350.0,
      requestedAt: 'Today, 11:30 AM',
      status: 'PENDING',
    },
  ]);

  const [withdrawals, setWithdrawals] = useState([
    {
      id: 'wdr-req-1',
      employee: 'John Doe (EMP001)',
      bank: 'Maybank Berhad (*4821)',
      amount: 300.0,
      requestedAt: 'Today, 02:30 PM',
      status: 'COMPLETED',
    },
    {
      id: 'wdr-req-2',
      employee: 'Sarah Wong (EMP004)',
      bank: 'CIMB Bank (*1902)',
      amount: 450.0,
      requestedAt: 'Today, 03:15 PM',
      status: 'PENDING',
    },
  ]);

  const handleCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creditEmpAmount <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    setIsCrediting(true);
    try {
      await apiRequest('/admin/credit-wallet', {
        method: 'POST',
        body: JSON.stringify({
          employeeCode: selectedEmployee.employeeCode,
          amount: creditEmpAmount,
          reason: creditReason,
        }),
      });

      // Update local state for the credited employee
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.employeeCode === selectedEmployee.employeeCode
            ? { ...emp, walletBalance: emp.walletBalance + creditEmpAmount }
            : emp
        )
      );

      toast.success(
        `Successfully credited MYR ${creditEmpAmount.toFixed(2)} to ${selectedEmployee.employeeCode} (${selectedEmployee.name})!`
      );
    } catch (err: any) {
      toast.error('Credit failed');
    } finally {
      setIsCrediting(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMsg) return;

    setIsBroadcasting(true);
    try {
      await apiRequest('/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: broadcastTitle,
          message: broadcastMsg,
        }),
      });
      toast.success('Broadcast notification pushed to all workforce devices!');
      setBroadcastTitle('');
      setBroadcastMsg('');
    } catch (err) {
      toast.error('Broadcast failed');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleApproveAdvance = (id: string) => {
    setAdvances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'APPROVED' } : a))
    );
    toast.success('Advance request approved and disbursed');
  };

  const handleProcessWithdrawal = (id: string) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: 'COMPLETED' } : w))
    );
    toast.success('Withdrawal transfer marked completed');
  };

  return (
    <div className="min-h-screen bg-[#050B10] text-[#F5F8FA] p-4 sm:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#172631]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1687FF] to-[#7B22FF] flex items-center justify-center text-white shadow-lg">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              HR & Payroll Admin Console
              <span className="px-2 py-0.5 rounded-md bg-[#1687FF]/15 text-[#1687FF] text-xs font-bold border border-[#1687FF]/30">
                MongoDB Engine
              </span>
            </h1>
            <p className="text-xs text-[#8493A1]">
              Apex Workforce Logistics Sdn Bhd • Real-time wallet & payroll orchestration
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#101B24] border border-[#172631] hover:border-[#1687FF] text-xs font-bold text-white transition shadow"
        >
          <Smartphone size={16} className="text-[#1687FF]" />
          Switch to Mobile Employee App
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#101B24] border border-[#172631] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8493A1]">Total Workforce</span>
            <div className="w-8 h-8 rounded-lg bg-[#1687FF]/15 text-[#1687FF] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">128</p>
          <span className="text-[11px] text-[#00C982] font-semibold">100% active enrolled</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#101B24] border border-[#172631] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8493A1]">Advances Disbursed</span>
            <div className="w-8 h-8 rounded-lg bg-[#00C982]/15 text-[#00C982] flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#00C982]">MYR 24,500.00</p>
          <span className="text-[11px] text-[#8493A1]">Zero bad debt / 100% payroll backed</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#101B24] border border-[#172631] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8493A1]">Bank Withdrawals</span>
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">MYR 18,200.00</p>
          <span className="text-[11px] text-[#8493A1]">Avg settlement: &lt; 2 minutes</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#101B24] border border-[#172631] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8493A1]">Gaming Turnover</span>
            <div className="w-8 h-8 rounded-lg bg-[#7B22FF]/15 text-[#7B22FF] flex items-center justify-center">
              <Gamepad2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#A83DF4]">MYR 8,420.00</p>
          <span className="text-[11px] text-[#00C982] font-semibold">Provably fair RNG</span>
        </div>
      </div>

      {/* Main Grid Section: Wallet Credit & Broadcast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credit Employee Wallet Box */}
        <div className="p-6 rounded-2xl bg-[#101B24] border border-[#172631] space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="text-[#00C982]" size={20} />
            <h3 className="text-base font-bold text-white">Direct Wallet Credit / Stipend</h3>
          </div>
          <p className="text-xs text-[#8493A1]">
            Credit salary advances, performance bonuses, or overtime stipends instantly into an employee's wallet.
          </p>

          <form onSubmit={handleCreditWallet} className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#8493A1]">
                  Target Employee
                </label>
                <span className="text-[11px] text-[#1687FF] font-semibold flex items-center gap-1">
                  <UserCheck size={13} /> {employees.length} Employees Enrolled
                </span>
              </div>

              <div className="relative">
                <select
                  value={selectedEmpCode}
                  onChange={(e) => setSelectedEmpCode(e.target.value)}
                  className="w-full bg-[#0B141C] border border-[#172631] hover:border-[#1687FF]/50 focus:border-[#00C982] rounded-xl py-3 px-3.5 text-xs font-bold text-white outline-none cursor-pointer appearance-none transition-all pr-10 shadow-sm"
                >
                  {employees.map((emp) => (
                    <option
                      key={emp.employeeCode}
                      value={emp.employeeCode}
                      className="bg-[#0B141C] text-white py-2"
                    >
                      {emp.employeeCode} - {emp.name} ({emp.designation}) • Wallet: MYR {emp.walletBalance.toFixed(2)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8493A1]">
                  <ChevronDown size={16} />
                </div>
              </div>

              {/* Selected Employee Live Info Card */}
              {selectedEmployee && (
                <div className="mt-2.5 p-3 rounded-xl bg-[#0B141C] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1687FF] to-[#00C982] flex items-center justify-center text-xs font-black text-white shadow-sm">
                      {selectedEmployee.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        {selectedEmployee.name}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/80 font-mono">
                          {selectedEmployee.employeeCode}
                        </span>
                      </p>
                      <p className="text-[10px] text-[#8493A1]">
                        {selectedEmployee.department} • {selectedEmployee.designation}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#8493A1] block">Current Balance</span>
                    <span className="text-xs font-black text-[#00C982]">
                      MYR {selectedEmployee.walletBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8493A1] mb-1">
                Credit Amount (MYR)
              </label>
              <input
                type="number"
                step="10"
                min="1"
                value={creditEmpAmount}
                onChange={(e) => setCreditEmpAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#00C982] rounded-xl py-2.5 px-3.5 text-sm font-bold text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8493A1] mb-1">
                Reason / Memo
              </label>
              <input
                type="text"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                placeholder="e.g. Overtime Stipend / Performance Bonus"
                className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#00C982] rounded-xl py-2.5 px-3.5 text-xs text-[#F5F8FA] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isCrediting || creditEmpAmount <= 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00C982] to-[#00E599] text-black font-extrabold text-xs shadow-lg hover:brightness-105 active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <DollarSign size={15} />
              {isCrediting
                ? 'Crediting Wallet...'
                : `Disburse MYR ${creditEmpAmount.toFixed(2)} to ${selectedEmployee.employeeCode} (${selectedEmployee.name})`}
            </button>
          </form>
        </div>

        {/* Broadcast Push Notification Box */}
        <div className="p-6 rounded-2xl bg-[#101B24] border border-[#172631] space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="text-[#1687FF]" size={20} />
            <h3 className="text-base font-bold text-white">Broadcast Mobile Notification</h3>
          </div>
          <p className="text-xs text-[#8493A1]">
            Send system announcements, shift reminders, or company perks directly to all workforce mobile apps.
          </p>

          <form onSubmit={handleBroadcast} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#8493A1] mb-1">
                Announcement Title
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Festival Bonus Disbursed"
                className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2.5 px-3.5 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8493A1] mb-1">
                Message Body
              </label>
              <textarea
                rows={3}
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Write your announcement..."
                className="w-full bg-[#0B141C] border border-[#172631] focus:border-[#1687FF] rounded-xl py-2 px-3 text-xs text-white outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isBroadcasting || !broadcastTitle || !broadcastMsg}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#1687FF] to-[#389AFF] text-white font-bold text-xs shadow hover:opacity-95 active:scale-[0.98] transition disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Send size={14} /> {isBroadcasting ? 'Broadcasting...' : 'Push to All Workforce Devices'}
            </button>
          </form>
        </div>
      </div>

      {/* Pending Queues Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Advances Queue */}
        <div className="p-6 rounded-2xl bg-[#101B24] border border-[#172631] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center justify-between">
            <span>Salary Advance Requests</span>
            <span className="text-xs text-[#8493A1] font-normal">{advances.length} records</span>
          </h3>

          <div className="space-y-2">
            {advances.map((adv) => (
              <div
                key={adv.id}
                className="p-3.5 rounded-xl bg-[#0B141C] border border-[#172631] flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white">{adv.employee}</p>
                  <p className="text-[10px] text-[#8493A1] mt-0.5">
                    Requested: {adv.requestedAt} • MYR {adv.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {adv.status === 'PENDING' ? (
                    <button
                      onClick={() => handleApproveAdvance(adv.id)}
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
              </div>
            ))}
          </div>
        </div>

        {/* Withdrawals Queue */}
        <div className="p-6 rounded-2xl bg-[#101B24] border border-[#172631] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center justify-between">
            <span>Bank Withdrawal Settlement</span>
            <span className="text-xs text-[#8493A1] font-normal">{withdrawals.length} records</span>
          </h3>

          <div className="space-y-2">
            {withdrawals.map((wdr) => (
              <div
                key={wdr.id}
                className="p-3.5 rounded-xl bg-[#0B141C] border border-[#172631] flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white">{wdr.employee}</p>
                  <p className="text-[10px] text-[#8493A1] mt-0.5">
                    {wdr.bank} • MYR {wdr.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {wdr.status === 'PENDING' ? (
                    <button
                      onClick={() => handleProcessWithdrawal(wdr.id)}
                      className="px-3 py-1 rounded-lg bg-[#1687FF] hover:bg-[#389AFF] text-white font-bold text-xs"
                    >
                      Process Payout
                    </button>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md bg-[#00C982]/15 text-[#00C982] text-[10px] font-bold">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
