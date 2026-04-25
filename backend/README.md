# FastAPI Backend Template

## Quick Start

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

The API will be available at:
- http://127.0.0.1:8000/
- http://127.0.0.1:8000/docs
- http://127.0.0.1:8000/api/v1/health

## Run Tests

```bash
pytest -q
```

## Structure

```text
backend/
  app/
    api/
      v1/
        endpoints/
          health.py
        router.py
    core/
      config.py
    main.py
  tests/
    test_health.py
  requirements.txt
  .env.example
```
