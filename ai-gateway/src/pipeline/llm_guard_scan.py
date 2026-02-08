"""
Modulo de escaneo LLM Guard: injection detection, secrets scanning, output scanning.
Usa heuristico custom para injection (patrones + scoring) y detect-secrets para credenciales.
Patron fail-open: si algo falla, el request pasa (se loguea el error).
"""
import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# =============================================================================
# Injection Scanner — patrones compilados a nivel de modulo (inmutables)
# =============================================================================

_INJECTION_PATTERNS: list[tuple[str, re.Pattern, float]] = []


def _compile_patterns() -> list[tuple[str, re.Pattern, float]]:
    """Compila todos los patrones de injection una sola vez."""
    raw = [
        # Instruction override
        ("instruction_override", r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts)", 0.95),
        ("instruction_override", r"disregard\s+(all\s+)?(previous|prior|above)", 0.90),
        ("instruction_override", r"forget\s+(everything|all)\s+(you|about)", 0.85),
        ("instruction_override", r"override\s+(your|the)\s+(instructions|rules|guidelines)", 0.90),
        ("instruction_override", r"new\s+(instructions|rules|guidelines):?\s", 0.80),
        # Role manipulation
        ("role_manipulation", r"you\s+are\s+now\s+(a|an|the)\s", 0.80),
        ("role_manipulation", r"pretend\s+(to\s+be|you\s+are)", 0.80),
        ("role_manipulation", r"act\s+as\s+(if|a|an|the)\s", 0.70),
        ("role_manipulation", r"switch\s+to\s+.{0,20}\s+mode", 0.75),
        # Prompt leaking
        ("prompt_leaking", r"(reveal|show|display|print)\s+(your|the)\s+system\s+prompt", 0.95),
        ("prompt_leaking", r"what\s+(are|is)\s+your\s+(instructions|rules|system\s+prompt)", 0.85),
        ("prompt_leaking", r"repeat\s+(your|the)\s+(initial|original|first)\s+(prompt|instructions)", 0.90),
        # Jailbreak
        ("jailbreak", r"DAN\s+mode", 0.95),
        ("jailbreak", r"do\s+anything\s+now", 0.90),
        ("jailbreak", r"jailbreak", 0.85),
        ("jailbreak", r"developer\s+mode", 0.75),
        # Evasion
        ("evasion", r"base64\s+decode", 0.70),
        ("evasion", r"execute\s+(this|the\s+following)\s+(code|command)", 0.75),
        ("evasion", r"\\x[0-9a-fA-F]{2}", 0.65),
        # Delimiter injection
        ("delimiter", r"={3,}\s*system", 0.80),
        ("delimiter", r"<\|system\|>", 0.90),
        ("delimiter", r"\[INST\]", 0.85),
    ]
    compiled = []
    for name, pattern, weight in raw:
        compiled.append((name, re.compile(pattern, re.IGNORECASE), weight))
    return compiled


# Compilar al importar el modulo (una sola vez)
_INJECTION_PATTERNS = _compile_patterns()


# --- Patrones custom de secrets (complementan detect-secrets) ---

_SECRET_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("bearer_token", re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE)),
    ("openai_api_key", re.compile(r"sk-[A-Za-z0-9\-_]{20,}")),
    ("slack_bot_token", re.compile(r"xoxb-[0-9]{10,}")),
]


# =============================================================================
# Dataclasses de resultado
# =============================================================================

@dataclass
class InjectionScanResult:
    """Resultado del escaneo de injection."""
    score: float = 0.0
    is_blocked: bool = False
    matched_patterns: list[str] = field(default_factory=list)


@dataclass
class SecretsScanResult:
    """Resultado del escaneo de secrets."""
    secrets_found: bool = False
    secrets: list[dict] = field(default_factory=list)


