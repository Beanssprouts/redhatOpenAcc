export type Role = 'ai' | 'user'

export interface Message {
  role: Role
  text: string
}

export interface AppState {
  recording: boolean
  generated: boolean
  playing: boolean
  seconds: number
  progress: number
  messages: Message[]
}

export interface TrackParams {
  instrument: string
  style: string
  bpm: number
  reverb: number
  mood: string[]
}
