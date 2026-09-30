import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Download,
  ShieldCheck,
  Clock,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import type { UserActivity } from '../../types';

interface UserActivityQrModalProps {
  user: UserActivity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const UserActivityQrModal: React.FC<UserActivityQrModalProps> = ({
  user,
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const verificationUrl = user
    ? `${window.location.origin}/verify-log/${user.employeeCode}`
    : '';

  useEffect(() => {
    if (isOpen && user) {
      setIsGenerating(true);
      QRCode.toDataURL(
        verificationUrl,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
          errorCorrectionLevel: 'H',
        },
        (err, url) => {
          setIsGenerating(false);
          if (!err && url) {
            setQrDataUrl(url);
          } else {
            console.error('QR generation error:', err);
          }
        }
      );
    }
  }, [isOpen, user, verificationUrl]);

  if (!isOpen || !user) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    toast.success('Activity Log Verification link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `Workforce_Log_QR_${user.employeeCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code downloaded successfully!');
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m ${totalSeconds % 60}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-[28px] bg-gradient-to-b from-[#121E2A] via-[#0E1720] to-[#0A1118] border border-[#7B22FF]/40 p-6 text-white shadow-2xl shadow-[#7B22FF]/20 overflow-hidden">
        {/* Neon Glow Blobs */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-[#7B22FF]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-[#00C982]/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10 pb-4 border-b border-[#1E2E3C]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7B22FF] to-[#00C982] p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full rounded-[10px] bg-[#0E1720] flex items-center justify-center text-[#00C982]">
                <QrCode size={20} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                Activity Log QR Pass
                <span className="px-1.5 py-0.5 rounded-full bg-[#00C982]/20 text-[#00C982] text-[9px] font-black border border-[#00C982]/40">
                  VERIFIED
                </span>
              </h3>
              <p className="text-[11px] text-[#8493A1]">Scan to view real-time log details</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A2834] text-[#8493A1] hover:text-white hover:bg-[#223544] flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* User Badge Info */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#091219] border border-[#1E2E3C] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar}
              alt={user.name}
              className="w-11 h-11 rounded-xl object-cover border border-[#7B22FF]/40 shadow-sm"
            />
            <div>
              <h4 className="text-xs font-bold text-white">{user.name}</h4>
              <p className="text-[10px] text-[#8493A1]">
                {user.employeeCode} • {user.department}
              </p>
            </div>
          </div>

          <div>
            {user.isOnline ? (
              <span className="px-2 py-0.5 rounded-full bg-[#00C982]/20 text-[#00C982] text-[10px] font-bold border border-[#00C982]/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C982] animate-ping" />
                ONLINE NOW
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-[#1E2E3C] text-[#8493A1] text-[10px] font-medium border border-white/5">
                OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* QR Code Container */}
        <div className="my-5 flex flex-col items-center justify-center relative z-10">
          <div className="relative p-4 rounded-3xl bg-white shadow-2xl shadow-[#7B22FF]/25 border-4 border-[#7B22FF]/60 flex items-center justify-center">
            {/* Viewfinder Corners */}
            <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-[#00C982] rounded-tl-lg" />
            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-[#00C982] rounded-tr-lg" />
            <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-[#00C982] rounded-bl-lg" />
            <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-[#00C982] rounded-br-lg" />

            {isGenerating || !qrDataUrl ? (
              <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-800 gap-2">
                <div className="w-8 h-8 border-3 border-[#7B22FF] border-t-transparent rounded-full animate-spin" />
                <span className="text-[11px] font-bold text-slate-600">Generating Secure QR...</span>
              </div>
            ) : (
              <img
                src={qrDataUrl}
                alt={`QR Code for ${user.name}`}
                className="w-56 h-56 object-contain block rounded-xl"
              />
            )}
          </div>

          <div className="mt-3.5 flex items-center gap-1.5 text-[11px] text-[#00C982] font-semibold">
            <Smartphone size={14} />
            <span>Scan with any Mobile Camera to view log details</span>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-3 w-full grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-xl bg-[#0B151E] border border-[#1E2E3C]">
              <span className="text-[9px] uppercase tracking-wider text-[#8493A1] block font-semibold">
                Total Time Online
              </span>
              <span className="text-xs font-black text-[#1687FF]">
                {formatDuration(user.totalOnlineSec)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[#0B151E] border border-[#1E2E3C]">
              <span className="text-[9px] uppercase tracking-wider text-[#8493A1] block font-semibold">
                Logged Visits
              </span>
              <span className="text-xs font-black text-white">
                {user.sessions.length} Sessions
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 relative z-10 pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#1A2834] hover:bg-[#223544] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#1E2E3C]"
            >
              {copied ? <Check size={14} className="text-[#00C982]" /> : <Copy size={14} />}
              <span>{copied ? 'Link Copied!' : 'Copy Verification URL'}</span>
            </button>

            <button
              onClick={handleDownloadQr}
              className="py-2.5 px-3 rounded-xl bg-[#1A2834] hover:bg-[#223544] text-[#8493A1] hover:text-white transition border border-[#1E2E3C]"
              title="Download QR Image"
            >
              <Download size={14} />
            </button>
          </div>

          <a
            href={verificationUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7B22FF] to-[#A83DF4] hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-[#7B22FF]/25 transition"
          >
            <span>Open Activity Log Details Page</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
};
