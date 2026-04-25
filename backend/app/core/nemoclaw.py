import json
from openai import OpenAI
from app.core.config import settings

_client: OpenAI | None = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            base_url=f"{settings.NEMOCLAW_BASE_URL}/v1",
            api_key=settings.NEMOCLAW_API_KEY,
        )
    return _client


def arrange_notes(midi_notes: list[dict]) -> dict:
    """
    Send Basic Pitch note data to NemoClaw and get back arrangement parameters.
    midi_notes: list of {pitch, start, end, velocity} dicts from Basic Pitch.
    Returns a dict with keys like tempo, instruments, style — whatever NemoClaw outputs.
    """
    notes_text = json.dumps(midi_notes, indent=2)
    prompt = (
        "You are a music arranger. Given the following detected melody notes in JSON format "
        "(each with pitch in MIDI number, start/end time in seconds, and velocity), "
        "produce a JSON arrangement plan with: tempo (BPM), time_signature, instruments "
        "(list of General MIDI program numbers), and any style notes. "
        "Output only valid JSON, no explanation.\n\n"
        f"Notes:\n{notes_text}"
    )

    response = get_client().chat.completions.create(
        model=settings.NEMOCLAW_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.choices[0].message.content or "{}"
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"raw": content}
