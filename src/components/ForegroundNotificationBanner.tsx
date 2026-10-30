import React from 'react';
import { Sparkles, Power, Volume2, ShieldCheck } from 'lucide-react';

interface ForegroundNotificationBannerProps {
  isRunning: boolean;
  onToggle: () => void;
  onWakeZoya: () => void;
}

export const ForegroundNotificationBanner: React.FC<ForegroundNotificationBannerProps> = ({
  isRunning,
  onToggle,
  onWakeZoya,
}) => {
  return (
    <div
      id="foreground-notification-banner"
      className="w-full max-w-md mx-auto px-4 py-2 transition-all duration-300"
    >
      <div
        className={`rounded-2xl p-3 backdrop-blur-md border transition-all duration-300 ${
          isRunning
            ? 'bg-purple-950/40 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
            : 'bg-zinc-900/60 border-white/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            onClick={onWakeZoya}
            className="flex items-center space-x-3 cursor-pointer group flex-1"
            title="Click to awaken Zoya"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                isRunning
                  ? 'bg-gradient-to-tr from-purple-600 to-cyan-400 text-white shadow-lg'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white tracking-wide">
                  ZOYA FOREGROUND SERVICE
                </span>
                {isRunning && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-300/90 leading-tight">
                {isRunning
                  ? 'Listening for "Zoya" in background • Zero-touch active'
                  : 'Service paused • Tap to enable background wake-word'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 pl-2">
            <button
              id="toggle-foreground-service-btn"
              onClick={onToggle}
              className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                isRunning
                  ? 'bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30'
                  : 'bg-purple-600/30 text-purple-200 border-purple-500/40 hover:bg-purple-600/50'
              }`}
              title={isRunning ? 'Stop Background Service' : 'Start Foreground Service'}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
