import logging
import litellm

logger = logging.getLogger(__name__)

# Deshabilitar telemetria de LiteLLM
litellm.telemetry = False
litellm.drop_params = True


async def call_llm(
    model: str,
    messages: list[dict],
    api_key: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
    timeout: int = 120,
) -> dict:
    """
    Llama al LLM via LiteLLM y retorna la respuesta en formato OpenAI.
    """
    kwargs: dict = {
        "model": model,
        "messages": messages,
        "stream": False,
        "timeout": timeout,
    }

    if api_key:
        kwargs["api_key"] = api_key
    if temperature is not None:
        kwargs["temperature"] = temperature
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens

    logger.info(f"Llamando a LLM: model={model} messages={len(messages)}")

    response = await litellm.acompletion(**kwargs)

    # Convertir a dict serializable
    result = response.model_dump()

    logger.info(
        f"Respuesta LLM: model={model} "
        f"tokens={result.get('usage', {}).get('total_tokens', '?')}"
    )

    return result