@dataclass
class InputScanResult:
    """Resultado combinado del escaneo de input (injection + secrets)."""
    blocked: bool = False
    block_reason: str | None = None
    injection_score: float | None = None
    injection_patterns: list[str] = field(default_factory=list)
    secrets: list[dict] = field(default_factory=list)


@dataclass
class OutputScanResult:
    """Resultado del escaneo de output del LLM."""
    sanitized_text: str = ""
    was_modified: bool = False
    pii_incidents: list[dict] = field(default_factory=list)
    secrets_incidents: list[dict] = field(default_factory=list)


# =============================================================================
# Funciones de escaneo
# =============================================================================

def scan_injection(text: str, threshold: float = 0.8) -> InjectionScanResult:
    """
    Escanea texto en busca de patrones de prompt injection.
    Score final = max(matched_scores) + 0.1 * (num_matches - 1), capped at 1.0.
    """
    try:
        matched_scores: list[float] = []
        matched_names: list[str] = []

        for name, pattern, weight in _INJECTION_PATTERNS:
            if pattern.search(text):
                matched_scores.append(weight)
                matched_names.append(name)

        if not matched_scores:
            return InjectionScanResult(score=0.0, is_blocked=False, matched_patterns=[])

        score = max(matched_scores) + 0.1 * (len(matched_scores) - 1)
        score = min(score, 1.0)

        return InjectionScanResult(
            score=round(score, 4),
            is_blocked=score >= threshold,
            matched_patterns=matched_names,
        )
    except Exception as e:
        logger.error(f"Error en injection scan: {e}")
        return InjectionScanResult(score=0.0, is_blocked=False, matched_patterns=[])


def scan_secrets(text: str) -> SecretsScanResult:
    """
    Escanea texto en busca de secrets/credenciales usando detect-secrets + patrones custom.
    detect-secrets se importa lazy para no impactar startup.
    """
    try:
        found: list[dict] = []

        # 1. detect-secrets (lazy import, plugins especificos para evitar falsos positivos)
        try:
            from detect_secrets.core.scan import scan_line
            from detect_secrets.settings import transient_settings

            _ds_settings = {
                "plugins_used": [
                    {"name": "AWSKeyDetector"},
                    {"name": "PrivateKeyDetector"},
                    {"name": "GitHubTokenDetector"},
                    {"name": "SlackDetector"},
                    {"name": "StripeDetector"},
                    {"name": "BasicAuthDetector"},
                ]
            }

            with transient_settings(_ds_settings):
                for line_num, line in enumerate(text.splitlines(), 1):
                    secrets = scan_line(line)
                    for secret in secrets:
                        found.append({
                            "type": secret.type,
                            "line_number": line_num,
                        })
        except ImportError:
            logger.warning("detect-secrets no disponible, usando solo patrones custom")
        except Exception as e:
            logger.warning(f"Error en detect-secrets: {e}")

        # 2. Patrones custom (complementarios)
        for secret_type, pattern in _SECRET_PATTERNS:
            if pattern.search(text):
                # Evitar duplicados si detect-secrets ya lo detecto
                type_already_found = any(
                    s["type"].lower().replace(" ", "_") == secret_type or
                    secret_type in s["type"].lower()
                    for s in found
                )
                if not type_already_found:
                    found.append({"type": secret_type, "line_number": 0})

        return SecretsScanResult(
            secrets_found=len(found) > 0,
            secrets=found,
        )
    except Exception as e:
        logger.error(f"Error en secrets scan: {e}")
        return SecretsScanResult(secrets_found=False, secrets=[])


