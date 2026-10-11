from dataclasses import dataclass, field


@dataclass
class ResearchDeps:
    """Shared by the orchestrator and its scouts (the harness forwards deps to sub-agents)."""

    seen_urls: set[str] = field(default_factory=set)
    searches: int = 0
