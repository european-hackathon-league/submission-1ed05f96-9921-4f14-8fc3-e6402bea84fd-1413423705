"""Generation chat: a PM asks questions about one generation; answers come only from retrieved facts."""
from typing import Literal

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    generationId: str
    question: str = Field(min_length=1, max_length=1000)
    profileId: str | None = Field(default=None, description="The profile the PM is looking at, if any")
    history: list[ChatTurn] = Field(default_factory=list, max_length=12)


class ChatOutput(BaseModel):
    answer: str = Field(description="Plain English, short. Only facts from the tools; say clearly what is not in them")
    cited: list[str] = Field(default_factory=list, description="Fact ids used: principle ids, request titles, decision dates, run ids")


class ChatResponse(ChatOutput):
    sources: list[str] = Field(description="What was actually retrieved for this answer (recorded by code, not the model)")
    model: str
