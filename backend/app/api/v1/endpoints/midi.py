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

basic_pitch_model = Model(ICASSP_2022_MODEL_PATH)

router = APIRouter()


class MidiConvertRequest(BaseModel):
    wav_url: AnyHttpUrl


def _cleanup_temp_files(*paths: str) -> None:
    for path in paths:
        try:
            Path(path).unlink(missing_ok=True)
        except OSError:
            pass


@router.post("/convert", summary="Convert a Supabase WAV file to MIDI")
def convert_wav_to_midi(payload: MidiConvertRequest) -> FileResponse:
    wav_temp = NamedTemporaryFile(delete=False, suffix=".wav")
    wav_temp_path = wav_temp.name
    wav_temp.close()

    midi_temp = NamedTemporaryFile(delete=False, suffix=".mid")
    midi_temp_path = midi_temp.name
    midi_temp.close()

    try:
        with httpx.Client(follow_redirects=True, timeout=60.0) as client:
            with client.stream("GET", str(payload.wav_url)) as response:
                response.raise_for_status()
                with open(wav_temp_path, "wb") as wav_file:
                    for chunk in response.iter_bytes():
                        wav_file.write(chunk)

        _, midi_data, _ = predict(wav_temp_path, basic_pitch_model)
        midi_data.write(midi_temp_path)

        file_name = f"{Path(urlparse(str(payload.wav_url)).path).stem or 'transcription'}.mid"
        return FileResponse(
            path=midi_temp_path,
            media_type="audio/midi",
            filename=file_name,
            background=BackgroundTask(_cleanup_temp_files, wav_temp_path, midi_temp_path),
        )
    except httpx.HTTPError as exc:
        _cleanup_temp_files(wav_temp_path, midi_temp_path)
        raise HTTPException(status_code=400, detail=f"Could not download WAV file: {exc}") from exc
    except Exception as exc:
        _cleanup_temp_files(wav_temp_path, midi_temp_path)
        raise HTTPException(status_code=500, detail=f"Could not convert WAV to MIDI: {exc}") from exc