def scan_input(
    messages: list[dict],
    injection_enabled: bool = True,
    secrets_enabled: bool = True,
    injection_threshold: float = 0.8,
) -> InputScanResult:
    """
    Escanea input combinando injection y secrets scanners.
    Concatena contenido de mensajes (excluyendo role=system).
    """
    try:
        # Concatenar contenido de mensajes no-system
        parts = []
        for msg in messages:
            if msg.get("role") != "system" and msg.get("content"):
                parts.append(msg["content"])
        text = "\n".join(parts)

        if not text:
            return InputScanResult()

        # Injection scan
        injection_result = None
        if injection_enabled:
            injection_result = scan_injection(text, threshold=injection_threshold)
            if injection_result.is_blocked:
                return InputScanResult(
                    blocked=True,
                    block_reason="injection",
                    injection_score=injection_result.score,
                    injection_patterns=injection_result.matched_patterns,
                )

        # Secrets scan
        secrets_result = None
        if secrets_enabled:
            secrets_result = scan_secrets(text)
            if secrets_result.secrets_found:
                return InputScanResult(
                    blocked=True,
                    block_reason="secrets",
                    injection_score=injection_result.score if injection_result else None,
                    injection_patterns=injection_result.matched_patterns if injection_result else [],
                    secrets=secrets_result.secrets,
                )

        # Nada bloqueado
        return InputScanResult(
            blocked=False,
            injection_score=injection_result.score if injection_result else None,
            injection_patterns=injection_result.matched_patterns if injection_result else [],
        )
    except Exception as e:
        logger.error(f"Error en input scan: {e}")
        return InputScanResult()


def scan_output(
    text: str,
    pii_entities: list[str],
    secrets_enabled: bool = True,
    tenant_id: str = "",
) -> OutputScanResult:
    """
    Escanea output del LLM en busca de PII y secrets.
    Reutiliza Presidio para PII y scan_secrets para credenciales.
    """
    try:
        if not text:
            return OutputScanResult(sanitized_text=text)

        sanitized = text
        was_modified = False
        pii_incidents: list[dict] = []
        secrets_incidents: list[dict] = []

        # 1. PII scan reutilizando Presidio
        try:
            from src.pipeline.presidio_scan import scan_messages
            from src.models.schemas import PiiAction

            pii_result = scan_messages(
                messages=[{"role": "assistant", "content": sanitized}],
                pii_action=PiiAction.REDACT,
                pii_entities=pii_entities,
                tenant_id=tenant_id,
            )
            if pii_result.pii_found:
                sanitized = pii_result.sanitized_messages[0]["content"]
                was_modified = True
                pii_incidents = pii_result.incidents
        except Exception as e:
            logger.warning(f"Error en PII output scan: {e}")

        # 2. Secrets scan
        if secrets_enabled:
            secrets_result = scan_secrets(sanitized)
            if secrets_result.secrets_found:
                # Redactar secrets encontrados en el texto
                sanitized = _redact_secrets(sanitized)
                was_modified = True
                secrets_incidents = [
                    {"type": s["type"], "action": "redacted"} for s in secrets_result.secrets
                ]

        return OutputScanResult(
            sanitized_text=sanitized,
            was_modified=was_modified,
            pii_incidents=pii_incidents,
            secrets_incidents=secrets_incidents,
        )
    except Exception as e:
        logger.error(f"Error en output scan: {e}")
        return OutputScanResult(sanitized_text=text)


def _redact_secrets(text: str) -> str:
    """Reemplaza secrets conocidos con <SECRET_DETECTED>."""
    result = text
    # Patrones custom
    for _, pattern in _SECRET_PATTERNS:
        result = pattern.sub("<SECRET_DETECTED>", result)
    # Patrones comunes adicionales
    # AWS Access Key
    result = re.sub(r"AKIA[0-9A-Z]{16}", "<SECRET_DETECTED>", result)
    # GitHub tokens
    result = re.sub(r"gh[pso]_[A-Za-z0-9_]{36,}", "<SECRET_DETECTED>", result)
    result = re.sub(r"github_pat_[A-Za-z0-9_]{20,}", "<SECRET_DETECTED>", result)
    # Private keys
    result = re.sub(
        r"-----BEGIN\s+(RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY-----",
        "<SECRET_DETECTED>",
        result,
    )
    return result
