import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  Smartphone,
  MessageCircle,
  Download,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useSchedule } from '../context/ScheduleContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { settings, exportScheduleJson } = useSchedule();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let url = window.location.origin || window.location.href;
      // If running inside AI Studio dev instance, convert to the Public Shared Preview URL
      // so friends and coursemates don't get 'access denied'
      if (url.includes('ais-dev-')) {
        url = url.replace('ais-dev-', 'ais-pre-');
      }
      setAppUrl(url);
    }
  }, []);

  useEffect(() => {
    if (isOpen && canvasRef.current && appUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        appUrl,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#020617', // Rich dark slate for maximum camera contrast
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Failed to generate QR Code:', error);
        }
      );
    }
  }, [isOpen, appUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: 'Campus Flow - University Timetable',
      text: `Hey! Check out Campus Flow — Charlie Milan's offline university timetable & voice reminder app. Works 100% offline with loud alarms!`,
      url: appUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User dismissed share sheet, safe to ignore
      }
    } else {
      handleCopy();
    }
  };

  const shareText = encodeURIComponent(
    `Hey! Get Campus Flow — offline timetable & voice reminder app for university students in Ghana. Open & install here: ${appUrl}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Share Campus Flow</h3>
              <p className="text-xs text-slate-400">
                Share with coursemates, study groups & friends
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Important Tip for Public Access */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-emerald-500/30 text-xs text-slate-300 space-y-1">
            <p className="font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              How to enable access for friends:
            </p>
            <p className="text-[11px] text-slate-400">
              In Google AI Studio, click the blue <strong>"Share"</strong> button at the top-right of your screen and select <strong>"Anyone with the link"</strong>. This activates public access so friends don't get "access denied".
            </p>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-950 border border-slate-800 text-center">
            <div className="p-2.5 bg-white rounded-2xl shadow-xl shadow-slate-950">
              <canvas ref={canvasRef} className="rounded-lg" />
            </div>
            <p className="text-xs font-bold text-white mt-3 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-emerald-400" />
              Scan with any phone camera
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Instantly opens Campus Flow on their Android or iPhone to install offline
            </p>
          </div>

          {/* Share Links & Actions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[11px] px-1 font-semibold text-emerald-400">
              <span>Public Link (No Google Sign-In Required)</span>
              <span className="text-[10px] text-slate-400">Works for all friends</span>
            </div>

            {/* Quick Share to WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20 transition active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              Share to WhatsApp Group / Chat
            </a>

            {/* Native Mobile Share Sheet */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                Open Phone Share Menu (Bluetooth / Messages / Telegram)
              </button>
            )}

            {/* Copy Link Input Bar */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 bg-transparent px-2.5 py-1.5 text-xs text-slate-300 font-mono truncate focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  copied
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-white hover:bg-slate-200 text-slate-950'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Export Timetable for Coursemates */}
          <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white">Share Timetable File (.json)</p>
              <p className="text-[11px] text-slate-400">
                Let coursemates import your exact timetable schedule in 1 click
              </p>
            </div>
            <button
              onClick={exportScheduleJson}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition active:scale-95 flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-200 text-slate-950 transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
