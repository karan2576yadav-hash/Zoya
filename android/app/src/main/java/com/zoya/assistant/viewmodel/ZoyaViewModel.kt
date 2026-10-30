package com.zoya.assistant.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.zoya.assistant.live.AssistantState
import com.zoya.assistant.live.LiveSessionManager
import com.zoya.assistant.service.ZoyaForegroundService
import com.zoya.assistant.tools.ToolExecutionEngine
import com.zoya.assistant.tools.ToolResult
import com.zoya.assistant.ui.PermissionItem
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject

class ZoyaViewModel(application: Application) : AndroidViewModel(application) {

    private val toolExecutionEngine = ToolExecutionEngine(application.applicationContext)

    private val _assistantState = MutableStateFlow<AssistantState>(AssistantState.Idle)
    val assistantState: StateFlow<AssistantState> = _assistantState.asStateFlow()

    private val _audioAmplitude = MutableStateFlow(0f)
    val audioAmplitude: StateFlow<Float> = _audioAmplitude.asStateFlow()

    private val _isBackgroundServiceRunning = MutableStateFlow(false)
    val isBackgroundServiceRunning: StateFlow<Boolean> = _isBackgroundServiceRunning.asStateFlow()

    private val _lastActionNotice = MutableStateFlow<String?>(null)
    val lastActionNotice: StateFlow<String?> = _lastActionNotice.asStateFlow()

    private var liveSessionManager: LiveSessionManager? = null

    fun initialize(apiKey: String) {
        liveSessionManager = LiveSessionManager(
            apiKey = apiKey,
            onStateChanged = { state ->
                _assistantState.value = state
            },
            onToolCallReceived = { callId, functionName, args ->
                handleToolCall(callId, functionName, args)
            },
            onAmplitudeChanged = { amp ->
                _audioAmplitude.value = amp
            }
        )
    }

    fun toggleLiveSession() {
        if (_assistantState.value is AssistantState.Idle) {
            liveSessionManager?.startSession()
        } else {
            liveSessionManager?.stopSession()
        }
    }

    fun toggleForegroundService() {
        val nextState = !_isBackgroundServiceRunning.value
        _isBackgroundServiceRunning.value = nextState
        val context = getApplication<Application>().applicationContext
        if (nextState) {
            ZoyaForegroundService.start(context)
            _lastActionNotice.value = "Foreground Service active • Listening for 'Zoya' in background"
        } else {
            ZoyaForegroundService.stop(context)
            _lastActionNotice.value = "Background service stopped"
        }
    }

    private fun handleToolCall(callId: String, name: String, args: JSONObject) {
        viewModelScope.launch {
            val result = when (name) {
                "openApp" -> {
                    val pkg = args.optString("packageName")
                    val appName = args.optString("appName")
                    toolExecutionEngine.openApp(pkg, appName)
                }
                "searchAndCallContact" -> {
                    val contact = args.optString("contactName")
                    toolExecutionEngine.searchAndCallContact(contact)
                }
                "sendWhatsAppMessage" -> {
                    val contact = args.optString("contactName")
                    val msg = args.optString("message")
                    toolExecutionEngine.sendWhatsAppMessage(contact, msg)
                }
                "sendGmail" -> {
                    val email = args.optString("recipientEmail")
                    val subject = args.optString("subject")
                    val body = args.optString("body")
                    toolExecutionEngine.sendGmail(email, subject, body)
                }
                else -> ToolResult.Error("Unknown tool: $name")
            }

            val responseObj = JSONObject()
            when (result) {
                is ToolResult.Success -> {
                    responseObj.put("status", "success")
                    responseObj.put("output", result.message)
                    _lastActionNotice.value = "⚡ ${result.intentTriggered}"
                }
                is ToolResult.PermissionDenied -> {
                    responseObj.put("status", "permission_denied")
                    responseObj.put("prompt", result.sassyPrompt)
                    _lastActionNotice.value = "⚠️ Permission missing: ${result.missingPermission}"
                }
                is ToolResult.Error -> {
                    responseObj.put("status", "error")
                    responseObj.put("error", result.error)
                    _lastActionNotice.value = "❌ ${result.error}"
                }
            }

            liveSessionManager?.sendToolResult(callId, name, responseObj)
        }
    }

    fun triggerWakeWordAwakening() {
        if (_assistantState.value is AssistantState.Idle) {
            liveSessionManager?.startSession()
        }
    }

    override fun onCleared() {
        super.onCleared()
        liveSessionManager?.stopSession()
    }
}
