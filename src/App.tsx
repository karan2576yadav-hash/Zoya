import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Shield,
  Layers,
  Sparkles,
  Smartphone,
  PhoneCall,
  MessageSquare,
  Play,
  Mail,
  Volume2,
  RefreshCw,
  Zap,
  Info,
  Usb,
  Cable,
  Download,
  Package,
} from 'lucide-react';
import { AssistantState, PermissionState, ToolExecutionEvent } from './types';
import { ZoyaOrbCanvas } from './components/ZoyaOrbCanvas';
import { AndroidStatusBar } from './components/AndroidStatusBar';
import { ForegroundNotificationBanner } from './components/ForegroundNotificationBanner';
import { PermissionsModal } from './components/PermissionsModal';
import { DeviceIntentsHUD } from './components/DeviceIntentsHUD';
import { KotlinCodeViewer } from './components/KotlinCodeViewer';
import { UsbInstallerModal } from './components/UsbInstallerModal';
import { ApkBuilderModal } from './components/ApkBuilderModal';
import { ZoyaAudioService } from './services/audioService';
import { WakeWordService } from './services/wakeWordService';

const ZOYA_SASSY_QUOTES = [
  "I'm all ears, darling. Make it interesting!",
  'Try to keep up with me, okay?',
  "At your service... though don't get too used to me doing everything.",
  'Tell me what you need, boss. And make it quick!',
  "I'm the smartest thing in this room, obviously.",
  "You called? Don't tell me you broke something already.",
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'assistant' | 'codebase'>('assistant');
  const [state, setState] = useState<AssistantState>('idle');
  const [audioAmplitude, setAudioAmplitude] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("Say 'Zoya' or tap orb to begin");
  const [isBackgroundRunning, setIsBackgroundRunning] = useState<boolean>(true);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [showUsbModal, setShowUsbModal] = useState<boolean>(false);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [activeToolEvent, setActiveToolEvent] = useState<ToolExecutionEvent | null>(null);

  // Android Runtime Permissions state
  const [permissions, setPermissions] = useState<PermissionState>({
    RECORD_AUDIO: true,
    READ_CONTACTS: true,
    CALL_PHONE: true,
    POST_NOTIFICATIONS: true,
  });

  // Services
  const audioServiceRef = useRef<ZoyaAudioService | null>(null);
  const wakeWordServiceRef = useRef<WakeWordService | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize audio & wake-word services
  useEffect(() => {
    audioServiceRef.current = new ZoyaAudioService();

    // Local Wake Word Detector
    wakeWordServiceRef.current = new WakeWordService(() => {
      console.log("[Zoya] Wake-word 'Zoya' triggered awakening!");
      awakenZoya();
    });

    if (isBackgroundRunning) {
      wakeWordServiceRef.current.start();
    }

    return () => {
      audioServiceRef.current?.stopAll();
      wakeWordServiceRef.current?.stop();
      wsRef.current?.close();
    };
  }, []);

  // Sync background service toggle with wake word detector
  useEffect(() => {
    if (isBackgroundRunning) {
      wakeWordServiceRef.current?.start();
    } else {
      wakeWordServiceRef.current?.stop();
    }
  }, [isBackgroundRunning]);

  /**
   * Connect to Gemini Live WebSocket on backend
   */
  const connectLiveWebSocket = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[Zoya Client] Connected to Live WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'audio' && data.audio) {
          setState('speaking');
          setStatusMessage('Zoya speaking...');
          audioServiceRef.current?.playPcmChunk(data.audio);
        } else if (data.type === 'interrupted') {
          console.log('[Zoya Client] Interrupted by user');
          audioServiceRef.current?.handleInterruption();
          setState('listening');
          setStatusMessage("I'm listening, go ahead...");
        } else if (data.type === 'transcription') {
          if (data.sender === 'zoya') {
            setStatusMessage(`"${data.text}"`);
          }
        } else if (data.type === 'tool_call') {
          handleServerToolCalls(data.functionCalls);
        } else if (data.type === 'error') {
          console.warn('[Zoya Client] WS error from server:', data.message);
          // Fallback gracefully
          setState('idle');
          setStatusMessage('Ready. Tap or say "Zoya"!');
        }
      } catch (err) {
        console.error('[Zoya Client] Error parsing WS message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[Zoya Client] WebSocket connection error:', err);
    };

    ws.onclose = () => {
      console.log('[Zoya Client] WebSocket closed');
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };

    wsRef.current = ws;
    return ws;
  }, []);

  /**
   * Awaken Zoya (Voice session start)
   */
  const awakenZoya = async () => {
    if (state !== 'idle') {
      // Toggle off
      stopZoyaSession();
      return;
    }

    if (!permissions.RECORD_AUDIO) {
      setShowPermissionsModal(true);
      return;
    }

    try {
      setState('listening');
      const randomQuote = ZOYA_SASSY_QUOTES[Math.floor(Math.random() * ZOYA_SASSY_QUOTES.length)];
      setStatusMessage(randomQuote);

      const ws = connectLiveWebSocket();

      // Start recording 16kHz PCM audio
      await audioServiceRef.current?.startRecording(
        (base64Pcm16) => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'audio_input',
                audio: base64Pcm16,
              })
            );
          }
        },
        (amplitude) => {
          setAudioAmplitude(amplitude);
          // If user speaks while model is speaking, trigger client interruption
          if (amplitude > 0.08 && state === 'speaking') {
            audioServiceRef.current?.handleInterruption();
            setState('listening');
            setStatusMessage("I'm listening, go ahead...");
          }
        }
      );
    } catch (err: any) {
      console.error('[Zoya] Failed to start microphone:', err);
      setState('error');
      setStatusMessage('Microphone access blocked or unavailable.');
    }
  };

  /**
   * Stop Zoya Session
   */
  const stopZoyaSession = () => {
    audioServiceRef.current?.stopAll();
    setState('idle');
    setAudioAmplitude(0);
    setStatusMessage("Say 'Zoya' or tap orb to begin");
  };

  /**
   * Handle Function Calling / Tool Execution with native Android Intent dispatch
   */
  const handleServerToolCalls = (functionCalls: any[]) => {
    if (!functionCalls || functionCalls.length === 0) return;

    setState('thinking');
    setStatusMessage('Executing native Android tool...');

    for (const call of functionCalls) {
      const name = call.name;
      const args = call.args || {};
      const callId = call.id || 'call_1';

      executeTool(name, args, callId);
    }
  };

  /**
   * Local Tool Execution with Permission Guardrails
   */
  const executeTool = (name: string, args: Record<string, any>, callId?: string) => {
    console.log('[Zoya Tool Execution]', name, args);

    let status: ToolExecutionEvent['status'] = 'success';
    let resultMessage = '';

    if (name === 'searchAndCallContact') {
      if (!permissions.READ_CONTACTS) {
        status = 'permission_denied';
        resultMessage = `Sweetheart, I'd love to call ${args.contactName}, but you haven't given me Contacts permission yet! Turn it on!`;
      } else if (!permissions.CALL_PHONE) {
        status = 'permission_denied';
        resultMessage = `Honey, you haven't granted me Phone Call permission! How am I supposed to dial without it?`;
      } else {
        resultMessage = `Dialing ${args.contactName}... ACTION_CALL intent executed.`;
      }
    } else if (name === 'sendWhatsAppMessage') {
      resultMessage = `Launched WhatsApp URI intent for ${args.contactName}: "${args.message}"`;
    } else if (name === 'openApp') {
      resultMessage = `Launched package ${args.packageName} (${args.appName || 'App'})`;
    } else if (name === 'sendGmail') {
      resultMessage = `Prepared ACTION_SENDTO intent for ${args.recipientEmail}`;
    }

    const event: ToolExecutionEvent = {
      id: callId || String(Date.now()),
      toolName: name as any,
      args,
      status,
      resultMessage,
      timestamp: Date.now(),
    };

    setActiveToolEvent(event);

    // Send tool response back to Gemini Live WebSocket if active
    if (callId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'tool_response',
          functionResponses: [
            {
              id: callId,
              name,
              response: {
                status,
                output: resultMessage,
              },
            },
          ],
        })
      );
    }

    // Sassy voice feedback for the tool
    const sassyLines: Record<string, string> = {
      searchAndCallContact: `Calling ${args.contactName} for you, handsome!`,
      sendWhatsAppMessage: `WhatsApping ${args.contactName}... hope you're being nice!`,
      openApp: `Opening ${args.appName || 'that app'}... don't stay up all night on it!`,
      sendGmail: `Drafting that email to ${args.recipientEmail}. Look at you being professional!`,
    };

    if (status === 'permission_denied') {
      audioServiceRef.current?.speakTextSassy(
        resultMessage,
        () => setState('speaking'),
        () => setState('listening')
      );
    } else if (sassyLines[name]) {
      audioServiceRef.current?.speakTextSassy(
        sassyLines[name],
        () => setState('speaking'),
        () => setState('listening')
      );
    }
  };

  /**
   * Simulation helpers for one-click testing of tools
   */
  const simulateVoiceCommand = (commandType: 'call' | 'whatsapp' | 'youtube' | 'gmail') => {
    setState('thinking');
    setStatusMessage('Analyzing spoken intent...');

    setTimeout(() => {
      switch (commandType) {
        case 'call':
          executeTool('searchAndCallContact', { contactName: 'Alex Vance' });
          break;
        case 'whatsapp':
          executeTool('sendWhatsAppMessage', {
            contactName: 'Mom',
            message: 'Hey Mom! Zoya is helping me organize my schedule today. Love you!',
          });
          break;
        case 'youtube':
          executeTool('openApp', {
            packageName: 'com.google.android.youtube',
            appName: 'YouTube',
          });
          break;
        case 'gmail':
          executeTool('sendGmail', {
            recipientEmail: 'alex.vance@techcorp.io',
            subject: 'Project Sync Update',
            body: 'Hey Alex, Zoya just reminded me about the review notes. Let us touch base soon.',
          });
          break;
      }
    }, 700);
  };

  const handleTogglePermission = (key: keyof PermissionState) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleGrantAllPermissions = () => {
    setPermissions({
      RECORD_AUDIO: true,
      READ_CONTACTS: true,
      CALL_PHONE: true,
      POST_NOTIFICATIONS: true,
    });
    setShowPermissionsModal(false);
  };

  return (
    <div
      id="zoya-app-root"
      className="min-h-screen w-full bg-[#05040a] text-white flex flex-col font-['Outfit'] selection:bg-purple-500/30 overflow-x-hidden"
    >
      {/* Top Header & Switcher */}
      <header className="w-full border-b border-white/10 bg-black/40 backdrop-blur-xl px-4 py-3 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 via-purple-600 to-cyan-400 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <div className="w-full h-full bg-[#0d091a] rounded-[10px] flex items-center justify-center text-cyan-300">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm font-extrabold tracking-widest text-white">ZOYA</h1>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                  v3.1 Flash Live
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Native Android Voice Assistant • Sassy Female Persona
              </p>
            </div>
          </div>

          {/* Tab Switcher & Build APK & USB Install Buttons */}
          <div className="flex items-center space-x-2">
            <button
              id="header-build-apk-btn"
              onClick={() => setShowApkModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 via-fuchsia-600/20 to-cyan-500/20 hover:from-purple-600/40 hover:to-cyan-500/30 border border-purple-500/40 text-purple-200 text-xs font-semibold shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all active:scale-95"
              title="Build and download Android APK"
            >
              <Package className="w-3.5 h-3.5 text-purple-400" />
              <span>Build APK</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-300 font-bold ml-0.5">
                v1.0
              </span>
            </button>

            <button
              id="header-usb-install-btn"
              onClick={() => setShowUsbModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-200 text-xs font-semibold shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all active:scale-95"
              title="Install Zoya on another phone via USB"
            >
              <Usb className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">USB Install</span>
              <span className="sm:hidden">USB</span>
            </button>

            <div className="flex items-center space-x-1 p-1 rounded-2xl bg-white/5 border border-white/10 text-xs">
              <button
                id="tab-live-assistant"
                onClick={() => setActiveTab('assistant')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all font-medium ${
                  activeTab === 'assistant'
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Live Assistant</span>
              </button>
              <button
                id="tab-kotlin-codebase"
                onClick={() => setActiveTab('codebase')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl transition-all font-medium ${
                  activeTab === 'codebase'
                    ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Kotlin Architecture</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6">
        {activeTab === 'codebase' ? (
          <div className="w-full max-w-5xl py-4 animate-in fade-in duration-300">
            <KotlinCodeViewer />
          </div>
        ) : (
          /* Live Android Jetpack Compose Phone Simulator */
          <div
            id="android-device-container"
            className="w-full max-w-sm rounded-[48px] bg-black border-[3px] border-zinc-800 shadow-[0_0_70px_rgba(168,85,247,0.2)] overflow-hidden flex flex-col relative min-h-[660px] animate-in zoom-in-95 duration-300"
          >
            {/* Status Bar */}
            <AndroidStatusBar
              isMicActive={state === 'listening'}
              isBackgroundRunning={isBackgroundRunning}
            />

            {/* Persistent Foreground Notification Banner */}
            <ForegroundNotificationBanner
              isRunning={isBackgroundRunning}
              onToggle={() => setIsBackgroundRunning(!isBackgroundRunning)}
              onWakeZoya={awakenZoya}
            />

            {/* Central Zoya Presence */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-3 select-none">
              {/* Title & Status Subtitle */}
              <div className="text-center">
                <h2 className="text-2xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-300">
                  ZOYA
                </h2>
                <div className="mt-1 h-12 flex items-center justify-center">
                  <p
                    className={`text-xs px-3 py-1 rounded-full font-medium transition-colors max-w-[260px] line-clamp-2 ${
                      state === 'listening'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                        : state === 'thinking'
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                        : state === 'speaking'
                        ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40'
                        : state === 'error'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : 'bg-white/5 text-zinc-400 border border-white/5'
                    }`}
                  >
                    {statusMessage}
                  </p>
                </div>
              </div>

              {/* Animated Interactive Compose Canvas Orb */}
              <div className="my-2">
                <ZoyaOrbCanvas
                  state={state}
                  audioAmplitude={audioAmplitude}
                  analyserNode={audioServiceRef.current?.getAnalyser()}
                  onClick={awakenZoya}
                />
              </div>

              {/* State label & Audio wave meter */}
              <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span className="uppercase tracking-wider font-semibold text-zinc-300">
                  {state} State
                </span>
                <span>•</span>
                <span className="text-purple-300">Continuous 16kHz Stream</span>
              </div>
            </div>

            {/* Quick Test Voice Commands Bar */}
            <div className="px-4 pb-3">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block text-center mb-2">
                Quick Spoken Commands (Tools)
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  id="test-call-tool-btn"
                  onClick={() => simulateVoiceCommand('call')}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 flex items-center space-x-2 text-[11px] text-zinc-300 transition-all text-left group"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="truncate">"Call Alex"</span>
                </button>

                <button
                  id="test-whatsapp-tool-btn"
                  onClick={() => simulateVoiceCommand('whatsapp')}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-emerald-500/30 flex items-center space-x-2 text-[11px] text-zinc-300 transition-all text-left group"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="truncate">"WhatsApp Mom"</span>
                </button>

                <button
                  id="test-youtube-tool-btn"
                  onClick={() => simulateVoiceCommand('youtube')}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 flex items-center space-x-2 text-[11px] text-zinc-300 transition-all text-left group"
                >
                  <Play className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                  <span className="truncate">"Open YouTube"</span>
                </button>

                <button
                  id="test-gmail-tool-btn"
                  onClick={() => simulateVoiceCommand('gmail')}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/30 flex items-center space-x-2 text-[11px] text-zinc-300 transition-all text-left group"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="truncate">"Send Gmail"</span>
                </button>
              </div>

              {/* Dual Action: Build APK & USB Install */}
              <div className="grid grid-cols-2 gap-2 mt-2.5">
                <button
                  id="phone-build-apk-trigger"
                  onClick={() => setShowApkModal(true)}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-purple-950/70 to-fuchsia-950/60 hover:from-purple-900/80 hover:to-fuchsia-900/80 border border-purple-500/40 text-purple-200 flex items-center justify-between text-[11px] font-semibold transition-all group active:scale-[0.98] shadow-sm"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <div className="p-1 rounded-lg bg-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform shrink-0">
                      <Package className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">APK Build करें</span>
                  </div>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-300 font-mono shrink-0 ml-1">
                    v1.0
                  </span>
                </button>

                <button
                  id="phone-usb-installer-trigger"
                  onClick={() => setShowUsbModal(true)}
                  className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-cyan-950/70 to-blue-950/60 hover:from-cyan-900/80 hover:to-blue-900/80 border border-cyan-500/40 text-cyan-200 flex items-center justify-between text-[11px] font-semibold transition-all group active:scale-[0.98] shadow-sm"
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform shrink-0">
                      <Usb className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">USB Install</span>
                  </div>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/30 text-cyan-300 font-mono shrink-0 ml-1">
                    ADB
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom Actions Floating Bar */}
            <div className="p-4 bg-gradient-to-t from-black via-black/80 to-transparent border-t border-white/5 flex items-center justify-between">
              {/* Permissions Button */}
              <button
                id="open-permissions-btn"
                onClick={() => setShowPermissionsModal(true)}
                className="p-3 rounded-2xl bg-zinc-900 border border-white/10 hover:border-purple-500/40 text-purple-300 hover:text-white transition-colors flex items-center space-x-1.5 text-xs font-medium"
                title="Permissions Guardrails"
              >
                <Shield className="w-4 h-4" />
                <span className="text-[11px]">Permissions</span>
              </button>

              {/* Center Giant Mic/Power Orb */}
              <button
                id="main-mic-orb-btn"
                onClick={awakenZoya}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${
                  state === 'listening'
                    ? 'bg-gradient-to-tr from-cyan-500 to-emerald-400 text-black shadow-[0_0_25px_rgba(0,229,255,0.5)] animate-pulse'
                    : state === 'speaking'
                    ? 'bg-gradient-to-tr from-fuchsia-600 to-pink-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.5)]'
                    : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:brightness-110'
                }`}
                title={state === 'idle' ? 'Awaken Zoya' : 'Stop Session'}
              >
                {state === 'idle' ? (
                  <Mic className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </button>

              {/* Wake Word Manual Trigger */}
              <button
                id="manual-wake-btn"
                onClick={() => wakeWordServiceRef.current?.triggerManualWake()}
                className="p-3 rounded-2xl bg-zinc-900 border border-white/10 hover:border-cyan-500/40 text-cyan-300 hover:text-white transition-colors flex items-center space-x-1.5 text-xs font-medium"
                title="Simulate Wake Word 'Zoya'"
              >
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px]">Wake "Zoya"</span>
              </button>
            </div>

            {/* Android Navigation Bar gesture pill */}
            <div className="w-full flex justify-center pb-2 pt-1">
              <div className="w-28 h-1 rounded-full bg-white/20" />
            </div>
          </div>
        )}
      </main>

      {/* Permissions Onboarding Modal */}
      <PermissionsModal
        permissions={permissions}
        onTogglePermission={handleTogglePermission}
        onGrantAll={handleGrantAllPermissions}
        onClose={() => setShowPermissionsModal(false)}
        isOpen={showPermissionsModal}
      />

      {/* USB Phone Installer Modal */}
      <UsbInstallerModal
        isOpen={showUsbModal}
        onClose={() => setShowUsbModal(false)}
      />

      {/* APK Builder & Exporter Modal */}
      <ApkBuilderModal
        isOpen={showApkModal}
        onClose={() => setShowApkModal(false)}
        onOpenUsbModal={() => setShowUsbModal(true)}
      />

      {/* Device Intent Execution HUD (Phone Call / WhatsApp / App Launch / Gmail) */}
      <DeviceIntentsHUD
        activeToolEvent={activeToolEvent}
        onDismiss={() => setActiveToolEvent(null)}
      />

      {/* Footer Info */}
      <footer className="w-full border-t border-white/5 py-3 px-4 text-center text-xs text-zinc-500">
        <p>
          Google AI Studio • Native Android Voice Assistant Zoya • Gemini Live API
          (gemini-3.1-flash-live-preview)
        </p>
      </footer>
    </div>
  );
}
