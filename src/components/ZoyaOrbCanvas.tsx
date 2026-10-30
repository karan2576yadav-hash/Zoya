import React, { useEffect, useRef } from 'react';
import { AssistantState } from '../types';

interface ZoyaOrbCanvasProps {
  state: AssistantState;
  audioAmplitude: number; // 0.0 to 1.0
  analyserNode?: AnalyserNode | null;
  onClick?: () => void;
}

export const ZoyaOrbCanvas: React.FC<ZoyaOrbCanvasProps> = ({
  state,
  audioAmplitude,
  analyserNode,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = 340;
    const height = 340;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const freqData = new Uint8Array(64);

    const render = () => {
      timeRef.current += 0.025;
      const t = timeRef.current;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = 78;

      if (analyserNode) {
        analyserNode.getByteFrequencyData(freqData);
      }

      // Calculate dynamic mic energy from analyser if available
      let micEnergy = audioAmplitude;
      if (analyserNode && state === 'listening') {
        let sum = 0;
        for (let i = 0; i < 32; i++) {
          sum += freqData[i];
        }
        const avg = sum / 32;
        micEnergy = Math.max(micEnergy, avg / 255);
      }

      switch (state) {
        case 'idle': {
          // Slow, subtle breathing glow
          const breathing = Math.sin(t * 1.8) * 0.08 + 1.0;
          const r = baseRadius * breathing;

          // Outer ambient halo
          const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.9);
          halo.addColorStop(0, 'rgba(138, 43, 226, 0.45)');
          halo.addColorStop(0.5, 'rgba(0, 229, 255, 0.25)');
          halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.9, 0, Math.PI * 2);
          ctx.fill();

          // Core Sphere
          const sphere = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
          sphere.addColorStop(0, '#f472b6'); // neon pink
          sphere.addColorStop(0.4, '#a855f7'); // purple
          sphere.addColorStop(0.8, '#4f46e5'); // indigo
          sphere.addColorStop(1, '#0f051d'); // deep dark core
          ctx.fillStyle = sphere;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();

          // Specular Glint
          const glint = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, 0, cx - r * 0.35, cy - r * 0.35, r * 0.4);
          glint.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
          glint.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glint;
          ctx.beginPath();
          ctx.arc(cx - r * 0.35, cy - r * 0.35, r * 0.4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'listening': {
          // Active listening waveform responding to mic input frequency
          const amp = Math.max(0.12, micEnergy);
          const r = baseRadius * (1 + amp * 0.25);

          // Neon waveform bars radiating from the orb
          const bars = 36;
          for (let i = 0; i < bars; i++) {
            const angle = (i * (360 / bars) * Math.PI) / 180;
            const freqVal = freqData[i % freqData.length] / 255;
            const barHeight = 8 + (amp * 45 + freqVal * 30);

            const startX = cx + (r + 4) * Math.cos(angle);
            const startY = cy + (r + 4) * Math.sin(angle);
            const endX = cx + (r + barHeight) * Math.cos(angle);
            const endY = cy + (r + barHeight) * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = i % 2 === 0 ? `rgba(0, 229, 255, ${0.7 + amp * 0.3})` : `rgba(168, 85, 247, ${0.7 + amp * 0.3})`;
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            ctx.stroke();
          }

          // Inner Active Core
          const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          core.addColorStop(0, '#00e5ff');
          core.addColorStop(0.5, '#7c3aed');
          core.addColorStop(1, '#060d24');
          ctx.fillStyle = core;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'thinking': {
          // Pulsing neon ring and rapid particle orbit
          const pulse = Math.sin(t * 5) * 0.15 + 1.0;
          const r = baseRadius * pulse;

          // Outer glowing ring
          ctx.beginPath();
          ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Orbiting cyan particles
          const particles = 8;
          for (let i = 0; i < particles; i++) {
            const angle = t * 4 + (i * Math.PI * 2) / particles;
            const px = cx + r * 1.35 * Math.cos(angle);
            const py = cy + r * 1.35 * Math.sin(angle);

            ctx.beginPath();
            ctx.arc(px, py, 5, 0, Math.PI * 2);
            ctx.fillStyle = i % 2 === 0 ? '#00e5ff' : '#f43f5e';
            ctx.shadowColor = '#00e5ff';
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;
          }

          // Core Pulsing Sphere
          const thinkSphere = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          thinkSphere.addColorStop(0, '#f43f5e');
          thinkSphere.addColorStop(0.6, '#9333ea');
          thinkSphere.addColorStop(1, '#1e0520');
          ctx.fillStyle = thinkSphere;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'speaking': {
          // Dynamic audio waves matching Zoya's output stream
          const amp = Math.max(0.2, audioAmplitude);
          const r = baseRadius * (1 + amp * 0.4);

          // Multi-layer pulsating soundwave ripples
          for (let layer = 1; layer <= 4; layer++) {
            const waveR = r + layer * (16 + amp * 28);
            const alpha = (0.55 / layer) * (amp + 0.3);

            ctx.beginPath();
            ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(224, 64, 251, ${alpha})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
          }

          // Expressive harmonic wave deformation
          ctx.beginPath();
          const points = 60;
          for (let i = 0; i <= points; i++) {
            const theta = (i / points) * Math.PI * 2;
            const waveOffset = Math.sin(theta * 6 + t * 6) * (10 * amp);
            const rad = r + waveOffset;
            const px = cx + rad * Math.cos(theta);
            const py = cy + rad * Math.sin(theta);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          const speakGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          speakGrad.addColorStop(0, '#f472b6');
          speakGrad.addColorStop(0.5, '#c084fc');
          speakGrad.addColorStop(1, '#00e5ff');
          ctx.fillStyle = speakGrad;
          ctx.shadowColor = '#e040fb';
          ctx.shadowBlur = 24 * amp;
          ctx.fill();
          ctx.shadowBlur = 0;
          break;
        }

        case 'error': {
          const r = baseRadius;
          const errGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          errGrad.addColorStop(0, '#ef4444');
          errGrad.addColorStop(1, '#450a0a');
          ctx.fillStyle = errGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [state, audioAmplitude, analyserNode]);

  return (
    <div
      id="zoya-orb-container"
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none transition-transform duration-300 hover:scale-[1.03] active:scale-95"
      title="Tap to speak with Zoya"
    >
      <canvas ref={canvasRef} className="pointer-events-none" />
    </div>
  );
};
