'use client'

import { useState } from 'react'
import './humit.css'
import Topbar from './Topbar'
import LeftPanel from './LeftPanel'
import CenterPanel from './CenterPanel'
import RightPanel from './RightPanel'
import { TrackParams } from './types'

const DEFAULT_PARAMS: TrackParams = {
  instrument: 'Piano',
  style: 'Jazz',
  bpm: 72,
  reverb: 40,
  mood: ['Melancholic'],
}

export default function HumIt() {
  const [params, setParams] = useState<TrackParams>(DEFAULT_PARAMS)
  const [generated, setGenerated] = useState(false)

  return (
    <div className="bg-[#fafaf8] w-full min-h-screen flex flex-col">
      <Topbar />
      <div className="flex flex-1 min-h-0 h-[calc(100vh-57px)]">
        <LeftPanel params={params} setParams={setParams} />
        <CenterPanel params={params} onGenerated={() => setGenerated(true)} />
        <RightPanel params={params} setParams={setParams} />
      </div>
    </div>
  )
}
