package com.zoya.assistant.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.zoya.assistant.live.AssistantState
import kotlin.math.cos
import kotlin.math.sin

/**
 * State-driven animated Jetpack Compose Canvas orb representing Zoya's presence.
 * - Idle: Slow, subtle breathing glow.
 * - Listening: Active listening waveform responding to mic input frequency.
 * - Thinking/Processing: Pulsing neon ring and rapid particle rotation.
 * - Speaking: Dynamic audio wave matching Zoya's output stream.
 */
@Composable
fun ZoyaOrbCanvas(
    state: AssistantState,
    audioAmplitude: Float,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "ZoyaOrbTransitions")

    // Idle Breathing Animation
    val breathingScale by infiniteTransition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(2800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "BreathingScale"
    )

    // Thinking Rotation Angle
    val thinkingRotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "ThinkingRotation"
    )

    // Neon Glow Pulse
    val glowPulse by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 0.85f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "GlowPulse"
    )

    // Smooth amplitude interpolation for speaking and listening
    val animatedAmplitude by animateFloatAsState(
        targetValue = audioAmplitude,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow),
        label = "AmplitudeSpring"
    )

    Box(
        modifier = modifier.size(280.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2f, size.height / 2f)
            val baseRadius = size.minDimension / 3.4f

            when (state) {
                is AssistantState.Idle -> {
                    drawIdleOrb(center, baseRadius * breathingScale, glowPulse)
                }
                is AssistantState.Listening -> {
                    drawListeningOrb(center, baseRadius, animatedAmplitude, glowPulse)
                }
                is AssistantState.Thinking -> {
                    drawThinkingOrb(center, baseRadius, thinkingRotation, glowPulse)
                }
                is AssistantState.Speaking -> {
                    drawSpeakingOrb(center, baseRadius, animatedAmplitude, thinkingRotation)
                }
                is AssistantState.Error -> {
                    drawErrorOrb(center, baseRadius)
                }
            }
        }
    }
}

private fun DrawScope.drawIdleOrb(center: Offset, radius: Float, glow: Float) {
    // Outer Ambient Halo
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(
                Color(0xFF8A2BE2).copy(alpha = glow * 0.35f),
                Color(0xFF00E5FF).copy(alpha = glow * 0.15f),
                Color.Transparent
            ),
            center = center,
            radius = radius * 1.8f
        ),
        center = center,
        radius = radius * 1.8f
    )

    // Core Sphere
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(
                Color(0xFFE040FB),
                Color(0xFF7C4DFF),
                Color(0xFF180A30)
            ),
            center = center - Offset(radius * 0.2f, radius * 0.25f),
            radius = radius
        ),
        center = center,
        radius = radius
    )

    // Specular Highlight
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(Color.White.copy(alpha = 0.6f), Color.Transparent),
            center = center - Offset(radius * 0.35f, radius * 0.35f),
            radius = radius * 0.4f
        ),
        center = center - Offset(radius * 0.35f, radius * 0.35f),
        radius = radius * 0.4f
    )
}

private fun DrawScope.drawListeningOrb(
    center: Offset,
    radius: Float,
    amplitude: Float,
    glow: Float
) {
    val dynamicRadius = radius * (1f + amplitude * 0.45f)

    // Active Waveform Spikes responding to mic input frequency
    val numBars = 36
    for (i in 0 until numBars) {
        val angle = (i * (360f / numBars) * (Math.PI / 180f)).toFloat()
        val waveHeight = 12.dp.toPx() + (amplitude * 55.dp.toPx() * (0.6f + 0.4f * sin(i * 1.2f)))
        val startX = center.x + (dynamicRadius + 4f) * cos(angle)
        val startY = center.y + (dynamicRadius + 4f) * sin(angle)
        val endX = center.x + (dynamicRadius + waveHeight) * cos(angle)
        val endY = center.y + (dynamicRadius + waveHeight) * sin(angle)

        drawLine(
            color = Color(0xFF00E5FF).copy(alpha = 0.7f + 0.3f * amplitude),
            start = Offset(startX, startY),
            end = Offset(endX, endY),
            strokeWidth = 3.dp.toPx(),
            cap = StrokeCap.Round
        )
    }

    // Glowing Inner Core
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(Color(0xFF00E5FF), Color(0xFF651FFF), Color(0xFF070B19)),
            center = center,
            radius = dynamicRadius
        ),
        center = center,
        radius = dynamicRadius
    )
}

private fun DrawScope.drawThinkingOrb(
    center: Offset,
    radius: Float,
    rotation: Float,
    glow: Float
) {
    // Pulsing Neon Rings
    drawCircle(
        color = Color(0xFFFF4081).copy(alpha = glow * 0.5f),
        center = center,
        radius = radius * 1.25f,
        style = Stroke(width = 3.dp.toPx())
    )

    // Orbiting particles on neon ring
    val particleCount = 6
    for (i in 0 until particleCount) {
        val rad = (rotation + (i * 360f / particleCount)) * (Math.PI / 180f).toFloat()
        val px = center.x + (radius * 1.25f) * cos(rad)
        val py = center.y + (radius * 1.25f) * sin(rad)
        drawCircle(
            color = Color(0xFF00E5FF),
            center = Offset(px, py),
            radius = 5.dp.toPx()
        )
    }

    // Inner pulsating core
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(Color(0xFFFF4081), Color(0xFF7C4DFF), Color(0xFF1F0B24)),
            center = center,
            radius = radius
        ),
        center = center,
        radius = radius * (0.95f + glow * 0.1f)
    )
}

private fun DrawScope.drawSpeakingOrb(
    center: Offset,
    radius: Float,
    amplitude: Float,
    rotation: Float
) {
    // Dynamic audio wave matching Zoya's output stream
    val dynamicRadius = radius * (1f + amplitude * 0.6f)

    // Multiple ripple waves
    for (layer in 1..3) {
        val waveRadius = dynamicRadius + (layer * 18.dp.toPx() * (amplitude + 0.2f))
        drawCircle(
            color = Color(0xFFE040FB).copy(alpha = (0.4f / layer) * (amplitude + 0.3f)),
            center = center,
            radius = waveRadius,
            style = Stroke(width = 2.dp.toPx())
        )
    }

    // Expressive Core
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(Color(0xFFE040FB), Color(0xFF651FFF), Color(0xFF00E5FF)),
            center = center,
            radius = dynamicRadius
        ),
        center = center,
        radius = dynamicRadius
    )
}

private fun DrawScope.drawErrorOrb(center: Offset, radius: Float) {
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(Color(0xFFFF5252), Color(0xFFB71C1C)),
            center = center,
            radius = radius
        ),
        center = center,
        radius = radius
    )
}
