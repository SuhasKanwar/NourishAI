import os
import sys
import json
import re

import fastapi
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from utils.exception import NourishAIException
from utils.logger import logger

from dotenv import load_dotenv

load_dotenv()

app = fastapi.FastAPI()
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["root"])
def root() -> dict:
    return {
        "status": 200,
        "message": "Welcome to the NourishAI. Visit /docs for API documentation."
    }

@app.get("/health", tags=["health"])
def health() -> dict:
    return {
        "status": 200,
        "message": "NourishAI microservice is healthy and running."
    }

@app.exception_handler(NourishAIException)
async def nourishai_exception_handler(request: fastapi.Request, exc: NourishAIException):
    logger.error(f"NourishAI Exception: {exc.error_message}")
    return {
        "status": 500,
        "message": str(exc)
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)