package com.zoya.assistant.live

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.*
import okhttp3.*
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean

sealed class AssistantState {
    object Idle : AssistantState()
    object Listening : AssistantState()
    object Thinking : AssistantState()
    object Speaking : AssistantState()
    data class Error(val message: String) : AssistantState()
}

/**
 * Manages the bi-directional continuous Audio-to-Audio streaming session
 * with the Gemini Live WebSocket API (gemini-3.1-flash-live-preview / gemini-3.8-live).
 */
class LiveSessionManager(
    private val apiKey: String,
    private val onStateChanged: (AssistantState) -> Unit,
    private val onToolCallReceived: (callId: String, functionName: String, args: JSONObject) -> Unit,
    private val onAmplitudeChanged: (amplitude: Float) -> Unit
) {
    private val TAG = "LiveSessionManager"
    private val client = OkHttpClient.Builder().build()
    private var webSocket: WebSocket? = null

    private val isSessionActive = AtomicBoolean(false)
    private var recordingJob: Job? = null
    private var playbackJob: Job? = null
    private val sessionScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Audio Output: 24kHz Mono PCM16 as specified by Gemini Live API
    private val OUTPUT_SAMPLE_RATE = 24000
    private var audioTrack: AudioTrack? = null
    private val audioChunkQueue = ConcurrentLinkedQueue<ByteArray>()

    // Audio Input: 16kHz Mono PCM16
    private val INPUT_SAMPLE_RATE = 16000
    private var inputAudioRecord: AudioRecord? = null

    fun startSession() {
        if (isSessionActive.get()) return
        isSessionActive.set(true)
        onStateChanged(AssistantState.Listening)

        initAudioTrack()
        connectWebSocket()
    }

    private fun initAudioTrack() {
        val minBufferSize = AudioTrack.getMinBufferSize(
            OUTPUT_SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        audioTrack = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build()
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(OUTPUT_SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build()
            )
            .setBufferSizeInBytes(minBufferSize * 2)
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build()

        audioTrack?.play()

        // Background playback thread
        playbackJob = sessionScope.launch {
            while (isActive && isSessionActive.get()) {
                val chunk = audioChunkQueue.poll()
                if (chunk != null && chunk.isNotEmpty()) {
                    onStateChanged(AssistantState.Speaking)
                    audioTrack?.write(chunk, 0, chunk.size)
                } else {
                    if (audioChunkQueue.isEmpty()) {
                        // Return to listening if done speaking
                        delay(50)
                    }
                }
            }
        }
    }

    private fun connectWebSocket() {
        val host = "generativelanguage.googleapis.com"
        val path =
            "/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=$apiKey"

        val request = Request.Builder()
            .url("wss://$host$path")
            .build()

        webSocket = client.newWebSocket(
            request,
            object : WebSocketListener() {
                override fun onOpen(
                    ws: WebSocket,
                    response: Response
                ) {
                    Log.i(
                        TAG,
                        "Gemini Live WebSocket Connected"
                    )

                    sendInitialConfig(ws)
                    startMicStreaming(ws)
                }

                override fun onMessage(
                    ws: WebSocket,
                    text: String
                ) {
                    handleLiveServerMessage(text)
                }

                override fun onFailure(
                    ws: WebSocket,
                    t: Throwable,
                    response: Response?
                ) {
                    Log.e(
                        TAG,
                        "WebSocket failure: ${t.message}",
                        t
                    )

                    onStateChanged(
                        AssistantState.Error(
                            "Live connection failed: ${t.localizedMessage}"
                        )
                    )
                }

                override fun onClosed(
                    ws: WebSocket,
                    code: Int,
                    reason: String
                ) {
                    Log.i(
                        TAG,
                        "WebSocket closed: $reason"
                    )

                    onStateChanged(
                        AssistantState.Idle
                    )
                }
            }
        )
    }

    private fun sendInitialConfig(ws: WebSocket) {
        val setupMsg = JSONObject().apply {
            put(
                "setup",
                JSONObject().apply {
                    put(
                        "model",
                        "models/gemini-3.8-live"
                    )

                    put(
                        "responseModalities",
                        JSONArray().put("AUDIO")
                    )

                    put(
                        "systemInstruction",
                        JSONObject().apply {
                            put(
                                "parts",
                                JSONArray().put(
                                    JSONObject().apply {
                                        put(
                                            "text",
                                            """
                                            You are Zoya, a female AI voice assistant.

                                            Personality:
                                            - Friendly
                                            - Confident
                                            - Helpful
                                            - Slightly witty
                                            - Natural conversational Hindi and English

                                            Rules:
                                            - Keep spoken responses concise.
                                            - Prefer Hindi when the user speaks Hindi.
                                            - Never claim an action was completed unless the tool reports success.
                                            - Use tools when the user asks you to open an app,
                                              call a contact, send a WhatsApp message,
                                              or send an email.
                                            """.trimIndent()
                                        )
                                    }
                                )
                            )
                        }
                    )

                    put(
                        "tools",
                        createTools()
                    )
                }
            )
        }

        ws.send(setupMsg.toString())
    }

    private fun createTools(): JSONArray {
        val tools = JSONArray()
        val functionDeclarations = JSONArray()

        functionDeclarations.put(
            JSONObject().apply {
                put("name", "openApp")
                put(
                    "description",
                    "Open an installed Android application."
                )
                put(
                    "parameters",
                    JSONObject().apply {
                        put("type", "OBJECT")
                        put(
                            "properties",
                            JSONObject().apply {
                                put(
                                    "packageName",
                                    JSONObject().apply {
                                        put("type", "STRING")
                                    }
                                )
                                put(
                                    "appName",
                                    JSONObject().apply {
                                        put("type", "STRING")
                                    }
                                )
                            }
                        )
                        put(
                            "required",
                            JSONArray().put("packageName")
                        )
                    }
                )
            }
        )

        functionDeclarations.put(
            JSONObject().apply {
                put(
                    "name",
                    "searchAndCallContact"
                )
                put(
                    "description",
                    "Find a contact by name and place a phone call."
                )
                put(
                    "parameters",
                    JSONObject().apply {
                        put("type", "OBJECT")
                        put(
                            "properties",
                            JSONObject().apply {
                                put(
                                    "contactName",
                                    JSONObject().apply {
                                        put("type", "STRING")
                                    }
                                )
                            }
                        )
                        put(
                            "required",
                            JSONArray().put("contactName")
                        )
                    }
                )
            }
        )

        functionDeclarations.put(
            JSONObject().apply {
                put(
                    "name",
                    "sendWhatsAppMessage"
                )
                put(
                    "description",
                    "Send a WhatsApp message to a contact."
                )
                put(
                    "parameters",
                    JSONObject().apply {
                        put("type", "OBJECT")
                        put(
                            "properties",
                            JSONObject().apply {
                                put(
                                    "contactName",
                                    JSONObject().apply {
                                        put("type", "STRING")
                                    }
                                )
                                put(
                                    "message",
                                    JSONObject().apply {
                                        put("type", "STRING")
                                    }
                                )
                            }
                        )
                        put(
                            "required",
                            JSONArray()
                                .put("contactName")
                                .put("message")
                        )
                    }
                )
            }
        )

        functionDeclarations.put(
            JSONObject().apply {
                put(
                    "name",
                    "sendGmail"
                )
                put(
                    "description",
                    "Send an email using Gmail."
                )
                put(
                    "parameters",
                    JSONObject().apply {
                        put("type", "OBJECT")
                        put(
                            "properties",
                            JSONObject().apply {
                                put(
                                    "recipientEmail",
                                    JSONObject().apply {
                                        put("type", "STRING")
                                    }
                                )
                                put(
                                    "subject",
                                    JSONObject().apply {
                                        put("type", "STRING")
                                    }
                                )
                                put(
                                    "body",
                                    JSONObject().apply {
                                        put("type", "STRING")
                                    }
                                )
                            }
                        )
                        put(
                            "required",
                            JSONArray()
                                .put("recipientEmail")
                                .put("subject")
                                .put("body")
                        )
                    }
                )
            }
        )

        tools.put(
            JSONObject().apply {
                put(
                    "functionDeclarations",
                    functionDeclarations
                )
            }
        )

        return tools
    }

    private fun startMicStreaming(ws: WebSocket) {
        val minBufferSize = AudioRecord.getMinBufferSize(
            INPUT_SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        inputAudioRecord = AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            INPUT_SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            minBufferSize.coerceAtLeast(4096)
        )

        inputAudioRecord?.startRecording()

        recordingJob = sessionScope.launch {
            val buffer = ByteArray(1024)
            while (isActive && isSessionActive.get()) {
                val read = inputAudioRecord?.read(buffer, 0, buffer.size) ?: 0
                if (read > 0) {
                    // Calculate amplitude for UI animation
                    var maxAmp = 0
                    for (i in 0 until read step 2) {
                        val sample = (buffer[i + 1].toInt() shl 8) or (buffer[i].toInt() and 0xFF)
                        val absVal = kotlin.math.abs(sample.toShort().toInt())
                        if (absVal > maxAmp) maxAmp = absVal
                    }
                    val normalizedAmp = (maxAmp.toFloat() / 32768f).coerceIn(0f, 1f)
                    onAmplitudeChanged(normalizedAmp)

                    // User is speaking: interrupt any playing assistant audio immediately
                    if (normalizedAmp > 0.08f && !audioChunkQueue.isEmpty()) {
                        handleInterruption()
                    }

                    // Stream to Gemini Live
                    val base64Data = Base64.encodeToString(buffer, 0, read, Base64.NO_WRAP)
                    val inputMessage = JSONObject().apply {
                        put(
                            "realtimeInput",
                            JSONObject().apply {
                                put(
                                    "audio",
                                    JSONObject().apply {
                                        put(
                                            "mimeType",
                                            "audio/pcm;rate=16000"
                                        )
                                        put(
                                            "data",
                                            base64Data
                                        )
                                    }
                                )
                            }
                        )
                    }
                    ws.send(inputMessage.toString())
                }
                delay(16)
            }
        }
    }

    private fun handleLiveServerMessage(jsonString: String) {
        try {
            val json = JSONObject(jsonString)

            // Server Content (Audio / Interruption)
            if (json.has("serverContent")) {
                val serverContent = json.getJSONObject("serverContent")

                // Handle model interruption
                if (serverContent.optBoolean("interrupted", false)) {
                    Log.d(TAG, "Assistant speech was interrupted by user")
                    handleInterruption()
                    return
                }

                // Model turn parts (Audio chunks)
                if (serverContent.has("modelTurn")) {
                    val parts = serverContent.getJSONObject("modelTurn").optJSONArray("parts")
                    if (parts != null) {
                        for (i in 0 until parts.length()) {
                            val part = parts.getJSONObject(i)
                            if (part.has("inlineData")) {
                                val base64Audio = part.getJSONObject("inlineData").getString("data")
                                val pcmBytes = Base64.decode(base64Audio, Base64.DEFAULT)
                                audioChunkQueue.offer(pcmBytes)
                            }
                        }
                    }
                }
            }

            // Tool Call from Gemini
            if (json.has("toolCall")) {
                onStateChanged(
                    AssistantState.Thinking
                )

                val toolCall =
                    json.getJSONObject("toolCall")

                val functionCalls =
                    toolCall.optJSONArray("functionCalls")

                if (functionCalls != null) {
                    for (i in 0 until functionCalls.length()) {
                        val call =
                            functionCalls.getJSONObject(i)

                        val callId =
                            call.optString(
                                "id",
                                "call_$i"
                            )

                        val name =
                            call.getString("name")

                        val args =
                            call.optJSONObject("args")
                                ?: JSONObject()

                        onToolCallReceived(
                            callId,
                            name,
                            args
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing server message", e)
        }
    }

    /**
     * Instantly flushes audio buffers when interrupted for zero-latency cut-off.
     */
    fun handleInterruption() {
        audioChunkQueue.clear()
        try {
            audioTrack?.pause()
            audioTrack?.flush()
            audioTrack?.play()
        } catch (e: Exception) {
            Log.w(TAG, "Error flushing AudioTrack", e)
        }
        onStateChanged(AssistantState.Listening)
    }

    fun sendToolResult(callId: String, functionName: String, responseJson: JSONObject) {
        val toolResponseMsg = JSONObject().apply {
            put("toolResponse", JSONObject().apply {
                put("functionResponses", JSONArray().put(JSONObject().apply {
                    put("id", callId)
                    put("name", functionName)
                    put("response", responseJson)
                }))
            })
        }
        webSocket?.send(toolResponseMsg.toString())
    }

    fun stopSession() {
        isSessionActive.set(false)
        recordingJob?.cancel()
        playbackJob?.cancel()
        audioChunkQueue.clear()

        try {
            inputAudioRecord?.stop()
            inputAudioRecord?.release()
        } catch (e: Exception) {
            // ignore
        } finally {
            inputAudioRecord = null
        }

        try {
            audioTrack?.stop()
            audioTrack?.release()
        } catch (e: Exception) {
            // ignore
        } finally {
            audioTrack = null
        }

        webSocket?.close(1000, "User stopped session")
        webSocket = null
        onStateChanged(AssistantState.Idle)
    }
}
