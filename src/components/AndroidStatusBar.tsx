import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Mic } from 'lucide-react';

interface AndroidStatusBarProps {
  isMicActive: boolean;
  isBackgroundRunning: boolean;
}

export const AndroidStatusBar: React.FC<AndroidStatusBarProps> = ({
  isMicActive,
  isBackgroundRunning,
}) => {
  const [time, setTime] = useState('10:42');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = d.getHours();
      const m = d.getMinutes().toString().padStart(2, '0');
      setTime(`${h}:${m}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="android-status-bar"
      className="w-full flex items-center justify-between px-6 py-2 text-xs text-white/80 select-none z-30"
    >
      {/* Left side: Time & Notification icons */}
      <div className="flex items-center space-x-2 font-medium">
        <span>{time}</span>
        {isBackgroundRunning && (
          <span className="flex items-center text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 border border-purple-500/40">
            Zoya Active
          </span>
        )}
      </div>

      {/* Center: Punch-hole camera placeholder */}
      <div className="w-3.5 h-3.5 rounded-full bg-black border border-white/10 shadow-inner" />

      {/* Right side: Privacy Indicator & Network/Battery */}
      <div className="flex items-center space-x-2">
        {/* Android Green Privacy Dot when Mic is Recording */}
        {isMicActive && (
          <div
            id="android-mic-privacy-dot"
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse"
            title="Microphone accessed by Zoya"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <Mic className="w-2.5 h-2.5" />
          </div>
        )}
        <span className="text-[11px] font-semibold tracking-wider">5G</span>
        <Wifi className="w-3.5 h-3.5 text-white/80" />
        <div className="flex items-center space-x-1">
          <span className="text-[10px]">98%</span>
          <BatteryMedium className="w-4 h-4 text-white/80" />
        </div>
      </div>
    </div>
  );
};
