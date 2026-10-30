import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, Volume2, Grid, Send, Mail, Play, ExternalLink, X, AlertTriangle } from 'lucide-react';
import { ToolExecutionEvent, Contact } from '../types';
import { MOCK_CONTACTS, MOCK_INSTALLED_APPS } from '../data/mockAndroidData';

interface DeviceIntentsHUDProps {
  activeToolEvent: ToolExecutionEvent | null;
  onDismiss: () => void;
}

export const DeviceIntentsHUD: React.FC<DeviceIntentsHUDProps> = ({
  activeToolEvent,
  onDismiss,
}) => {
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  // Call timer simulation
  useEffect(() => {
    if (activeToolEvent?.toolName === 'searchAndCallContact' && activeToolEvent.status === 'success') {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => {
        clearInterval(interval);
        setCallDuration(0);
      };
    }
  }, [activeToolEvent]);

  if (!activeToolEvent) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Find contact if applicable
  const targetContactName =
    activeToolEvent.args.contactName || activeToolEvent.args.recipientEmail || 'Contact';
  const matchedContact =
    MOCK_CONTACTS.find(
      (c) => c.name.toLowerCase() === targetContactName.toLowerCase() || c.email === targetContactName
    ) || MOCK_CONTACTS[0];

  return (
    <div
      id="device-intents-hud-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-in zoom-in-95 duration-200"
    >
      <div className="w-full max-w-sm rounded-[36px] bg-[#0c0a14] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden text-white relative">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 1. Phone Call Intent (ACTION_CALL) */}
        {activeToolEvent.toolName === 'searchAndCallContact' && (
          <div id="android-call-hud" className="p-6 flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
              Android ACTION_CALL Intent
            </span>

            {/* Avatar with dynamic pulsing ring */}
            <div className="relative mt-8">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-pulse">
                <img
                  src={matchedContact.avatar}
                  alt={matchedContact.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black shadow-lg">
                <Phone className="w-4 h-4 fill-black" />
              </div>
            </div>

            <h3 className="mt-5 text-xl font-bold text-white tracking-wide">
              {activeToolEvent.args.contactName || matchedContact.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">{matchedContact.phone}</p>
            <p className="text-xs text-emerald-400 font-medium mt-2">
              Connected • {formatTimer(callDuration)}
            </p>

            {/* In-Call Controls */}
            <div className="grid grid-cols-3 gap-3 w-full mt-8 px-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <Mic className="w-5 h-5" />
                <span className="text-[10px] mt-1.5 font-medium">{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              <button
                onClick={() => setIsSpeaker(!isSpeaker)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${
                  isSpeaker
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                }`}
              >
                <Volume2 className="w-5 h-5" />
                <span className="text-[10px] mt-1.5 font-medium">Speaker</span>
              </button>

              <button className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 transition-all">
                <Grid className="w-5 h-5" />
                <span className="text-[10px] mt-1.5 font-medium">Keypad</span>
              </button>
            </div>

            {/* End Call Button */}
            <button
              id="end-call-btn"
              onClick={onDismiss}
              className="mt-6 w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)] active:scale-95 transition-transform"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        )}

        {/* 2. WhatsApp Message Deep-Link Intent */}
        {activeToolEvent.toolName === 'sendWhatsAppMessage' && (
          <div id="android-whatsapp-hud" className="p-6 flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
              WhatsApp Intent • com.whatsapp
            </span>

            <div className="w-16 h-16 rounded-full bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366] mt-6 shadow-[0_0_20px_rgba(37,211,102,0.2)]">
              <Send className="w-8 h-8" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-white">
              Sending to {activeToolEvent.args.contactName}
            </h3>
            <p className="text-xs text-zinc-400">{matchedContact.phone}</p>

            {/* WhatsApp message bubble */}
            <div className="w-full mt-5 p-4 rounded-2xl bg-[#005c4b] border border-[#25d366]/20 text-left relative shadow-md">
              <p className="text-xs text-emerald-100 leading-relaxed font-normal">
                {activeToolEvent.args.message}
              </p>
              <div className="flex items-center justify-end space-x-1 mt-2 text-[10px] text-emerald-300/80">
                <span>Just now</span>
                <span>✓✓</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 mt-4 leading-normal">
              Deep-linked via Android URI intent{' '}
              <code className="text-purple-300">whatsapp://send?phone=...</code>
            </p>

            <div className="flex items-center space-x-2 w-full mt-5">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  activeToolEvent.args.message || ''
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onDismiss}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* 3. Open App Intent (packageManager.getLaunchIntentForPackage) */}
        {activeToolEvent.toolName === 'openApp' && (
          <div id="android-open-app-hud" className="p-6 flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
              Android Intent.ACTION_MAIN
            </span>

            {/* App Icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-fuchsia-600 to-cyan-500 p-0.5 mt-6 shadow-[0_0_35px_rgba(168,85,247,0.3)]">
              <div className="w-full h-full rounded-[22px] bg-[#141022] flex items-center justify-center text-white">
                <Play className="w-8 h-8 fill-white text-white ml-0.5" />
              </div>
            </div>

            <h3 className="mt-4 text-xl font-bold text-white">
              {activeToolEvent.args.appName || activeToolEvent.args.packageName}
            </h3>
            <p className="text-xs text-purple-300 font-mono mt-1 px-3 py-1 rounded-lg bg-purple-950/50 border border-purple-500/20">
              {activeToolEvent.args.packageName}
            </p>

            <div className="mt-5 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-zinc-300 text-left w-full space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Package Status:</span>
                <span className="text-emerald-400 font-medium">Verified Installed</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Intent Action:</span>
                <span className="text-cyan-300 font-mono text-[10px]">CATEGORY_LAUNCHER</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Activity Flags:</span>
                <span className="text-zinc-300 font-mono text-[10px]">FLAG_ACTIVITY_NEW_TASK</span>
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="mt-6 w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs tracking-wider uppercase shadow-lg transition-colors"
            >
              Resume Zoya
            </button>
          </div>
        )}

        {/* 4. Send Gmail Intent (ACTION_SENDTO) */}
        {activeToolEvent.toolName === 'sendGmail' && (
          <div id="android-gmail-hud" className="p-6 flex flex-col items-center text-center">
            <span className="text-[10px] uppercase font-bold tracking-widest text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
              Gmail Intent • ACTION_SENDTO
            </span>

            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mt-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <Mail className="w-8 h-8" />
            </div>

            <h3 className="mt-4 text-lg font-bold text-white">Compose Email</h3>

            {/* Email card */}
            <div className="w-full mt-4 p-4 rounded-2xl bg-zinc-900/80 border border-white/10 text-left space-y-2 text-xs">
              <div>
                <span className="text-zinc-400">To: </span>
                <span className="text-white font-medium">{activeToolEvent.args.recipientEmail}</span>
              </div>
              <div className="border-t border-white/5 pt-2">
                <span className="text-zinc-400">Subject: </span>
                <span className="text-white font-medium">{activeToolEvent.args.subject}</span>
              </div>
              <div className="border-t border-white/5 pt-2">
                <p className="text-zinc-300 italic text-[11px]">"{activeToolEvent.args.body}"</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full mt-5">
              <a
                href={`mailto:${activeToolEvent.args.recipientEmail}?subject=${encodeURIComponent(
                  activeToolEvent.args.subject || ''
                )}&body=${encodeURIComponent(activeToolEvent.args.body || '')}`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Launch Mail Client</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onDismiss}
                className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Permission Denied Sassy Alert */}
        {activeToolEvent.status === 'permission_denied' && (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 mt-2">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-pink-300">Permission Denied!</h3>
            <p className="mt-2 text-xs text-purple-200/90 italic leading-relaxed">
              "{activeToolEvent.resultMessage}"
            </p>
            <button
              onClick={onDismiss}
              className="mt-6 w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs"
            >
              Open Permissions Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
