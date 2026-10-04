"""
MediLogic X — FastAPI application entry point.

Run:
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Then open the React app with VITE_API_URL=http://localhost:8000
(frontend/.env or environment variable).

The inference engine (engine.py) is fully independent of this HTTP layer:
it can be imported and tested directly — see `python engine.py`.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routes import api

app = FastAPI(
    title="MediLogic X",
    description="Adaptive Explainable Medical Expert System — Forward & Backward Chaining",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/")
def root() -> dict:
    return {
        "name": "MediLogic X",
        "kind": "rule-based expert system (educational)",
        "endpoints": ["/api/diagnosis/forward", "/api/diagnosis/backward",
                      "/api/diagnosis/next-question", "/api/diagnosis/what-if",
                      "/api/diagnosis/demo", "/api/knowledge/rules", "/api/history"],
        "disclaimer": "Educational decision-support system. Not a medical device.",
    }


app.include_router(api)
