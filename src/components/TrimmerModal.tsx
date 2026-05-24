import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CloseX, PlayTriangle, StopSquare } from './ModernIcons';
import ConfirmModal from './ConfirmModal';

interface TrimmerModalProps {
  open: boolean;
  fileName: string | null;     // the imported sound file name
  onClose: () => void;
  onTrimmed: (fileName: string) => void;  // called after successful trim
}

const CANVAS_W = 640;
const CANVAS_H = 160;

export default function TrimmerModal({ open, fileName, onClose, onTrimmed }: TrimmerModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(0);
  const [loading, setLoading] = useState(false);
  const [trimming, setTrimming] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playPos, setPlayPos] = useState(0);
  const [error, setError] = useState('');
  const [replaceOriginal, setReplaceOriginal] = useState(false);

  const playTimer = useRef<number | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const dragRef = useRef<'start' | 'end' | null>(null);

  // ?? load audio when fileName changes ??????????????????????????????????
  useEffect(() => {
    if (!open || !fileName) return;
    setError('');
    setLoading(true);
    setAudioBuffer(null);

    const api = (window as any).electron?.ipcRenderer;
    if (!api) { setError('IPC not available'); setLoading(false); return; }

    api.invoke('read-sound-full', fileName)
      .then((result: any) => {
        if (!result || !result.data) {
          console.error('[TrimmerModal] read-sound-full returned null for:', fileName);
          setError('找不到音频文件');
          setLoading(false);
          return;
        }

        console.log(`[TrimmerModal] loaded ${fileName}, data length: ${result.data.length}`);
        const bytes = Uint8Array.from(atob(result.data), c => c.charCodeAt(0));
        console.log(`[TrimmerModal] decoded ${bytes.length} bytes`);
        const blob = new Blob([bytes.buffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        // Decode with Web Audio API
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        ctx.decodeAudioData(bytes.buffer.slice(0),
          (buf) => {
            console.log(`[TrimmerModal] decode success: duration=${buf.duration}s`);
            setAudioBuffer(buf);
            setDuration(buf.duration);
            setStartSec(0);
            setEndSec(buf.duration);
            setLoading(false);
            drawWaveform(buf);
          },
          (err) => {
            // Fallback: try via element
            console.warn('[TrimmerModal] decodeAudioData failed, trying Audio element fallback:', err);
            const a = new Audio(url);
            a.addEventListener('loadedmetadata', () => {
              console.log(`[TrimmerModal] Audio fallback success: duration=${a.duration}s`);
              setDuration(a.duration || 0);
              setStartSec(0);
              setEndSec(a.duration || 0);
              setLoading(false);
              drawSimpleBars();
            });
            a.addEventListener('error', (e2) => {
              console.error('[TrimmerModal] Audio fallback also failed:', e2);
              setError('不支持的音频格式');
              setLoading(false);
            });
            audioRef.current = a;
          }
        );
      })
      .catch((e: any) => {
        console.error('[TrimmerModal] invoke error:', e);
        setError(e?.message || '加载音频失败');
        setLoading(false);
      });

    return () => {
      if (playTimer.current) clearInterval(playTimer.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, [open, fileName]);

  // ?? draw waveform ?????????????????????????????????????????????????????
  function drawWaveform(buf: AudioBuffer) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = buf.getChannelData(0);
    const step = Math.ceil(data.length / CANVAS_W);

    // Find peak amplitude across all samples
    let peak = 0.01;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw bars
    for (let i = 0; i < CANVAS_W; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const idx = i * step + j;
        if (idx < data.length) max = Math.max(max, Math.abs(data[idx]));
      }
      const h = (max / peak) * (CANVAS_H * 0.8);
      const x = i;
      const y = (CANVAS_H - h) / 2;
      // Color bars inside and outside selection differently
      const t = i / CANVAS_W;
      const pos = t * buf.duration;
      if (pos >= startSec && pos <= endSec) {
        ctx.fillStyle = 'var(--accent, #00e5ff)';
      } else {
        ctx.fillStyle = 'rgba(100, 100, 120, 0.5)';
      }
      ctx.fillRect(x, y, 1, Math.max(1, h));
    }

    // Draw selection region
    const sx = (startSec / buf.duration) * CANVAS_W;
    const ex = (endSec / buf.duration) * CANVAS_W;
    ctx.fillStyle = 'rgba(0, 229, 255, 0.08)';
    ctx.fillRect(sx, 0, ex - sx, CANVAS_H);

    // Draw handles
    drawHandle(ctx, sx);
    drawHandle(ctx, ex);
  }

  function drawHandle(ctx: CanvasRenderingContext2D, x: number) {
    ctx.fillStyle = 'var(--accent, #00e5ff)';
    ctx.strokeStyle = '#0a0e1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x - 6, 4, 12, CANVAS_H - 8, 4);
    ctx.fill();
    ctx.stroke();
  }

  function drawSimpleBars() {
    // Fallback: draw random-looking bars
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (let i = 0; i < CANVAS_W; i++) {
      const h = Math.random() * (CANVAS_H * 0.7) + 4;
      ctx.fillStyle = 'rgba(100, 100, 120, 0.6)';
      ctx.fillRect(i, (CANVAS_H - h) / 2, 1, h);
    }
  }

  // ?? redraw when selection changes ?????????????????????????????????????
  useEffect(() => {
    if (audioBuffer) drawWaveform(audioBuffer);
  }, [startSec, endSec, audioBuffer]);

  // ?? canvas mouse handlers ?????????????????????????????????????????????
  const pixelToSec = useCallback((px: number) => {
    if (!duration) return 0;
    return Math.max(0, Math.min(duration, (px / CANVAS_W) * duration));
  }, [duration]);

  const cssToCanvas = useCallback((cssPx: number) => {
    if (!canvasRef.current) return cssPx;
    const rect = canvasRef.current.getBoundingClientRect();
    return cssPx * (CANVAS_W / rect.width);
  }, []);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = cssToCanvas(e.clientX - rect.left);
    const t = pixelToSec(px);
    const sx = ((startSec / duration) * CANVAS_W);
    const ex = ((endSec / duration) * CANVAS_W);
    if (Math.abs(px - sx) < 10) {
      dragRef.current = 'start';
    } else if (Math.abs(px - ex) < 10) {
      dragRef.current = 'end';
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!duration || !dragRef.current) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = cssToCanvas(e.clientX - rect.left);
    const t = pixelToSec(px);
    if (dragRef.current === 'start') {
      setStartSec(Math.min(t, endSec - 0.1));
    } else if (dragRef.current === 'end') {
      setEndSec(Math.max(t, startSec + 0.1));
    }
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  // ?? preview playback ??????????????????????????????????????????????????
  const previewPlay = () => {
    if (!audioBuffer) return;
    // Stop any existing playback first
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (_) {}
      sourceNodeRef.current = null;
    }
    if (playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; }

    const ctx = audioCtxRef.current || new AudioContext();
    audioCtxRef.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    sourceNodeRef.current = source;

    const offset = startSec;
    const dur = endSec - startSec;
    source.start(0, offset, dur);
    setPlaying(true);

    const started = performance.now();
    const timer = setInterval(() => {
      const elapsed = (performance.now() - started) / 1000;
      if (elapsed >= dur) {
        clearInterval(timer);
        setPlaying(false);
        setPlayPos(0);
        sourceNodeRef.current = null;
      } else {
        setPlayPos(startSec + elapsed);
      }
    }, 50);
    playTimer.current = timer as any;

    source.onended = () => {
      clearInterval(timer);
      setPlaying(false);
      setPlayPos(0);
      sourceNodeRef.current = null;
    };
  };

  const previewStop = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (_) {}
      sourceNodeRef.current = null;
    }
    if (playTimer.current) { clearInterval(playTimer.current); playTimer.current = null; }
    setPlaying(false);
    setPlayPos(0);
  };

  // ?? apply trim ????????????????????????????????????????????????????????
  const applyTrim = async () => {
    if (!fileName || startSec >= endSec) return;
    setTrimming(true);
    setError('');
    try {
      const api = (window as any).electron?.ipcRenderer;
      const result = await api.invoke('trim-sound', fileName, startSec, endSec, replaceOriginal);
      if (result?.fileName) {
        onTrimmed(result.fileName);
        onClose();
      }
    } catch (e: any) {
      setError(e?.message || 'Trim failed');
    } finally {
      setTrimming(false);
    }
  };

  if (!open) return null;

  const selStartPct = duration ? (startSec / duration) * 100 : 0;
  const selEndPct = duration ? (endSec / duration) * 100 : 100;
  const selDur = Math.max(0, endSec - startSec);

  return (
    <>
      <div className="fixed inset-0 bg-black/70 z-[9998]" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto surface-card border-accent w-[680px] max-w-[95vw] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-default">
            <h2 className="text-sm font-semibold text-text-primary">
              音频裁剪 — {fileName}
            </h2>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary transition-none">
              <CloseX size={14} />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {loading && (
              <div className="text-sm text-text-secondary text-center py-8">加载中...</div>
            )}
            {error && (
              <div className="text-sm text-accent-red bg-accent-red/8 border border-accent-red/20 rounded-lg px-3 py-2">{error}</div>
            )}

            {/* Waveform canvas */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className="w-full h-auto rounded-lg border border-border-default cursor-col-resize bg-bg-primary"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              />
              {/* Play head */}
              {playing && duration > 0 && (
                <div
                  className="absolute top-0 h-full w-0.5 bg-white z-10 pointer-events-none"
                  style={{ left: `${(playPos / duration) * 100}%` }}
                />
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={playing ? previewStop : previewPlay}
                disabled={!audioBuffer}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-accent text-accent rounded-lg text-xs disabled:opacity-40"
              >
                {playing ? <StopSquare size={12} /> : <PlayTriangle size={12} />}
                {playing ? '停止' : '试听'}
              </button>
              <div className="text-xs text-text-secondary">
                起点 <span className="text-accent font-mono">{startSec.toFixed(2)}s</span>
                {' → '}
                终点 <span className="text-accent font-mono">{endSec.toFixed(2)}s</span>
                {'  '}({selDur.toFixed(2)}s)
              </div>
              <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceOriginal}
                  onChange={(e) => setReplaceOriginal(e.target.checked)}
                  className="accent-accent"
                />
                替换原文件
              </label>
              <div className="flex-1" />
              <button
                onClick={applyTrim}
                disabled={trimming || !audioBuffer || selDur < 0.05}
                className="px-4 py-1.5 bg-accent text-black text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-40"
              >
                {trimming ? '裁剪中...' : '应用裁剪'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
