import json
import os
import signal
from typing import Any


class ModelTimeoutError(TimeoutError):
    pass


class ModelClient:
    def __init__(self, model: str, timeout_seconds: float | None = None, max_output_tokens: int | None = None, reasoning_effort: str | None = None):
        if not os.getenv("OPENROUTER_API_KEY"):
            raise RuntimeError("OPENROUTER_API_KEY is required for authoring runs")
        from openai import OpenAI
        timeout = timeout_seconds or float(os.getenv("LIBREUNI_API_TIMEOUT_SECONDS", "90"))
        self.max_output_tokens = max_output_tokens or int(os.getenv("LIBREUNI_MAX_OUTPUT_TOKENS", "12000"))
        self.reasoning_effort = reasoning_effort or os.getenv("LIBREUNI_REASONING_EFFORT", "low")
        self.client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"], timeout=timeout, max_retries=0, default_headers={"X-OpenRouter-Title": "LibreUni Agent Workflows"})
        self.model = model

    def json(self, system: str, user: str, repair_invalid: bool = True) -> dict[str, Any]:
        timeout = self.client.timeout
        def request(request_system: str, request_user: str, max_tokens: int, effort: str):
            previous = signal.getsignal(signal.SIGALRM)

            def deadline(_signum, _frame):
                raise ModelTimeoutError(f"Model request exceeded {timeout} seconds for {self.model}")

            signal.signal(signal.SIGALRM, deadline)
            signal.setitimer(signal.ITIMER_REAL, timeout)
            try:
                return self.client.chat.completions.create(model=self.model, temperature=0.2, max_tokens=max_tokens, extra_body={"reasoning": {"effort": effort, "exclude": True}}, response_format={"type": "json_object"}, messages=[{"role": "system", "content": request_system}, {"role": "user", "content": request_user}])
            finally:
                signal.setitimer(signal.ITIMER_REAL, 0)
                signal.signal(signal.SIGALRM, previous)

        response = request(system, user, self.max_output_tokens, self.reasoning_effort)
        content = response.choices[0].message.content or "{}"
        try:
            return json.loads(content)
        except json.JSONDecodeError as exc:
            if not repair_invalid:
                raise RuntimeError(f"Model returned invalid JSON: {exc}") from exc
            repair_system = system + "\nYour previous response was invalid or truncated. Return compact valid JSON only. Do not include markdown fences, long quotations, or commentary."
            repair_user = user + "\nReturn at most five concise items and keep each string short."
            retry = request(repair_system, repair_user, max(self.max_output_tokens, 6000), "none")
            retry_content = retry.choices[0].message.content or "{}"
            try:
                return json.loads(retry_content)
            except json.JSONDecodeError:
                raise RuntimeError(f"Model returned invalid JSON after one repair retry: {exc}") from exc
