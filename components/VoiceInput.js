'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, Stop } from '../lib/icons';
import { safeFrontendText } from '../lib/brand-view.js';

const MAX_RECORD_MS = 60_000;
const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];

export default function VoiceInput({ onText, disabled = false }) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    setSupported(!!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder));
    return () => {
      clearTimeout(timerRef.current);
      try { recorderRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function transcribe(file) {
    if (!file || busy || disabled) return;
    if (file.size > 3 * 1024 * 1024) { setError('Audio must be no larger than 3 MB.'); return; }
    setBusy(true); setError('');
    try {
      const form = new FormData();
      form.append('audio', file, file.name || 'voice.webm');
      const response = await fetch('/api/transcribe', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(safeFrontendText(data.error || 'Audio transcription failed.'));
      if (!data.text) throw new Error('No speech was detected.');
      onText(data.text);
    } catch (e) { setError(safeFrontendText(e.message || 'Could not transcribe audio.')); }
    finally { setBusy(false); }
  }

  async function start() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = mimeCandidates.find((x) => MediaRecorder.isTypeSupported(x)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm';
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
        if (blob.size) transcribe(new File([blob], `voice.${ext}`, { type: blob.type }));
        else setError('No audio was recorded. Please try again.');
      };
      recorder.start();
      setRecording(true);
      timerRef.current = setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, MAX_RECORD_MS);
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? 'Allow microphone access to record voice.' : 'Microphone recording is unavailable. Upload an audio file instead.');
    }
  }

  function toggle() {
    if (busy || disabled) return;
    if (!supported) { inputRef.current?.click(); return; }
    if (recording) {
      clearTimeout(timerRef.current);
      if (recorderRef.current?.state !== 'inactive') recorderRef.current.stop();
    } else start();
  }

  return (
    <span className="voice-control">
      <button type="button" className={'iconbtn sm voicebtn' + (recording ? ' recording' : '')} onClick={toggle}
        disabled={disabled || busy} aria-label={recording ? 'Stop recording and transcribe' : busy ? 'Transcribing audio' : supported ? 'Record voice input' : 'Upload audio to transcribe'}
        title={recording ? 'Stop and transcribe' : busy ? 'Transcribing…' : supported ? 'Record voice input (up to 60 seconds)' : 'Upload audio to transcribe'}>
        {recording ? <Stop width="17" height="17" /> : <Mic width="17" height="17" />}
      </button>
      <input ref={inputRef} type="file" accept="audio/*" hidden onChange={(e) => { transcribe(e.target.files?.[0]); e.target.value = ''; }} />
      {(recording || busy) && <span className="voice-status" role="status">{recording ? 'Recording' : 'Transcribing'}</span>}
      {error && <span className="voice-error" role="alert" title={error}>Audio: {error}</span>}
    </span>
  );
}
