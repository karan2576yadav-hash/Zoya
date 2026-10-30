package com.zoya.assistant.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.zoya.assistant.MainActivity
import com.zoya.assistant.audio.WakeWordDetector

class ZoyaForegroundService : Service() {

    private val TAG = "ZoyaForegroundService"
    private val NOTIFICATION_ID = 10101
    private val CHANNEL_ID = "zoya_assistant_channel"

    private var wakeLock: PowerManager.WakeLock? = null
    private var wakeWordDetector: WakeWordDetector? = null

    companion object {
        const val ACTION_START = "ACTION_START"
        const val ACTION_STOP = "ACTION_STOP"
        const val BROADCAST_WAKE_TRIGGERED = "com.zoya.assistant.WAKE_WORD_TRIGGERED"

        fun start(context: Context) {
            val intent = Intent(context, ZoyaForegroundService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, ZoyaForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        // Acquire wake lock to prevent CPU sleep during background wake word monitoring
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Zoya::WakeLockTag")
        wakeLock?.acquire(10 * 60 * 1000L /* 10 minutes timeout */)

        initWakeWordDetector()
    }

    private fun initWakeWordDetector() {
        wakeWordDetector = WakeWordDetector {
            Log.i(TAG, "Wake word 'Zoya' triggered in Foreground Service!")

            // Broadcast to active activity or launch UI
            val broadcastIntent = Intent(BROADCAST_WAKE_TRIGGERED)
            sendBroadcast(broadcastIntent)

            // Bring app to foreground if in background
            val launchIntent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                putExtra("WAKE_TRIGGER", true)
            }
            startActivity(launchIntent)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                startForegroundNotification()
                wakeWordDetector?.startListening()
            }
            ACTION_STOP -> {
                wakeWordDetector?.stopListening()
                stopForeground(true)
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun startForegroundNotification() {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zoya Voice Assistant")
            .setContentText("Listening for 'Zoya' in background • Zero-touch active")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Zoya Voice Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps Zoya listening for wake-word activation without OS termination"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        wakeWordDetector?.stopListening()
        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
        Log.i(TAG, "ZoyaForegroundService destroyed")
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
