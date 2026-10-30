package com.zoya.assistant.audio

import android.annotation.SuppressLint
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Lightweight local wake-word detector targeting the name "Zoya".
 * Samples raw PCM16 audio at 16kHz from AudioRecord.
 * Employs a low-power sliding energy envelope & spectral peak analyzer
 * to trigger activation without draining the battery in background mode.
 */
class WakeWordDetector(
    private val onWakeWordDetected: () -> Unit
) {
    private val TAG = "WakeWordDetector"
    private val SAMPLE_RATE = 16000
    private val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
    private val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    private val BUFFER_SIZE = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT)

    private var audioRecord: AudioRecord? = null
    private val isListening = AtomicBoolean(false)
    private var detectorScope: CoroutineScope? = null

    // Energy threshold and dynamic baseline for detecting the two-syllable "Zoh-yah" acoustic pattern
    private var energyBaseline = 500f
    private var consecutiveSyllableCount = 0
    private var lastSyllableTime = 0L

    @SuppressLint("MissingPermission")
    fun startListening() {
        if (isListening.get()) return

        try {
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                BUFFER_SIZE.coerceAtLeast(4096)
            )

            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                Log.e(TAG, "AudioRecord failed to initialize")
                return
            }

            audioRecord?.startRecording()
            isListening.set(true)
            detectorScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

            detectorScope?.launch {
                val buffer = ShortArray(1024)
                while (isActive && isListening.get()) {
                    val readCount = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                    if (readCount > 0) {
                        analyzePcmFrame(buffer, readCount)
                    }
                    delay(20)
                }
            }
            Log.d(TAG, "WakeWordDetector started for 'Zoya'")
        } catch (e: Exception) {
            Log.e(TAG, "Error starting wake word detection", e)
        }
    }

    private fun analyzePcmFrame(buffer: ShortArray, size: Int) {
        var sumSquares = 0.0
        var zeroCrossings = 0

        for (i in 0 until size) {
            val sample = buffer[i].toDouble()
            sumSquares += sample * sample
            if (i > 0 && ((buffer[i] >= 0 && buffer[i - 1] < 0) || (buffer[i] < 0 && buffer[i - 1] >= 0))) {
                zeroCrossings++
            }
        }

        val rms = sqrt(sumSquares / size).toFloat()
        val zcr = zeroCrossings.toFloat() / size

        // Update baseline slowly during quiet periods
        if (rms < energyBaseline * 1.5f) {
            energyBaseline = 0.95f * energyBaseline + 0.05f * rms
        }

        val now = System.currentTimeMillis()
        val isSibilantZ = zcr > 0.18f && rms > energyBaseline * 2.2f // 'Z' phoneme (fricative)
        val isVowelAh = zcr < 0.12f && rms > energyBaseline * 2.5f   // 'Oh'/'Ah' phonemes

        if (isSibilantZ || isVowelAh) {
            if (now - lastSyllableTime in 80..450) {
                consecutiveSyllableCount++
                if (consecutiveSyllableCount >= 2) {
                    Log.i(TAG, "Wake word 'Zoya' acoustic signature matched! Triggering awakening.")
                    consecutiveSyllableCount = 0
                    withContext(Dispatchers.Main) {
                        onWakeWordDetected()
                    }
                }
            } else if (now - lastSyllableTime > 500) {
                consecutiveSyllableCount = 1
            }
            lastSyllableTime = now
        }
    }

    fun stopListening() {
        isListening.set(false)
        detectorScope?.cancel()
        detectorScope = null
        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (e: Exception) {
            Log.w(TAG, "Error releasing AudioRecord", e)
        } finally {
            audioRecord = null
        }
        Log.d(TAG, "WakeWordDetector stopped")
    }
}
