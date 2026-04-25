'use client'

const NAV = ['Studio', 'Library', 'Export']

export default function Topbar() {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#ebebeb]">
      <div className="humit-font-serif italic text-[22px] text-[#1a1a1a]">
        hum<span className="text-[#e8450a]">it</span>
      </div>

      <div className="flex gap-1">
        {NAV.map(n => (
          <button
            key={n}
            className={`humit-font-sans text-[11px] px-4 py-1.5 rounded-full transition-all ${
              n === 'Studio'
                ? 'bg-[#f0ede8] text-[#333]'
                : 'text-[#999] hover:text-[#555]'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[#2d7a4f] bg-[#f0faf4] border border-[#b8e8cc] rounded-full px-3 py-1">
        <span className="w-[5px] h-[5px] rounded-full bg-[#2d7a4f] humit-blink inline-block" />
        vLLM connected
      </div>
    </div>
  )
}
