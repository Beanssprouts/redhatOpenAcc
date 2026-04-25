'use client'

import { useEffect, useRef, useState } from 'react'
import { generateTrack } from '../../../lib/api'
import { TrackParams } from './types'

interface Props {
  params: TrackParams
  onGenerated: () => void
}

export default function CenterPanel({ params, onGenerated }: Props) {
  const [recording, setRecording] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [playing, setPlaying]     = useState(false)
  const [seconds, setSeconds]     = useState(0)
  const [progress, setProgress]   = useState(0)
  const [status, setStatus]       = useState('Tap the mic to begin')
  const [statusColor, setStatusColor] = useState('#bbb')
  const [generating, setGenerating]   = useState(false)

  const barsRef  = useRef<HTMLDivElement[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waveRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const playRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const waveContRef = useRef<HTMLDivElement>(null)

  // Build waveform bars on mount
  useEffect(() => {
    if (!waveContRef.current) return
    waveContRef.current.innerHTML = ''
    barsRef.current = []
    for (let i = 0; i < 44; i++) {
      const b = document.createElement('div')
      b.style.cssText = 'width:4px;border-radius:2px;background:#ebebeb;height:3px;transition:height 0.08s,background 0.1s;flex-shrink:0;'
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

  function toggleRecord() {
    if (generated || generating) return
    if (!recording) {
      setRecording(true)
      setSeconds(0)
      setStatus('Recording...')
      setStatusColor('#e8450a')
      animateWave(true)
      let s = 0
      timerRef.current = setInterval(() => {
        s++
        setSeconds(s)
      }, 1000)
    } else {
      clearInterval(timerRef.current!)
      setRecording(false)
      setStatus('Recording saved ✓')
      setStatusColor('#2d7a4f')
      animateWave(false)
    }
  }

  async function handleGenerate() {
    if (recording) toggleRecord()
    setGenerating(true)
    setStatus('Processing your melody...')
    setStatusColor('#bbb')
    animateWave(false)

    // sweep
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
    await generateTrack([], params)
    clearInterval(gi)

    setGenerating(false)
    setGenerated(true)
    setStatus('Your track is ready')
    setStatusColor('#2d7a4f')
    animateWave(false)
    barsRef.current.forEach(b => { b.style.height = '3px'; b.style.background = '#ebebeb' })
    onGenerated()
  }

  function togglePlay() {
    if (!playing) {
      setPlaying(true)
      let p = progress
      playRef.current = setInterval(() => {
        p += 1.2
        if (p >= 100) p = 0
        setProgress(Math.round(p))
      }, 100)
    } else {
      setPlaying(false)
      clearInterval(playRef.current!)
    }
  }

  function reset() {
    clearInterval(timerRef.current!)
    clearInterval(waveRef.current!)
    clearInterval(playRef.current!)
    setRecording(false); setGenerated(false); setPlaying(false)
    setSeconds(0); setProgress(0); setGenerating(false)
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
        {/* rings */}
        <div className="absolute inset-0 rounded-full border border-[#ebebeb] humit-spin-cw-slow">
          <div className="absolute top-[-3px] left-1/2 -ml-[3px] w-[7px] h-[7px] rounded-full bg-[#e8450a]" />
        </div>
        <div className="absolute top-5 left-5 right-5 bottom-5 rounded-full border border-[#ebebeb] humit-spin-ccw-med">
          <div className="absolute bottom-[-3px] left-1/2 -ml-[3px] w-[7px] h-[7px] rounded-full bg-[#e8450a]" />
        </div>
        <div className="absolute top-10 left-10 right-10 bottom-10 rounded-full border border-[#ebebeb] humit-spin-cw-fast">
          <div className="absolute top-1/2 right-[-3px] -mt-[3px] w-[7px] h-[7px] rounded-full bg-[#e8450a]" />
        </div>

        {/* pulse ring */}
        {recording && (
          <div className="absolute top-1/2 left-1/2 w-[62px] h-[62px] rounded-full border-[1.5px] border-[#e8450a] humit-pulse pointer-events-none" />
        )}

        {/* mic button */}
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

      <p className="humit-font-sans text-[11px] h-[18px] text-center mb-1 transition-colors" style={{ color: statusColor }}>{status}</p>
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
              <button className="humit-font-sans flex-1 py-2 rounded-[9px] text-[11px] bg-[#fafaf8] text-[#aaa] border border-[#ebebeb] hover:border-[#ccc] hover:text-[#555] transition-all">
                ↓ MP3
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
