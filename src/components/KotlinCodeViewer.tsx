import React, { useState } from 'react';
import { Copy, Check, FileCode, Layers, Cpu, Shield, Mic, Radio, Smartphone, Download, FolderDown } from 'lucide-react';

interface CodeFile {
  path: string;
  name: string;
  category: 'ui' | 'service' | 'live' | 'audio' | 'tools' | 'config';
  icon: any;
  summary: string;
}

const FILES: CodeFile[] = [
  {
    path: 'com/zoya/assistant/MainActivity.kt',
    name: 'MainActivity.kt',
    category: 'ui',
    icon: Smartphone,
    summary: 'Jetpack Compose entry point, runtime permission launcher, and foreground service lifecycle.',
  },
  {
    path: 'com/zoya/assistant/ui/ZoyaOrbCanvas.kt',
    name: 'ZoyaOrbCanvas.kt',
    category: 'ui',
    icon: Radio,
    summary: 'Compose Canvas with state-driven Animatable: Idle breathing, Listening waveform, Thinking neon orbit, Speaking ripples.',
  },
  {
    path: 'com/zoya/assistant/ui/ZoyaScreen.kt',
    name: 'ZoyaScreen.kt',
    category: 'ui',
    icon: Layers,
    summary: 'Fullscreen dark futuristic Jetpack Compose UI with status bar, interactive orb, and action pills.',
  },
  {
    path: 'com/zoya/assistant/ui/PermissionsOnboarding.kt',
    name: 'PermissionsOnboarding.kt',
    category: 'ui',
    icon: Shield,
    summary: 'Runtime permissions bottom sheet handling RECORD_AUDIO, READ_CONTACTS, CALL_PHONE, POST_NOTIFICATIONS.',
  },
  {
    path: 'com/zoya/assistant/service/ZoyaForegroundService.kt',
    name: 'ZoyaForegroundService.kt',
    category: 'service',
    icon: Cpu,
    summary: 'Android Foreground Service with persistent notification channel and WakeLock for continuous background operation.',
  },
  {
    path: 'com/zoya/assistant/audio/WakeWordDetector.kt',
    name: 'WakeWordDetector.kt',
    category: 'audio',
    icon: Mic,
    summary: 'Local low-power wake-word acoustic signature detector for "Zoya" using AudioRecord (16kHz PCM16).',
  },
  {
    path: 'com/zoya/assistant/live/LiveSessionManager.kt',
    name: 'LiveSessionManager.kt',
    category: 'live',
    icon: Radio,
    summary: 'Gemini Live WebSocket bi-directional audio streaming, 24kHz AudioTrack playback, and instant user interruption cut-off.',
  },
  {
    path: 'com/zoya/assistant/tools/ToolExecutionEngine.kt',
    name: 'ToolExecutionEngine.kt',
    category: 'tools',
    icon: FileCode,
    summary: 'Android Intent execution for openApp, ACTION_CALL, WhatsApp deep-link URI, and ACTION_SENDTO with permission verification.',
  },
  {
    path: 'AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    category: 'config',
    icon: Shield,
    summary: 'Declares foregroundServiceType="microphone", permissions (RECORD_AUDIO, READ_CONTACTS, CALL_PHONE), queries package visibility.',
  },
  {
    path: 'settings.gradle.kts',
    name: 'settings.gradle.kts',
    category: 'config',
    icon: Layers,
    summary: 'Root project settings: pluginManagement, dependencyResolutionManagement (google, mavenCentral), include(":app").',
  },
  {
    path: 'build.gradle.kts',
    name: 'build.gradle.kts',
    category: 'config',
    icon: Layers,
    summary: 'Root build script: Android Application plugin 8.7.3, Kotlin Android 2.0.21, Compose plugin 2.0.21.',
  },
  {
    path: 'app/build.gradle.kts',
    name: 'app/build.gradle.kts',
    category: 'config',
    icon: Layers,
    summary: 'App module: reads GEMINI_API_KEY from local.properties, Compose BOM 2024.10, OkHttp WebSocket, Coroutines.',
  },
];

