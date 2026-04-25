'use client'

import { useRef, useState } from 'react'
import { refineTrack } from '../../../lib/api'
import { Message, TrackParams } from './types'

const QUICK = [
  'Slower & sadder',
  'More reverb',
  'Brighter & upbeat',
  'Switch to violin',
  'Add jazz chords',
]

interface Props {
  params: TrackParams
  setParams: (p: TrackParams) => void
}

export default function RightPanel({ params, setParams }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'Record a melody and I\'ll help you shape the perfect sound.' }
  ])
  const [input, setInput] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  function scrollDown() {
    setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, 50)
  }

  async function send(text: string) {
    if (!text.trim()) return
    const userMsg: Message = { role: 'user', text }
    setMessages(m => [...m, userMsg])
    setInput('')
    scrollDown()
    const { reply, updatedParams } = await refineTrack(text, params)
    if (Object.keys(updatedParams).length > 0) setParams({ ...params, ...updatedParams })
    setMessages(m => [...m, { role: 'ai', text: reply }])
    scrollDown()
  }

  return (
    <div className="w-[220px] flex-shrink-0 border-l border-[#ebebeb] bg-white px-[18px] py-[22px] flex flex-col">
      <p className="humit-font-sans text-[9px] font-medium text-[#ccc] tracking-[0.1em] uppercase mb-3">AI Refine</p>

      <div ref={chatRef} className="flex flex-col gap-1.5 mb-2.5 overflow-y-auto flex-1" style={{ maxHeight: 240 }}>
        {messages.map((m, i) => (
          <div key={i}
            className={`humit-pop-in humit-font-sans text-[11px] leading-relaxed px-3 py-2 rounded-xl max-w-[92%] ${
              m.role === 'ai'
                ? 'bg-[#f5f5f3] text-[#666] rounded-bl-[3px]'
                : 'bg-[#e8450a] text-white self-end rounded-br-[3px]'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(input) }}
          placeholder="e.g. make it slower..."
          className="humit-font-sans flex-1 bg-[#fafaf8] border border-[#ebebeb] rounded-[10px] px-3 py-2 text-[11px] text-[#333] placeholder-[#ccc] outline-none focus:border-[#ddd]"
        />
        <button onClick={() => send(input)}
          className="w-[34px] h-[34px] bg-[#e8450a] hover:bg-[#d03d09] rounded-[10px] flex items-center justify-center flex-shrink-0 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>

      <p className="humit-font-sans text-[9px] text-[#ddd] mb-3">Powered by vLLM · open inference</p>

      <div className="h-px bg-[#f0f0f0] mb-3" />

      <p className="humit-font-sans text-[9px] font-medium text-[#ccc] tracking-[0.1em] uppercase mb-2">Quick edits</p>
      {QUICK.map(q => (
        <button key={q} onClick={() => send(q)}
          className="humit-font-sans w-full text-[10px] text-center py-1.5 px-2 rounded-[9px] border border-[#ebebeb] text-[#bbb] bg-[#fafaf8] hover:border-[#e8450a] hover:text-[#e8450a] hover:bg-[#fff5f0] transition-all mb-1">
          {q}
        </button>
      ))}
    </div>
  )
}
