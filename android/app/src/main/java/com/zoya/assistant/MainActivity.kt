package com.zoya.assistant

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PermContactCalendar
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.*
import androidx.core.content.ContextCompat
import com.zoya.assistant.service.ZoyaForegroundService
import com.zoya.assistant.ui.PermissionItem
import com.zoya.assistant.ui.PermissionsOnboarding
import com.zoya.assistant.ui.ZoyaScreen
import com.zoya.assistant.viewmodel.ZoyaViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: ZoyaViewModel by viewModels()
    private var showPermissionsSheet by mutableStateOf(false)

    private val requiredPermissions = buildList {
        add(Manifest.permission.RECORD_AUDIO)
        add(Manifest.permission.READ_CONTACTS)
        add(Manifest.permission.CALL_PHONE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        val allGranted = results.values.all { it }
        if (allGranted) {
            showPermissionsSheet = false
        }
    }

    private val wakeWordReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ZoyaForegroundService.BROADCAST_WAKE_TRIGGERED) {
                viewModel.triggerWakeWordAwakening()
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Inject Gemini API Key securely from BuildConfig or Secret Manager
        val apiKey = BuildConfig.GEMINI_API_KEY

        if (apiKey.isBlank()) {
            throw IllegalStateException(
                "GEMINI_API_KEY is missing. Add it to android/local.properties."
            )
        }

        viewModel.initialize(apiKey)

        // Check if wake-word launched this activity
        if (intent.getBooleanExtra("WAKE_TRIGGER", false)) {
            viewModel.triggerWakeWordAwakening()
        }

        // Register receiver for background wake-word triggers
        ContextCompat.registerReceiver(
            this,
            wakeWordReceiver,
            IntentFilter(ZoyaForegroundService.BROADCAST_WAKE_TRIGGERED),
            ContextCompat.RECEIVER_NOT_EXPORTED
        )

        // Check initial permissions
        val hasMissingPermissions = requiredPermissions.any {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (hasMissingPermissions) {
            showPermissionsSheet = true
        }

        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                ZoyaScreen(
                    viewModel = viewModel,
                    onOpenPermissions = { showPermissionsSheet = true }
                )

                if (showPermissionsSheet) {
                    val permissionItems = listOf(
                        PermissionItem(
                            permission = Manifest.permission.RECORD_AUDIO,
                            title = "Microphone Access",
                            description = "Required for real-time voice streaming and zero-touch interaction.",
                            icon = Icons.Default.Mic,
                            isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED,
                            sassyDemand = "Without this, I'm deaf as a post, sweetie!"
                        ),
                        PermissionItem(
                            permission = Manifest.permission.READ_CONTACTS,
                            title = "Contacts Provider",
                            description = "Enables Zoya to search and dial contacts via voice.",
                            icon = Icons.Default.PermContactCalendar,
                            isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED,
                            sassyDemand = "How am I gonna know who your ex is without contacts?"
                        ),
                        PermissionItem(
                            permission = Manifest.permission.CALL_PHONE,
                            title = "Phone Dialer",
                            description = "Enables hands-free ACTION_CALL execution.",
                            icon = Icons.Default.Phone,
                            isGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED,
                            sassyDemand = "Let me make calls or keep dialing with your thumbs."
                        ),
                        PermissionItem(
                            permission = "POST_NOTIFICATIONS",
                            title = "Foreground Notifications",
                            description = "Ensures the background service stays alive without OS battery termination.",
                            icon = Icons.Default.Notifications,
                            isGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                            } else true,
                            sassyDemand = "Turn this on so Android's task-killer doesn't murder me!"
                        )
                    )

                    PermissionsOnboarding(
                        permissions = permissionItems,
                        onRequestAll = {
                            permissionLauncher.launch(requiredPermissions.toTypedArray())
                        },
                        onDismiss = {
                            showPermissionsSheet = false
                        }
                    )
                }
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(wakeWordReceiver)
    }
}