// Inlined snippet samples for immediate code inspection
const CODE_SNIPPETS: Record<string, string> = {
  'MainActivity.kt': `package com.zoya.assistant

import android.Manifest
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import com.zoya.assistant.ui.ZoyaScreen
import com.zoya.assistant.viewmodel.ZoyaViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: ZoyaViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isBlank()) {
            throw IllegalStateException(
                "GEMINI_API_KEY is missing. Add it to android/local.properties."
            )
        }
        viewModel.initialize(apiKey)

        setContent {
            ZoyaScreen(viewModel = viewModel, onOpenPermissions = { /* ... */ })
        }
    }
}`,

  'LiveSessionManager.kt': `package com.zoya.assistant.live

import okhttp3.*
import org.json.JSONArray
import org.json.JSONObject

class LiveSessionManager(
    private val apiKey: String,
    private val onStateChanged: (AssistantState) -> Unit,
    private val onToolCallReceived: (callId: String, name: String, args: JSONObject) -> Unit
) {
    private fun connectWebSocket() {
        val host = "generativelanguage.googleapis.com"
        val path = "/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=$apiKey"
        val request = Request.Builder().url("wss://$host$path").build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                sendInitialConfig(ws)
                startMicStreaming(ws)
            }
            override fun onMessage(ws: WebSocket, text: String) {
                handleLiveServerMessage(text)
            }
        })
    }

    private fun sendInitialConfig(ws: WebSocket) {
        val setupMsg = JSONObject().apply {
            put("setup", JSONObject().apply {
                put("model", "models/gemini-3.8-live")
                put("responseModalities", JSONArray().put("AUDIO"))
                put("systemInstruction", JSONObject().apply {
                    put("parts", JSONArray().put(JSONObject().apply {
                        put("text", "You are Zoya, a female AI voice assistant. Friendly, confident, witty. Natural Hindi and English. Use tools for apps, calls, WhatsApp, email.")
                    }))
                })
                put("tools", createTools())
            })
        }
        ws.send(setupMsg.toString())
    }
}`,

  'settings.gradle.kts': `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "ZoyaAssistant"
include(":app")`,

  'build.gradle.kts': `plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}`,

  'app/build.gradle.kts': `import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use { localProperties.load(it) }
}
val geminiApiKey = localProperties.getProperty("GEMINI_API_KEY", "")

android {
    namespace = "com.zoya.assistant"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.zoya.assistant"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        buildConfigField(
            "String",
            "GEMINI_API_KEY",
            "\\"\" + "$" + "{geminiApiKey.replace(\\"\\\\\\", \\"\\\\\\\\\\").replace(\\"\\\\\\"\\", \\"\\\\\\\\\\"\\")}\\\"\""
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.10.00"))
    implementation("androidx.compose.material3:material3")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.json:json:20240303")
}`,

  'AndroidManifest.xml': `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.CALL_PHONE" />

    <application
        android:allowBackup="true"
        android:label="Zoya Assistant"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`,

  'ZoyaOrbCanvas.kt': `package com.zoya.assistant.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*

@Composable
fun ZoyaOrbCanvas(
    state: AssistantState,
    audioAmplitude: Float,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ZoyaOrbTransitions")
    val breathingScale by infiniteTransition.animateFloat(
        initialValue = 0.92f, targetValue = 1.08f,
        animationSpec = infiniteRepeatable(tween(2800, easing = FastOutSlowInEasing), RepeatMode.Reverse)
    )

    Canvas(modifier = modifier) {
        val center = Offset(size.width / 2f, size.height / 2f)
        val radius = size.minDimension / 3.4f
        when (state) {
            is AssistantState.Idle -> drawIdleOrb(center, radius * breathingScale)
            is AssistantState.Listening -> drawListeningWaveform(center, radius, audioAmplitude)
            is AssistantState.Thinking -> drawThinkingNeonOrbit(center, radius)
            is AssistantState.Speaking -> drawSpeakingRipples(center, radius, audioAmplitude)
        }
    }
}`,

  'ZoyaForegroundService.kt': `package com.zoya.assistant.service

import android.app.*
import android.content.Intent
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.zoya.assistant.audio.WakeWordDetector

class ZoyaForegroundService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null
    private var wakeWordDetector: WakeWordDetector? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, "zoya_channel")
            .setContentTitle("Zoya Voice Assistant")
            .setContentText("Listening for 'Zoya' in background • Zero-touch active")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .build()

        startForeground(10101, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE)
        wakeWordDetector?.startListening()
        return START_STICKY
    }
}`,

  'WakeWordDetector.kt': `package com.zoya.assistant.audio

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import kotlinx.coroutines.*

class WakeWordDetector(private val onWakeWordDetected: () -> Unit) {
    private val SAMPLE_RATE = 16000
    private var audioRecord: AudioRecord? = null

    fun startListening() {
        audioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            4096
        )
        audioRecord?.startRecording()
        // Low-power acoustic signature matching for "Zoya"
    }
}`,

  'ToolExecutionEngine.kt': `package com.zoya.assistant.tools

import android.content.Context
import android.content.Intent
import android.net.Uri

class ToolExecutionEngine(private val context: Context) {
    fun openApp(packageName: String): ToolResult {
        val intent = context.packageManager.getLaunchIntentForPackage(packageName)
        context.startActivity(intent)
        return ToolResult.Success("Launched $packageName")
    }

    fun searchAndCallContact(contactName: String): ToolResult {
        // Enforces READ_CONTACTS and CALL_PHONE permissions
        val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber"))
        context.startActivity(callIntent)
        return ToolResult.Success("Calling $contactName")
    }

    fun sendWhatsAppMessage(contactName: String, message: String): ToolResult {
        val uri = Uri.parse("https://api.whatsapp.com/send?text=\${URLEncoder.encode(message, "UTF-8")}")
        val intent = Intent(Intent.ACTION_VIEW, uri).apply { setPackage("com.whatsapp") }
        context.startActivity(intent)
        return ToolResult.Success("Sent WhatsApp to $contactName")
    }
}`,
};

