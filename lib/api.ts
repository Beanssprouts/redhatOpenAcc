import { supabase, AUDIO_BUCKET } from './supabase'
import { TrackParams } from '../app/components/HumIt/types'

// Uploads the recorded audio blob to Supabase Storage.
// Returns the storage path so the backend can pick it up.
export async function uploadRecording(blob: Blob, mimeType: string): Promise<string> {
  const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
  const fileName = `recording-${Date.now()}.${ext}`
  const path = `input/${fileName}`

  const { error } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(path, blob, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`Upload failed: ${error.message}`)
  return path
}

// Polls Supabase Storage for the finished MP3.
// The backend is expected to write to output/<same-filename>.mp3
export async function pollForResult(
  inputPath: string,
  timeoutMs = 60_000
): Promise<string> {
  const outputPath = inputPath.replace('input/', 'output/').replace(/\.\w+$/, '.mp3')
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const { data } = await supabase.storage.from(AUDIO_BUCKET).list(
      outputPath.split('/').slice(0, -1).join('/'),
      { search: outputPath.split('/').pop() }
    )
    if (data && data.length > 0) {
      const { data: urlData } = supabase.storage
        .from(AUDIO_BUCKET)
        .getPublicUrl(outputPath)
      return urlData.publicUrl
    }
    await new Promise(r => setTimeout(r, 3000))
  }

  throw new Error('Timed out waiting for track generation')
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
