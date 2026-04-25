import { TrackParams } from '../components/HumIt/types'

export async function generateTrack(
  notes: number[],
  params: TrackParams
): Promise<{ wavUrl: string }> {
  // TODO: replace with real call
  // const res = await fetch('/api/generate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ notes, ...params }),
  // })
  // return res.json()

  await new Promise(r => setTimeout(r, 2200))
  return { wavUrl: '' } // blob URL will go here
}

export async function refineTrack(
  message: string,
  currentParams: TrackParams
): Promise<{ reply: string; updatedParams: Partial<TrackParams> }> {
  // TODO: replace with real vLLM call
  // const res = await fetch('/api/refine', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ message, currentParams }),
  // })
  // return res.json()

  const replies = [
    'Got it! Adjusting your track now...',
    'Done — regenerating with those changes.',
    'Applied! Sounds great with that tweak.',
    'On it, give me a second to re-render.',
    'Nice choice — updating the track now.',
  ]
  await new Promise(r => setTimeout(r, 700))
  return {
    reply: replies[Math.floor(Math.random() * replies.length)],
    updatedParams: {},
  }
}
