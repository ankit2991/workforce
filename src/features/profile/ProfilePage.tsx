import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Briefcase,
  Building,
  CreditCard,
  Shield,
  LogOut,
  ChevronRight,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  Lock,
  QrCode,
} from 'lucide-react';
import { apiRequest, localStore } from '../../lib/apiClient';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { recordUserLogout } from '../../hooks/useUserSessionTracker';
import { UserActivityQrModal } from '../../components/modals/UserActivityQrModal';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const data = await apiRequest('/auth/me');
        if (data) setProfile(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMe();
  }, []);

  const employee = profile?.employee || {
    firstName: 'John',
    lastName: 'Doe',
    name: 'John Doe',
    employeeCode: 'EMP001',
    designation: 'Senior Warehouse Specialist',
    department: 'Logistics & Operations',
    monthlySalary: 1500.0,
    joiningDate: '2024-01-15',
  };

  const handleLogout = async () => {
    await recordUserLogout(employee.employeeCode);
    localStorage.removeItem('workpay_token');
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="pb-24 pt-2 space-y-4 animate-in fade-in duration-300">
      {/* Profile Header Card */}
      <div className="p-5 rounded-[24px] bg-[#101B24] border border-[#172631] flex items-center gap-4 shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1687FF] to-[#7B22FF] p-0.5 shadow-md">
          <img
            src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"
            alt="User Avatar"
            className="w-full h-full rounded-[14px] object-cover bg-[#050B10]"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white truncate">{employee.name}</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#00C982]/15 text-[#00C982] text-[10px] font-black border border-[#00C982]/30">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-[#8493A1] mt-0.5 truncate">{employee.designation}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-[#1687FF] bg-[#1687FF]/10 px-2 py-0.5 rounded-md">
              {employee.employeeCode}
            </span>
            <span className="text-[10px] text-[#8493A1]">{employee.department}</span>
          </div>
        </div>
      </div>

      {/* Activity Log QR Pass Card */}
      <div
        onClick={() => setShowQrModal(true)}
        className="p-4 rounded-2xl bg-gradient-to-r from-[#7B22FF]/20 via-[#101B24] to-[#00C982]/15 border border-[#7B22FF]/40 flex items-center justify-between cursor-pointer hover:border-[#7B22FF] transition shadow-lg group active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#7B22FF]/25 border border-[#7B22FF]/50 flex items-center justify-center text-[#E0A7FF] group-hover:scale-105 transition shadow-md shadow-[#7B22FF]/20">
            <QrCode size={22} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              My Activity & Presence QR Pass
              <Sparkles size={12} className="text-[#00C982]" />
            </h4>
            <p className="text-[10px] text-[#8493A1]">
              Scan to verify login/logout & online hours
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[#E0A7FF] text-xs font-bold bg-[#7B22FF]/20 px-2.5 py-1 rounded-xl border border-[#7B22FF]/30">
          <span>Show QR</span>
          <ChevronRight size={14} />
        </div>
      </div>

      {/* Employment Details Section */}
      <div className="p-4 rounded-2xl bg-[#101B24] border border-[#172631] space-y-3">
        <h4 className="text-xs font-bold text-[#8493A1] uppercase tracking-wider">
          Employment & Compensation
        </h4>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between py-1">
            <span className="text-[#8493A1] flex items-center gap-2">
              <Building size={15} /> Employer
            </span>
            <span className="font-semibold text-white">Apex Workforce Logistics</span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-[#172631]">
            <span className="text-[#8493A1] flex items-center gap-2">
              <Briefcase size={15} /> Base Salary
            </span>
            <span className="font-bold text-[#00C982]">
              MYR {employee.monthlySalary.toFixed(2)} / mo
            </span>
          </div>
          <div className="flex items-center justify-between py-1 border-t border-[#172631]">
            <span className="text-[#8493A1] flex items-center gap-2">
              <Calendar size={15} /> Joining Date
            </span>
            <span className="font-semibold text-white">15 January 2024</span>
          </div>
        </div>
      </div>

      {/* Linked Bank Account */}
      <div className="p-4 rounded-2xl bg-[#101B24] border border-[#172631] space-y-3">
        <h4 className="text-xs font-bold text-[#8493A1] uppercase tracking-wider">
          Linked Payout Bank
        </h4>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B141C] border border-[#172631]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center font-black text-xs">
              MBB
            </div>
            <div>
              <p className="text-xs font-bold text-white">Maybank Berhad</p>
              <p className="text-[11px] text-[#8493A1]">•••• 4821 (Verified)</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[#00C982]/15 text-[#00C982] text-[10px] font-bold">
            Primary
          </span>
        </div>
      </div>

      {/* App Settings & Logout */}
      <div className="p-2 rounded-2xl bg-[#101B24] border border-[#172631] space-y-1">
        <button
          onClick={() => toast.info('Biometric & PIN security enabled')}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#0B141C] transition text-xs text-[#F5F8FA]"
        >
          <div className="flex items-center gap-2.5">
            <Lock size={16} className="text-[#8493A1]" />
            <span>Security & PIN</span>
          </div>
          <ChevronRight size={16} className="text-[#8493A1]" />
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#FF455B]/10 transition text-xs text-[#FF455B] font-bold"
        >
          <div className="flex items-center gap-2.5">
            <LogOut size={16} />
            <span>Log Out</span>
          </div>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Activity Log QR Pass Modal */}
      <UserActivityQrModal
        user={
          localStore.userActivities.find(
            (u) => u.employeeCode === employee.employeeCode
          ) || localStore.userActivities[0]
        }
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
      />
    </div>
  );
};
