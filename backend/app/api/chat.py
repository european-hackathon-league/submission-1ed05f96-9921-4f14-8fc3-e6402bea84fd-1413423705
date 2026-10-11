from fastapi import APIRouter, HTTPException, Request

from app.agents.chat import ChatDeps, prompt_for
from app.api.deps import agent_or_503, store_of
from app.models.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["agents"])


@router.post("/generation", response_model=ChatResponse)
async def chat_generation(body: ChatRequest, request: Request) -> ChatResponse:
    """Ask about one generation. The agent looks facts up with tools; `sources` lists what it retrieved."""
    agent = agent_or_503(request, "chat_agent")
    store = store_of(request)
    gen = await store.get_generation(body.generationId)
    if not gen:
        raise HTTPException(404, detail=f"Generation {body.generationId} is not stored on the server yet")
    deps = ChatDeps(store=store, generation=gen)
    result = await agent.run(prompt_for(body), deps=deps)
    return ChatResponse(**result.output.model_dump(), sources=deps.sources, model=request.app.state.fast_model)
