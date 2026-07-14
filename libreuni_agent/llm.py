import json
import os
from typing import Any


class ModelClient:
    def __init__(self, model: str):
        if not os.getenv("OPENROUTER_API_KEY"):
            raise RuntimeError("OPENROUTER_API_KEY is required for authoring runs")
        from openai import OpenAI
        self.client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"], default_headers={"X-OpenRouter-Title": "LibreUni Agent Workflows"})
        self.model = model

    def json(self, system: str, user: str) -> dict[str, Any]:
        response = self.client.chat.completions.create(model=self.model, temperature=0.2, response_format={"type": "json_object"}, messages=[{"role": "system", "content": system}, {"role": "user", "content": user}])
        content = response.choices[0].message.content or "{}"
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Model returned invalid JSON: {exc}") from exc

