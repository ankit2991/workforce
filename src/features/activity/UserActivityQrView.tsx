import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Clock,
  Calendar,
  Smartphone,
  RotateCw,
  Copy,
  Check,
  Printer,
  ChevronRight,
  User,
  History,
  Activity,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { apiRequest, localStore } from '../../lib/apiClient';
import type { UserActivity } from '../../types';
import { toast } from 'sonner';

export const UserActivityQrView: React.FC = () => {
  const { employeeCode } = useParams<{ employeeCode: string }>();
  const [user, setUser] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [copied, setCopied] = useState<boolean>(false);

  const fetchUserActivity = async () => {
    if (!employeeCode) return;
    try {
      // First try public endpoint
      const res: any = await apiRequest(`/public/user-activity/${employeeCode}`);
      if (res && res.employeeCode) {
        setUser(res);
      } else {
        // Fallback to local store
        const found = localStore.userActivities.find(
          (u) => u.employeeCode.toUpperCase() === employeeCode.toUpperCase()
        );
        if (found) setUser(found);
      }
    } catch (err) {
      console.error('Error fetching user activity for QR view:', err);
      const found = localStore.userActivities.find(
        (u) => u.employeeCode.toUpperCase() === employeeCode.toUpperCase()
      );
      if (found) setUser(found);
    } finally {
      setLoading(false);
      setLastRefreshedAt(new Date());
    }
  };

  useEffect(() => {
    fetchUserActivity();
  }, [employeeCode]);

  // Real-time live polling every 8s
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchUserActivity();
    }, 8000);
    return () => clearInterval(interval);
  }, [employeeCode, autoRefresh]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Activity Log URL copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatTimestamp = (iso: string | null) => {
    if (!iso) return 'Not recorded';
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ', ' +
      date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#060D14] flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-[#7B22FF]/20 border border-[#7B22FF]/40 flex items-center justify-center text-[#A83DF4] mb-4 animate-pulse">
          <RotateCw size={26} className="animate-spin" />
        </div>
        <h2 className="text-base font-bold text-white">Verifying Activity QR...</h2>
        <p className="text-xs text-[#8493A1] mt-1">Fetching live presence & log time details</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#060D14] flex flex-col items-center justify-center text-white p-4">
        <div className="p-8 rounded-3xl bg-[#101B24] border border-[#172631] text-center max-w-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FF455B]/10 text-[#FF455B] flex items-center justify-center mx-auto">
            <User size={24} />
          </div>
          <h2 className="text-lg font-black text-white">Employee Record Not Found</h2>
          <p className="text-xs text-[#8493A1]">
            No verified activity records found for code <span className="font-bold text-white">"{employeeCode}"</span>.
          </p>
          <Link
            to="/admin"
            className="inline-block py-2.5 px-4 rounded-xl bg-[#7B22FF] text-white text-xs font-bold"
          >
            Go to Admin Console
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060D14] text-white antialiased selection:bg-[#7B22FF]/30 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#0A121A]/90 backdrop-blur-md border-b border-[#172631] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1687FF] via-[#7B22FF] to-[#00C982] p-0.5 shadow-md">
              <div className="w-full h-full rounded-[10px] bg-[#0A121A] flex items-center justify-center text-[#00C982]">
                <ShieldCheck size={18} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black tracking-wider uppercase text-white">WorkForce</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#00C982]/20 text-[#00C982] text-[9px] font-black border border-[#00C982]/40">
                  VERIFIED PASS
                </span>
              </div>
              <p className="text-[10px] text-[#8493A1]">Digital Presence & Activity Logs</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUserActivity}
              className="p-2 rounded-xl bg-[#101B24] border border-[#172631] text-[#8493A1] hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
              title="Refresh logs"
            >
              <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              to="/"
              className="py-1.5 px-3 rounded-xl bg-[#1687FF]/20 text-[#1687FF] hover:bg-[#1687FF] hover:text-white font-bold text-xs transition flex items-center gap-1"
            >
              <span>User App</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Security Scan Banner */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#00C982]/15 via-[#101B24] to-[#7B22FF]/15 border border-[#00C982]/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00C982]/20 text-[#00C982] flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                Authentic QR Verification Scan
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C982] inline-block animate-ping" />
              </p>
              <p className="text-[10px] text-[#8493A1]">
                Verified at {lastRefreshedAt.toLocaleTimeString()} • Real-time log synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                autoRefresh
                  ? 'bg-[#00C982]/20 border-[#00C982]/40 text-[#00C982]'
                  : 'bg-[#101B24] border-[#172631] text-[#8493A1]'
              }`}
            >
              <Activity size={12} />
              <span>{autoRefresh ? 'Live Sync Active (8s)' : 'Live Sync Paused'}</span>
            </button>
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-[#101B24] border border-[#172631] text-[#8493A1] hover:text-white"
              title="Copy URL"
            >
              {copied ? <Check size={14} className="text-[#00C982]" /> : <Copy size={14} />}
            </button>
            <button
              onClick={() => window.print()}
              className="p-1.5 rounded-lg bg-[#101B24] border border-[#172631] text-[#8493A1] hover:text-white"
              title="Print Certificate"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>

        {/* Employee Hero Profile Card */}
        <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#121E2A] via-[#0E1720] to-[#0A1118] border border-[#7B22FF]/30 p-6 shadow-xl shadow-[#7B22FF]/10">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#7B22FF]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-[#1687FF]/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#7B22FF]/50 shadow-lg"
                />
                <span
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#0E1720] flex items-center justify-center ${
                    user.isOnline ? 'bg-[#00C982]' : 'bg-[#8493A1]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full bg-white ${
                      user.isOnline ? 'animate-ping' : ''
                    }`}
                  />
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-white">{user.name}</h1>
                  <span className="px-2 py-0.5 rounded-full bg-[#1687FF]/20 text-[#1687FF] text-xs font-bold border border-[#1687FF]/40">
                    {user.employeeCode}
                  </span>
                </div>
                <p className="text-xs text-[#8493A1] mt-0.5">{user.designation}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-[#8493A1]">
                  <span className="font-semibold text-slate-300">{user.department}</span>
                  <span>•</span>
                  <span>Apex Workforce Logistics</span>
                </div>
              </div>
            </div>

            {/* Current Live Presence Card */}
            <div className="p-4 rounded-2xl bg-[#081017] border border-[#172631] min-w-[200px]">
              <span className="text-[10px] font-bold text-[#8493A1] uppercase tracking-wider block mb-1">
                Current Real-Time Presence
              </span>
              {user.isOnline ? (
                <div>
                  <div className="flex items-center gap-2 text-sm font-black text-[#00C982]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00C982] animate-ping" />
                    ONLINE NOW
                  </div>
                  <p className="text-[11px] text-white mt-1">
                    Active for{' '}
                    <span className="font-black text-[#00C982]">
                      {formatDuration(user.currentSessionDurationSec)}
                    </span>
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-[#8493A1]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8493A1]" />
                    OFFLINE
                  </div>
                  <p className="text-[10px] text-[#8493A1] mt-1">
                    Last logout: {formatTimestamp(user.lastLogoutAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#101B24] border border-[#172631] shadow-md">
            <div className="flex items-center gap-2 text-[#1687FF] mb-2">
              <Clock size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8493A1]">
                Total Time Online
              </span>
            </div>
            <p className="text-lg font-black text-white">{formatDuration(user.totalOnlineSec)}</p>
            <p className="text-[10px] text-[#8493A1] mt-1">Aggregate user panel time</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#101B24] border border-[#172631] shadow-md">
            <div className="flex items-center gap-2 text-[#7B22FF] mb-2">
              <History size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8493A1]">
                Total Logged Visits
              </span>
            </div>
            <p className="text-lg font-black text-white">{user.sessions.length} Visits</p>
            <p className="text-[10px] text-[#8493A1] mt-1">Multi-session records</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#101B24] border border-[#172631] shadow-md">
            <div className="flex items-center gap-2 text-[#00C982] mb-2">
              <Calendar size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8493A1]">
                Last Login
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate">{formatTimestamp(user.lastLoginAt)}</p>
            <p className="text-[10px] text-[#00C982] mt-1">Authenticated visit</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#101B24] border border-[#172631] shadow-md">
            <div className="flex items-center gap-2 text-[#E0A7FF] mb-2">
              <Activity size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8493A1]">
                Last Logout
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate">
              {user.isOnline ? 'Still Active' : formatTimestamp(user.lastLogoutAt)}
            </p>
            <p className="text-[10px] text-[#8493A1] mt-1">
              {user.isOnline ? 'Session in progress' : 'Closed session'}
            </p>
          </div>
        </div>

        {/* Detailed Session Logs Timeline */}
        <div className="p-5 rounded-[26px] bg-[#101B24] border border-[#172631] space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#172631]">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <History size={16} className="text-[#7B22FF]" />
                Complete Chronological Session History
              </h3>
              <p className="text-xs text-[#8493A1]">
                Exact log times and active duration for each user visit on the panel.
              </p>
            </div>
            <span className="text-xs font-bold text-[#1687FF] bg-[#1687FF]/10 px-2.5 py-1 rounded-xl">
              {user.sessions.length} recorded sessions
            </span>
          </div>

          {/* Session Cards List */}
          <div className="space-y-3">
            {user.sessions.length === 0 ? (
              <div className="p-8 text-center bg-[#0B141C] rounded-2xl border border-[#172631]">
                <Clock size={28} className="mx-auto text-[#8493A1] mb-2 opacity-40" />
                <p className="text-xs text-[#8493A1]">No login sessions recorded yet.</p>
              </div>
            ) : (
              user.sessions.map((sess, idx) => {
                const sessionNumber = user.sessions.length - idx;
                const isCurrentActive = sess.status === 'ONLINE';

                return (
                  <div
                    key={sess.id || idx}
                    className={`p-4 rounded-2xl border transition ${
                      isCurrentActive
                        ? 'bg-gradient-to-r from-[#00C982]/10 via-[#0E1B24] to-[#101B24] border-[#00C982]/40 shadow-md'
                        : 'bg-[#0B141C] border-[#172631] hover:border-[#1E2E3C]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Session Info */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                            isCurrentActive
                              ? 'bg-[#00C982] text-black shadow-md shadow-[#00C982]/25'
                              : 'bg-[#172631] text-[#8493A1]'
                          }`}
                        >
                          #{sessionNumber}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-white">Visit #{sessionNumber}</span>
                            {isCurrentActive ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#00C982]/20 text-[#00C982] text-[10px] font-black border border-[#00C982]/40 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00C982] animate-ping" />
                                ACTIVE NOW
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-white/5 text-[#8493A1] text-[10px] font-medium border border-white/5">
                                COMPLETED
                              </span>
                            )}
                            <span className="text-[10px] text-[#8493A1] flex items-center gap-1">
                              <Smartphone size={10} /> {sess.device}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2 text-xs text-[#8493A1]">
                            <div>
                              <span className="text-[10px] text-[#8493A1]/70 block">LOGIN TIME</span>
                              <span className="text-white font-medium">{formatTimestamp(sess.loginAt)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-[#8493A1]/70 block">LOGOUT TIME</span>
                              {sess.logoutAt ? (
                                <span className="text-white font-medium">{formatTimestamp(sess.logoutAt)}</span>
                              ) : (
                                <span className="text-[#00C982] font-bold">Still Active (In Progress)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Duration Badge */}
                      <div className="sm:text-right pl-12 sm:pl-0">
                        <span className="text-[10px] uppercase tracking-wider text-[#8493A1] block font-semibold">
                          Session Duration
                        </span>
                        <span
                          className={`text-base font-black ${
                            isCurrentActive ? 'text-[#00C982]' : 'text-[#1687FF]'
                          }`}
                        >
                          {formatDuration(sess.durationSec)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Verification Notice */}
        <div className="p-4 rounded-2xl bg-[#091219] border border-[#172631] text-center text-xs text-[#8493A1] space-y-1">
          <p className="font-semibold text-white flex items-center justify-center gap-1.5">
            <ShieldCheck size={14} className="text-[#00C982]" />
            Official Workforce Security Audit & Presence Verification
          </p>
          <p className="text-[11px] text-[#8493A1]/80">
            This activity pass was generated cryptographically for employee {user.employeeCode}. Session logs are recorded securely via Workforce Presence Engine.
          </p>
        </div>
      </main>
    </div>
  );
};
