from dataclasses import dataclass, field

from pydantic_ai import RunContext

BUDGET_USED_UP = "Search budget for this task is used up. Do not search again: write your final answer now from what you found."


@dataclass
class ResearchDeps:
    """Shared by the orchestrator and its scouts (the harness forwards deps to sub-agents)."""

    seen_urls: set[str] = field(default_factory=set)
    searches: int = 0
    # Soft budget per scout run: past it, the search tool answers BUDGET_USED_UP instead of searching. A hard
    # UsageLimits cap would abort the scout mid-turn (models fire several searches in parallel) and lose its findings.
    search_budget: int = 6
    _by_run: dict[str, int] = field(default_factory=dict)

    def take_search(self, ctx: RunContext) -> bool:
        """Reserve one search for this run; False when the run's budget is used up."""
        n = self._by_run.get(ctx.run_id, 0)
        if n >= self.search_budget:
            return False
        self._by_run[ctx.run_id] = n + 1
        return True