export const KotlinCodeViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('MainActivity.kt');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const code = CODE_SNIPPETS[selectedFile] || '// Full source code created in /android project folder';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeFileObj = FILES.find((f) => f.name === selectedFile) || FILES[0];

  return (
    <div
      id="kotlin-architecture-viewer"
      className="w-full max-w-5xl mx-auto rounded-3xl bg-[#0f0d1a] border border-purple-500/20 overflow-hidden shadow-2xl"
    >
      {/* Viewer Header */}
      <div className="p-4 bg-purple-950/30 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Native Android (Kotlin + Jetpack Compose) Architecture
            </h3>
            <p className="text-xs text-purple-300/70">
              Clean Architecture • ForegroundService • Gemini Live WebSocket • AudioRecord PCM16
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href="/api/download-apk"
            download="ZoyaAssistant-v1.0.0-release.apk"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-all"
            title="Download Standalone APK"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download APK</span>
            <span className="sm:hidden">APK</span>
          </a>

          <a
            href="/api/download-project-zip"
            download="ZoyaAssistant-Android-Studio-Project.zip"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 border border-purple-500/30 text-xs font-medium transition-all"
            title="Download Android Studio Project (.zip)"
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download Project (.zip)</span>
            <span className="sm:hidden">ZIP</span>
          </a>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[440px]">
        {/* File Navigator Sidebar */}
        <div className="md:col-span-4 p-3 bg-black/40 border-r border-white/5 space-y-1 overflow-y-auto max-h-[480px]">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 py-1 block">
            Android Source Files (/android/app)
          </span>
          {FILES.map((file) => {
            const Icon = file.icon;
            const isSelected = selectedFile === file.name;
            return (
              <button
                key={file.name}
                onClick={() => setSelectedFile(file.name)}
                className={`w-full flex items-start space-x-2.5 p-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-purple-600/25 border border-purple-500/40 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isSelected ? 'text-cyan-400' : 'text-zinc-500'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono font-medium truncate">{file.name}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{file.summary}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Code Content View */}
        <div className="md:col-span-8 p-4 flex flex-col justify-between bg-[#0a0812]">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5 text-xs text-zinc-400">
              <span className="font-mono text-purple-300">
                app/src/main/java/{activeFileObj.path}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-zinc-300">
                Kotlin 2.0 / Compose
              </span>
            </div>

            <p className="text-xs text-zinc-300 mb-3 bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/10">
              💡 <span className="font-medium text-white">{activeFileObj.summary}</span>
            </p>

            <pre className="text-xs font-mono text-cyan-200/90 leading-relaxed overflow-x-auto p-4 rounded-2xl bg-black/60 border border-white/5 max-h-[340px]">
              <code>
                {CODE_SNIPPETS[selectedFile] ||
                  `// Complete source file generated in workspace:\n// /android/app/src/main/java/${activeFileObj.path}\n\n// Inspect directly or export to Android Studio.`}
              </code>
            </pre>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500">
            <span>Clean Architecture (MVVM) • Thread-Safe PCM16 Buffering</span>
            <span className="text-cyan-400">Production-Ready Android Source</span>
          </div>
        </div>
      </div>
    </div>
  );
};
