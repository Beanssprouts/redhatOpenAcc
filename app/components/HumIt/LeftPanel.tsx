'use client'

import { useState } from 'react'
import { TrackParams } from './types'

const MOODS = ['Melancholic', 'Upbeat', 'Cinematic', 'Calm', 'Tense', 'Dreamy']
const HISTORY = [
  { name: 'Violin · Folk', meta: '2 min ago' },
  { name: 'Guitar · Ambient', meta: '18 min ago' },
]

interface Props {
  params: TrackParams
  setParams: (p: TrackParams) => void
}

export default function LeftPanel({ params, setParams }: Props) {
  const [vibeInput, setVibeInput] = useState('')

  function toggleMood(m: string) {
    const next = params.mood.includes(m)
      ? params.mood.filter(x => x !== m)
      : [...params.mood, m]
    setParams({ ...params, mood: next })
  }

  function addCustomVibe() {
    const trimmed = vibeInput.trim()
    if (!trimmed || params.mood.includes(trimmed)) return
    setParams({ ...params, mood: [...params.mood, trimmed] })
    setVibeInput('')
  }

  return (
    <div className="w-[210px] flex-shrink-0 border-r border-[#ebebeb] bg-white px-[18px] py-[22px]">
      <p className="humit-font-sans text-[9px] font-medium text-[#ccc] tracking-[0.1em] uppercase mb-3">Sound</p>

      <p className="humit-font-sans text-[10px] text-[#bbb] mb-1">Instrument</p>
      <div className="flex justify-between items-center bg-[#fafaf8] border border-[#e8e8e8] rounded-[10px] px-3 py-2 mb-3 cursor-pointer hover:border-[#ccc] transition-colors">
        <span className="humit-font-sans text-[12px] text-[#333]">{params.instrument}</span>
        <span className="text-[10px] text-[#ccc]">▾</span>
      </div>

      <p className="humit-font-sans text-[10px] text-[#bbb] mb-1">Style</p>
      <div className="flex justify-between items-center bg-[#fafaf8] border border-[#e8e8e8] rounded-[10px] px-3 py-2 mb-3 cursor-pointer hover:border-[#ccc] transition-colors">
        <span className="humit-font-sans text-[12px] text-[#333]">{params.style}</span>
        <span className="text-[10px] text-[#ccc]">▾</span>
      </div>

      <p className="humit-font-sans text-[10px] text-[#bbb] mb-2">Mood</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {MOODS.map(m => (
          <button
            key={m}
            onClick={() => toggleMood(m)}
            className={`humit-font-sans text-[10px] px-3 py-1 rounded-full border transition-all ${
              params.mood.includes(m)
                ? 'bg-[#fff5f0] border-[#e8c4b0] text-[#b84a1e]'
                : 'bg-white border-[#e8e8e8] text-[#bbb] hover:border-[#ccc] hover:text-[#777]'
            }`}
          >
            {m}
          </button>
        ))}
        {params.mood.filter(m => !MOODS.includes(m)).map(m => (
          <button
            key={m}
            onClick={() => toggleMood(m)}
            className="humit-font-sans text-[10px] px-3 py-1 rounded-full border bg-[#fff5f0] border-[#e8c4b0] text-[#b84a1e] transition-all"
          >
            {m}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 mb-4">
        <input
          type="text"
          placeholder="Your vibe..."
          value={vibeInput}
          onChange={e => setVibeInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustomVibe()}
          className="humit-font-sans text-[10px] flex-1 bg-[#fafaf8] border border-[#e8e8e8] rounded-full px-3 py-1 text-[#333] placeholder-[#ccc] outline-none focus:border-[#e8c4b0] transition-colors"
        />
        <button
          onClick={addCustomVibe}
          className="w-[22px] h-[22px] rounded-full bg-[#e8450a] text-white flex items-center justify-center flex-shrink-0 hover:bg-[#c73a08] transition-colors text-[14px] leading-none"
        >
          +
        </button>
      </div>

      <p className="humit-font-sans text-[10px] text-[#bbb] mb-1">Tempo</p>
      <div className="flex items-center gap-2 mb-3">
        <span className="humit-font-sans text-[10px] text-[#ccc] w-11">BPM</span>
        <input
          type="range" min={40} max={180} step={1} value={params.bpm}
          onChange={e => setParams({ ...params, bpm: Number(e.target.value) })}
          className="flex-1 accent-[#e8450a]"
        />
        <span className="humit-font-sans text-[10px] text-[#bbb] w-7 text-right">{params.bpm}</span>
      </div>

      <p className="humit-font-sans text-[10px] text-[#bbb] mb-1">Reverb</p>
      <div className="flex items-center gap-2 mb-4">
        <span className="humit-font-sans text-[10px] text-[#ccc] w-11">Wet</span>
        <input
          type="range" min={0} max={100} step={1} value={params.reverb}
          onChange={e => setParams({ ...params, reverb: Number(e.target.value) })}
          className="flex-1 accent-[#e8450a]"
        />
        <span className="humit-font-sans text-[10px] text-[#bbb] w-7 text-right">{params.reverb}%</span>
      </div>

      <div className="h-px bg-[#f0f0f0] my-4" />

      <p className="humit-font-sans text-[9px] font-medium text-[#ccc] tracking-[0.1em] uppercase mb-3">Recent</p>
      {HISTORY.map(h => (
        <div key={h.name} className="flex items-center gap-2 px-1.5 py-1.5 rounded-[10px] cursor-pointer hover:bg-[#f5f5f3] transition-colors mb-1">
          <div className="w-[30px] h-[30px] rounded-lg bg-[#fafaf8] border border-[#ebebeb] flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <div>
            <div className="humit-font-sans text-[11px] text-[#777]">{h.name}</div>
            <div className="humit-font-sans text-[9px] text-[#ccc]">{h.meta}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
