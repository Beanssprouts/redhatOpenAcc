import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlparse

import httpx
from basic_pitch import ICASSP_2022_MODEL_PATH
from basic_pitch.inference import Model, predict
from fastapi import APIRouter, HTTPException
from pydantic import AnyHttpUrl, BaseModel
from starlette.background import BackgroundTask
from starlette.responses import FileResponse
from supabase import create_client

from app.core.config import settings
from app.core.nemoclaw import arrange_notes

basic_pitch_model = Model(ICASSP_2022_MODEL_PATH)

router = APIRouter()


class MidiConvertRequest(BaseModel):
    wav_url: AnyHttpUrl
    output_path: str  # Supabase storage path for the finished MP3, e.g. "output/recording-123.mp3"


def _cleanup_temp_files(*paths: str) -> None:
    for path in paths:
        try:
            Path(path).unlink(missing_ok=True)
        except OSError:
            pass


def _midi_notes_to_list(midi_data) -> list[dict]:
    notes = []
    for instrument in midi_data.instruments:
        for note in instrument.notes:
            notes.append({
                "pitch": note.pitch,
                "start": round(note.start, 3),
                "end": round(note.end, 3),
                "velocity": note.velocity,
            })
    notes.sort(key=lambda n: n["start"])
    return notes


@router.post("/convert", summary="Convert a WAV file to MP3 via Basic Pitch + NemoClaw + FluidSynth")
def convert_wav_to_mp3(payload: MidiConvertRequest) -> dict:
    wav_temp = NamedTemporaryFile(delete=False, suffix=".wav")
    wav_temp_path = wav_temp.name
    wav_temp.close()

    midi_temp = NamedTemporaryFile(delete=False, suffix=".mid")
    midi_temp_path = midi_temp.name
    midi_temp.close()

    mp3_temp = NamedTemporaryFile(delete=False, suffix=".mp3")
    mp3_temp_path = mp3_temp.name
    mp3_temp.close()

    try:
        # 1. Download audio from Supabase
        with httpx.Client(follow_redirects=True, timeout=60.0) as client:
            with client.stream("GET", str(payload.wav_url)) as response:
                response.raise_for_status()
                with open(wav_temp_path, "wb") as f:
                    for chunk in response.iter_bytes():
                        f.write(chunk)

        # 2. Basic Pitch: audio → MIDI
        _, midi_data, _ = predict(wav_temp_path, basic_pitch_model)
        midi_data.write(midi_temp_path)

        # 3. NemoClaw: MIDI notes → arrangement plan
        notes = _midi_notes_to_list(midi_data)
        arrangement = arrange_notes(notes)
        tempo = arrangement.get("tempo", 120)

        # 4. FluidSynth: MIDI → MP3
        # Requires fluidsynth installed and a soundfont at /usr/share/sounds/sf2/default.sf2
        # (on Ubuntu: apt install fluidsynth fluid-soundfont-gm)
        soundfont = "/usr/share/sounds/sf2/default.sf2"
        result = subprocess.run(
            [
                "fluidsynth", "-ni",
                "-F", mp3_temp_path,
                "-T", "mp3",
                "-r", "44100",
                soundfont,
                midi_temp_path,
            ],
            capture_output=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(f"FluidSynth failed: {result.stderr.decode()}")

        # 5. Upload MP3 to Supabase output/
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        with open(mp3_temp_path, "rb") as f:
            mp3_bytes = f.read()

        supabase.storage.from_(settings.AUDIO_BUCKET).upload(
            payload.output_path,
            mp3_bytes,
            {"content-type": "audio/mpeg", "upsert": "true"},
        )

        public_url = supabase.storage.from_(settings.AUDIO_BUCKET).get_public_url(payload.output_path)
        return {"mp3_url": public_url, "arrangement": arrangement}

    except httpx.HTTPError as exc:
        raise HTTPException(status_code=400, detail=f"Could not download audio: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        _cleanup_temp_files(wav_temp_path, midi_temp_path, mp3_temp_path)
