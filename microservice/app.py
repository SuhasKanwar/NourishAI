import os

import fastapi
import uvicorn
from fastapi import HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agents.orchestrator import NourishAgentOrchestrator
from database import init_db
from models.schemas import ActionRunRequest, AgentRunRequest, OAuthStartResponse
from services.context import ContextService
from services.oauth import SwiggyOAuthService
from utils.exception import NourishAIException
from utils.logger import logger

from dotenv import load_dotenv

load_dotenv()

app = fastapi.FastAPI(title="NourishAI Agent Microservice", version="1.0.0")
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = NourishAgentOrchestrator()
context_service = ContextService()
oauth_service = SwiggyOAuthService()


@app.on_event("startup")
def startup() -> None:
    init_db()


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


@app.post("/agent/run", tags=["agent"])
async def run_agent(request: AgentRunRequest):
    return await orchestrator.run(request)


@app.post("/agent/action", tags=["agent"])
async def run_action(request: ActionRunRequest):
    return await orchestrator.execute_action(request.action, user_id=request.user_id)


@app.get("/user/context", tags=["user"])
async def get_user_context(
    user_id: str = "demo-user",
    prompt: str = "",
    location: str | None = None,
    address_id: str | None = None,
):
    return await context_service.collect(
        user_id=user_id,
        prompt=prompt,
        location=location,
        address_id=address_id,
    )


@app.get("/mcp/auth/start", response_model=OAuthStartResponse, tags=["mcp"])
def start_mcp_auth(user_id: str = "demo-user"):
    try:
        authorization_url, state = oauth_service.authorization_url(user_id)
        return OAuthStartResponse(authorization_url=authorization_url, state=state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/mcp/auth/callback", tags=["mcp"])
@app.get("/mcp/auth/callback", tags=["mcp"])
async def mcp_auth_callback(
    code: str = Query(...),
    state: str = Query(...),
):
    try:
        return await oauth_service.callback(code=code, state=state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.exception_handler(NourishAIException)
async def nourishai_exception_handler(request: fastapi.Request, exc: NourishAIException):
    logger.error(f"NourishAI Exception: {exc.error_message}")
    return JSONResponse(status_code=500, content={"status": 500, "message": str(exc)})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
