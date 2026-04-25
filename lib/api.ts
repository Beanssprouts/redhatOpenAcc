import { supabase, AUDIO_BUCKET } from './supabase'
import { TrackParams } from '../app/components/HumIt/types'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000'

// Uploads the recorded audio blob (WAV) to Supabase Storage.
// Returns { inputPath, outputPath } so the backend knows where to read from and write to.
export async function uploadRecording(
  blob: Blob
): Promise<{ inputPath: string; outputPath: string }> {
  const fileName = `recording-${Date.now()}`
  const inputPath = `input/${fileName}.wav`
  const outputPath = `output/${fileName}.mp3`

  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(inputPath, blob, { contentType: 'audio/wav', upsert: false })

  if (error) throw new Error(`Upload failed: ${error.message}`)
  return { inputPath, outputPath }
}

// Calls the backend to run the full pipeline:
// Basic Pitch → NemoClaw → FluidSynth → uploads MP3 to Supabase output/
// Returns the public URL of the finished MP3.
export async function generateTrack(
  inputPath: string,
  outputPath: string
): Promise<string> {
  const { data: urlData } = supabase.storage
    .from(AUDIO_BUCKET)
    .getPublicUrl(inputPath)

  const res = await fetch(`${BACKEND_URL}/api/v1/midi/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wav_url: urlData.publicUrl, output_path: outputPath }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Track generation failed: ${err}`)
  }

  const json = await res.json()
  return json.mp3_url as string
}

export async function refineTrack(
  message: string,
  currentParams: TrackParams
): Promise<{ reply: string; updatedParams: Partial<TrackParams> }> {
  // TODO: replace with real vLLM call
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
