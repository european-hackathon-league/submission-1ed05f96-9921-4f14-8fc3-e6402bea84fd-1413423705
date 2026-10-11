import os

# Tests stay offline: no .env files, no keys, no keyless Tavily, no Supabase (MemoryStore).
os.environ["DIXI_NO_ENV_FILES"] = "1"
os.environ["TAVILY_KEYLESS"] = "false"
for k in ("OPENAI_API_KEY", "TAVILY_API_KEY", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"):
    os.environ.pop(k, None)
