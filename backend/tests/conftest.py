import os

# Tests stay offline: no keys, no keyless Tavily. Env vars win over the .env files.
os.environ.update({"OPENAI_API_KEY": "", "TAVILY_API_KEY": "", "TAVILY_KEYLESS": "false"})
