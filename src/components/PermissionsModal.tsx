import React from 'react';
import { Mic, Users, PhoneCall, Bell, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { PermissionState } from '../types';

interface PermissionsModalProps {
  permissions: PermissionState;
  onTogglePermission: (key: keyof PermissionState) => void;
  onGrantAll: () => void;
  onClose: () => void;
  isOpen: boolean;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  permissions,
  onTogglePermission,
  onGrantAll,
  onClose,
  isOpen,
}) => {
  if (!isOpen) return null;

  const permissionList = [
    {
      key: 'RECORD_AUDIO' as const,
      title: 'Microphone (RECORD_AUDIO)',
      desc: 'Required for real-time bi-directional audio streaming and continuous wake-word listening.',
      icon: Mic,
      sassyDemand: 'Without this, I am deaf as a post, sweetie! Turn it on!',
    },
    {
      key: 'READ_CONTACTS' as const,
      title: 'Contacts Provider (READ_CONTACTS)',
      desc: 'Allows Zoya to locate contacts when calling or messaging.',
      icon: Users,
      sassyDemand: 'How am I gonna know who your favorite person is without contacts, babe?',
    },
    {
      key: 'CALL_PHONE' as const,
      title: 'Phone Dialer (CALL_PHONE)',
      desc: 'Enables Zoya to automatically initiate hands-free phone calls via ACTION_CALL.',
      icon: PhoneCall,
      sassyDemand: 'Give me dialing power or keep tapping numbers with your thumbs!',
    },
    {
      key: 'POST_NOTIFICATIONS' as const,
      title: 'Notifications (POST_NOTIFICATIONS)',
      desc: 'Permits Foreground Service notifications to prevent OS battery killing in background.',
      icon: Bell,
      sassyDemand: "Turn this on so Android's task killer doesn't murder me while you sleep.",
    },
  ];

  const allGranted = Object.values(permissions).every(Boolean);

  return (
    <div
      id="permissions-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="permissions-modal-sheet"
        className="w-full max-w-lg bg-[#120f1d] border border-purple-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(168,85,247,0.25)] text-white"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Permissions Onboarding
              </h2>
              <p className="text-xs text-purple-300/80">
                Jetpack Compose Runtime Access Guardrails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sassy Persona Quote */}
        <div className="mt-4 p-3 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200/90 leading-relaxed italic">
          "Look darling, I can't be your fabulous, all-knowing personal assistant if you keep me locked in a box. Grant these permissions so we can have some real fun."
        </div>

        {/* Permission Rows */}
        <div className="mt-5 space-y-3">
          {permissionList.map(({ key, title, desc, icon: Icon, sassyDemand }) => {
            const isGranted = permissions[key];
            return (
              <div
                key={key}
                onClick={() => onTogglePermission(key)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isGranted
                    ? 'bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-500/50'
                    : 'bg-zinc-900/50 border-white/10 hover:border-pink-500/40'
                }`}
              >
                <div className="flex items-start space-x-3.5 pr-2">
                  <div
                    className={`mt-0.5 p-2 rounded-xl transition-colors ${
                      isGranted ? 'bg-cyan-500/20 text-cyan-400' : 'bg-pink-500/10 text-pink-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">{title}</span>
                      {isGranted ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-medium">
                          Granted
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-medium">
                          Denied
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {isGranted ? desc : sassyDemand}
                    </p>
                  </div>
                </div>

                {/* Toggle Switch */}
                <div
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    isGranted ? 'bg-cyan-500' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isGranted ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            id="grant-all-permissions-btn"
            onClick={onGrantAll}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 text-white font-semibold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Grant All & Awaken Zoya</span>
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
