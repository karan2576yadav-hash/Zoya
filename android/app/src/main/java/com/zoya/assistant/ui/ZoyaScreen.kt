package com.zoya.assistant.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zoya.assistant.live.AssistantState
import com.zoya.assistant.viewmodel.ZoyaViewModel

@Composable
fun ZoyaScreen(
    viewModel: ZoyaViewModel,
    onOpenPermissions: () -> Unit
) {
    val state by viewModel.assistantState.collectAsState()
    val amplitude by viewModel.audioAmplitude.collectAsState()
    val isBgServiceRunning by viewModel.isBackgroundServiceRunning.collectAsState()
    val lastNotice by viewModel.lastActionNotice.collectAsState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        Color(0xFF0D0B14),
                        Color(0xFF050308),
                        Color(0xFF000000)
                    )
                )
            )
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top Bar: System Status & Background Service Indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Background Service Chip
                Surface(
                    onClick = { viewModel.toggleForegroundService() },
                    shape = RoundedCornerShape(20.dp),
                    color = if (isBgServiceRunning) Color(0x3300E5FF) else Color(0x22FFFFFF),
                    border = null
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isBgServiceRunning) Color(0xFF00E5FF) else Color.Gray
                                )
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isBgServiceRunning) "Foreground Service Active" else "Background Standby",
                            color = if (isBgServiceRunning) Color(0xFF00E5FF) else Color.LightGray,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                // Permissions Quick Access
                IconButton(onClick = onOpenPermissions) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = "Permissions",
                        tint = Color(0xFFB388FF)
                    )
                }
            }

            // Central Presence: State, Animated Orb & Sassy Status Subtitle
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "ZOYA",
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 4.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                val stateDescription = when (state) {
                    is AssistantState.Idle -> "Say 'Zoya' or tap orb to begin"
                    is AssistantState.Listening -> "I'm all ears, darling..."
                    is AssistantState.Thinking -> "Cooking up something brilliant..."
                    is AssistantState.Speaking -> "Zoya speaking..."
                    is AssistantState.Error -> (state as AssistantState.Error).message
                }

                Text(
                    text = stateDescription,
                    color = when (state) {
                        is AssistantState.Listening -> Color(0xFF00E5FF)
                        is AssistantState.Thinking -> Color(0xFFFF4081)
                        is AssistantState.Speaking -> Color(0xFFE040FB)
                        is AssistantState.Error -> Color(0xFFFF5252)
                        else -> Color(0xFF9E9E9E)
                    },
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Interactive Animated Orb (Clickable to start/interrupt session)
                Box(
                    modifier = Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) {
                        viewModel.toggleLiveSession()
                    }
                ) {
                    ZoyaOrbCanvas(state = state, audioAmplitude = amplitude)
                }

                Spacer(modifier = Modifier.height(28.dp))

                // Last Action Toast / Tool Notification
                if (lastNotice != null) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0x33B388FF),
                        modifier = Modifier.padding(horizontal = 16.dp)
                    ) {
                        Text(
                            text = lastNotice!!,
                            color = Color(0xFFE1BEE7),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }

            // Bottom Floating Bar: Mic Toggle & Tool Chips
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                // Quick Spoken Suggestions
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center
                ) {
                    SuggestionChip(text = "\"Call Alex\"")
                    Spacer(modifier = Modifier.width(8.dp))
                    SuggestionChip(text = "\"WhatsApp Mom\"")
                    Spacer(modifier = Modifier.width(8.dp))
                    SuggestionChip(text = "\"Open YouTube\"")
                }

                Spacer(modifier = Modifier.height(16.dp))

                FloatingActionButton(
                    onClick = { viewModel.toggleLiveSession() },
                    containerColor = if (state !is AssistantState.Idle) Color(0xFFFF4081) else Color(0xFF7C4DFF),
                    contentColor = Color.White,
                    shape = CircleShape,
                    modifier = Modifier.size(68.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Mic,
                        contentDescription = "Microphone",
                        modifier = Modifier.size(32.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun SuggestionChip(text: String) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = Color(0x1AFFFFFF)
    ) {
        Text(
            text = text,
            color = Color.LightGray,
            fontSize = 12.sp,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
        )
    }
}
