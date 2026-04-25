'use client'

import { useEffect, useRef, useState } from 'react'
import { uploadRecording, generateTrack } from '../../../lib/api'
import { TrackParams } from './types'

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
}

async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  await audioCtx.close()

  const numChannels = audioBuffer.numberOfChannels
  const sampleRate  = audioBuffer.sampleRate
  const numSamples  = audioBuffer.length
  const bitsPerSample = 16
  const dataLength  = numSamples * numChannels * 2  // 2 bytes per sample

  const interleaved = new Int16Array(numSamples * numChannels)
  for (let ch = 0; ch < numChannels; ch++) {
    const chData = audioBuffer.getChannelData(ch)
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, chData[i]))
      interleaved[i * numChannels + ch] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
  }

  const wavBuffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(wavBuffer)
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataLength, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)                                         // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)              // byte rate
  view.setUint16(32, numChannels * 2, true)                           // block align
  view.setUint16(34, bitsPerSample, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataLength, true)
  new Int16Array(wavBuffer, 44).set(interleaved)

  return new Blob([wavBuffer], { type: 'audio/wav' })
}

interface Props {
  params: TrackParams
  onGenerated: () => void
}

export default function CenterPanel({ params, onGenerated }: Props) {
  const [recording, setRecording]     = useState(false)
  const [generated, setGenerated]     = useState(false)
  const [playing, setPlaying]         = useState(false)
  const [seconds, setSeconds]         = useState(0)
  const [progress, setProgress]       = useState(0)
  const [status, setStatus]           = useState('Tap the mic to begin')
  const [statusColor, setStatusColor] = useState('#bbb')
  const [generating, setGenerating]   = useState(false)
  const [mp3Url, setMp3Url]           = useState('')
  const [micError, setMicError]       = useState('')

  // waveform bars
  const barsRef     = useRef<HTMLDivElement[]>([])
  const waveContRef = useRef<HTMLDivElement>(null)
  const waveRef     = useRef<ReturnType<typeof setInterval> | null>(null)

  // timers / playback
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const playRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const audioBlobRef     = useRef<Blob | null>(null)
  const mimeTypeRef      = useRef('audio/webm')

  // live amplitude via AnalyserNode
  const analyserRef  = useRef<AnalyserNode | null>(null)
  const audioCtxRef  = useRef<AudioContext | null>(null)

  // Build waveform bars on mount
  useEffect(() => {
    if (!waveContRef.current) return
    waveContRef.current.innerHTML = ''
    barsRef.current = []
    for (let i = 0; i < 44; i++) {
      const b = document.createElement('div')
      b.style.cssText =
        'width:4px;border-radius:2px;background:#ebebeb;height:3px;transition:height 0.08s,background 0.1s;flex-shrink:0;'
      waveContRef.current.appendChild(b)
      barsRef.current.push(b)
    }
  }, [])

  function animateWave(on: boolean) {
    clearInterval(waveRef.current!)
    if (!on) {
      barsRef.current.forEach(b => { b.style.height = '3px'; b.style.background = '#ebebeb' })
      return
    }

    if (analyserRef.current) {
      // live amplitude from the mic
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount)
      waveRef.current = setInterval(() => {
        analyserRef.current!.getByteTimeDomainData(buf)
        barsRef.current.forEach((b, i) => {
          const idx = Math.floor((i / barsRef.current.length) * buf.length)
          const v = (buf[idx] - 128) / 128
          const h = Math.abs(v) * 40 + 3
          b.style.height = Math.round(h) + 'px'
          b.style.background = '#e8450a'
        })
      }, 55)
    } else {
      // fallback sine animation
      let t = 0
      waveRef.current = setInterval(() => {
        t++
        barsRef.current.forEach((b, i) => {
          const h = Math.abs(Math.sin(t * 0.18 + i * 0.38)) * 30 + 3
          b.style.height = Math.round(h) + 'px'
          b.style.background = '#e8450a'
        })
      }, 55)
    }
  }

  async function toggleRecord() {
    if (generated || generating) return
    setMicError('')

    if (!recording) {
      // --- start recording ---
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      } catch {
        setMicError('Microphone access denied — please allow it in your browser.')
        return
      }

      // live amplitude for waveform
      const audioCtx = new AudioContext()
      const source   = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      audioCtxRef.current  = audioCtx
      analyserRef.current  = analyser

      // pick best supported MIME type
      const mime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm'             :
        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus'  :
        'audio/mp4'
      mimeTypeRef.current = mime

      chunksRef.current = []
      const mr = new MediaRecorder(stream, { mimeType: mime })
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const baseMime = mime.split(';')[0]
        audioBlobRef.current = new Blob(chunksRef.current, { type: baseMime })
        stream.getTracks().forEach(t => t.stop())
        audioCtx.close()
        analyserRef.current = null
      }
      mr.start(100)
      mediaRecorderRef.current = mr

      setRecording(true)
      setSeconds(0)
      setStatus('Recording...')
      setStatusColor('#e8450a')
      animateWave(true)
      let s = 0
      timerRef.current = setInterval(() => { s++; setSeconds(s) }, 1000)

    } else {
      // --- stop recording ---
      clearInterval(timerRef.current!)
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setRecording(false)
      setStatus('Recording saved ✓')
      setStatusColor('#2d7a4f')
      animateWave(false)
    }
  }

  async function handleGenerate() {
    // stop mic if still running
    if (recording) {
      clearInterval(timerRef.current!)
      mediaRecorderRef.current?.stop()
      setRecording(false)
      animateWave(false)
      // wait for onstop to finish writing the blob
      await new Promise(r => setTimeout(r, 300))
    }

    if (!audioBlobRef.current) {
      setStatus('No recording found — try again.')
      setStatusColor('#e8450a')
      return
    }

    setGenerating(true)
    setStatus('Uploading your melody...')
    setStatusColor('#bbb')

    // sweep animation
    barsRef.current.forEach((b, i) => {
      setTimeout(() => { b.style.background = '#e8450a'; b.style.height = '3px' }, i * 12)
    })
    await new Promise(r => setTimeout(r, 400))
    let t2 = 0
    const gi = setInterval(() => {
      t2++
      barsRef.current.forEach((b, i) => {
        const h = Math.abs(Math.sin(t2 * 0.12 + i * 0.5)) * 20 + 3
        b.style.height = Math.round(h) + 'px'
        b.style.background = '#e8450a'
      })
    }, 55)

    try {
      // 1. convert to WAV then upload to Supabase input/
      setStatus('Converting to WAV...')
      const wavBlob = await blobToWav(audioBlobRef.current)
      const { inputPath, outputPath } = await uploadRecording(wavBlob)

      // 2. call backend: Basic Pitch → NemoClaw → FluidSynth → Supabase output/
      setStatus('Generating your track...')
      const url = await generateTrack(inputPath, outputPath)
      setMp3Url(url)

      clearInterval(gi)
      setGenerating(false)
      setGenerated(true)
      setStatus('Your track is ready')
      setStatusColor('#2d7a4f')
      animateWave(false)
      barsRef.current.forEach(b => { b.style.height = '3px'; b.style.background = '#ebebeb' })
      onGenerated()
    } catch (err) {
      clearInterval(gi)
      setGenerating(false)
      setStatus((err as Error).message ?? 'Something went wrong.')
      setStatusColor('#e8450a')
      animateWave(false)
    }
  }

  function togglePlay() {
    if (!mp3Url) return
    if (!playing) {
      if (!audioRef.current) audioRef.current = new Audio(mp3Url)
      audioRef.current.play()
      setPlaying(true)
      let p = progress
      playRef.current = setInterval(() => {
        p += 1.2
        if (p >= 100) { p = 0; setPlaying(false); clearInterval(playRef.current!) }
        setProgress(Math.round(p))
      }, 100)
    } else {
      audioRef.current?.pause()
      setPlaying(false)
      clearInterval(playRef.current!)
    }
  }

  function reset() {
    clearInterval(timerRef.current!)
    clearInterval(waveRef.current!)
    clearInterval(playRef.current!)
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    audioRef.current?.pause()
    audioRef.current = null
    audioBlobRef.current = null
    analyserRef.current  = null
    setRecording(false); setGenerated(false); setPlaying(false)
    setSeconds(0); setProgress(0); setGenerating(false)
    setMp3Url(''); setMicError('')
    setStatus('Tap the mic to begin'); setStatusColor('#bbb')
    animateWave(false)
  }

  const canGenerate = seconds >= 2 && !generated && !generating
  const m = Math.floor(seconds / 60), s = seconds % 60
  const timeStr = m + ':' + (s < 10 ? '0' : '') + s
  const trackLabel = `${params.instrument} · ${params.style} · ${params.mood[0] ?? ''}`

  return (
    <div className="flex-1 flex flex-col items-center justify-start bg-[#fafaf8] px-6 py-9">
      <h1 className="humit-font-serif italic text-[30px] text-[#1a1a1a] text-center mb-1">Hum your melody</h1>
      <p className="humit-font-sans text-[12px] text-[#bbb] text-center mb-8">Pick a sound, hit record, sing anything</p>

      {/* Orbit */}
      <div className="relative w-[160px] h-[160px] mb-6">
        <div className="absolute inset-0 rounded-full border border-[#ebebeb] humit-spin-cw-slow">
          <div className="absolute top-[-3px] left-1/2 -ml-[3px] w-[7px] h-[7px] rounded-full bg-[#e8450a]" />
        </div>
        <div className="absolute top-5 left-5 right-5 bottom-5 rounded-full border border-[#ebebeb] humit-spin-ccw-med">
          <div className="absolute bottom-[-3px] left-1/2 -ml-[3px] w-[7px] h-[7px] rounded-full bg-[#e8450a]" />
        </div>
        <div className="absolute top-10 left-10 right-10 bottom-10 rounded-full border border-[#ebebeb] humit-spin-cw-fast">
          <div className="absolute top-1/2 right-[-3px] -mt-[3px] w-[7px] h-[7px] rounded-full bg-[#e8450a]" />
        </div>

        {recording && (
          <div className="absolute top-1/2 left-1/2 w-[62px] h-[62px] rounded-full border-[1.5px] border-[#e8450a] humit-pulse pointer-events-none" style={{ transform: 'translate(-50%, -50%)' }} />
        )}

        <button
          onClick={toggleRecord}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[62px] h-[62px] rounded-full bg-white flex items-center justify-center z-10 transition-all border ${
            recording ? 'border-[#e8450a] border-[1.5px] bg-[#fff5f0]' : 'border-[#e8e8e8] hover:border-[#e8450a] hover:bg-[#fff5f0]'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={recording ? '#e8450a' : '#ccc'} strokeWidth="1.5">
            <rect x="9" y="2" width="6" height="11" rx="3"/>
            <path d="M5 10a7 7 0 0014 0M12 19v3M8 22h8"/>
          </svg>
        </button>
      </div>

      {/* Waveform */}
      <div ref={waveContRef} className="flex items-center gap-[2.5px] h-[44px] w-full max-w-[360px] mb-3" />

      {micError ? (
        <p className="humit-font-sans text-[11px] h-[18px] text-center mb-1 text-[#e8450a]">{micError}</p>
      ) : (
        <p className="humit-font-sans text-[11px] h-[18px] text-center mb-1 transition-colors" style={{ color: statusColor }}>{status}</p>
      )}

      <p className="humit-font-sans font-light text-[34px] text-center mb-5 tracking-tight transition-colors" style={{ color: seconds > 0 ? '#1a1a1a' : '#ddd' }}>
        {timeStr}
      </p>

      <div className="flex gap-2 mb-8">
        <button onClick={toggleRecord} disabled={generated || generating}
          className="humit-font-sans text-[12px] px-6 py-2.5 rounded-[10px] bg-[#e8450a] text-white border border-[#e8450a] hover:bg-[#d03d09] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          {recording ? 'Stop' : generated ? 'Recorded' : 'Record'}
        </button>
        <button onClick={handleGenerate} disabled={!canGenerate}
          className="humit-font-sans text-[12px] px-6 py-2.5 rounded-[10px] bg-white text-[#aaa] border border-[#e8e8e8] hover:border-[#ccc] hover:text-[#555] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          {generating ? 'Generating...' : generated ? 'Generated ✓' : 'Generate'}
        </button>
        <button onClick={reset}
          className="humit-font-sans text-[12px] px-6 py-2.5 rounded-[10px] bg-white text-[#aaa] border border-[#e8e8e8] hover:border-[#ccc] hover:text-[#555] transition-all">
          Reset
        </button>
      </div>

      {/* Track card */}
      {generated && (
        <div className="w-full max-w-[400px] humit-slide-up">
          <div className="bg-white border border-[#ebebeb] rounded-[14px] p-[18px]">
            <div className="flex justify-between items-center mb-3">
              <span className="humit-font-sans text-[13px] font-medium text-[#333]">{trackLabel}</span>
              <span className="humit-font-sans text-[9px] px-2.5 py-0.5 rounded-full bg-[#f0faf4] text-[#2d7a4f] border border-[#b8e8cc]">Ready</span>
            </div>
            <div className="h-[3px] bg-[#f0f0f0] rounded-full mb-1.5 overflow-hidden cursor-pointer">
              <div className="h-full bg-[#e8450a] rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between humit-font-sans text-[9px] text-[#ccc] mb-3">
              <span>0:0{Math.round(progress * 0.09)}</span><span>0:09</span>
            </div>
            <div className="flex gap-1.5">
              <button onClick={togglePlay}
                className={`humit-font-sans flex-1 py-2 rounded-[9px] text-[11px] border transition-all ${
                  playing ? 'bg-[#e8450a] text-white border-[#e8450a] hover:bg-[#d03d09]' : 'bg-[#fafaf8] text-[#aaa] border-[#ebebeb] hover:border-[#ccc] hover:text-[#555]'
                }`}>
                {playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button onClick={reset}
                className="humit-font-sans flex-1 py-2 rounded-[9px] text-[11px] bg-[#fafaf8] text-[#aaa] border border-[#ebebeb] hover:border-[#ccc] hover:text-[#555] transition-all">
                ↩ Redo
              </button>
              {mp3Url && (
                <a href={mp3Url} download
                  className="humit-font-sans flex-1 py-2 rounded-[9px] text-[11px] bg-[#fafaf8] text-[#aaa] border border-[#ebebeb] hover:border-[#ccc] hover:text-[#555] transition-all text-center">
                  ↓ MP3
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
