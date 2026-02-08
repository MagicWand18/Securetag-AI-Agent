"""
Modulo de escaneo PII usando Microsoft Presidio.
Carga lazy de modelos spaCy (EN + ES) para minimizar uso de memoria.
"""
import logging
import threading
from dataclasses import dataclass, field

from src.config.settings import get_settings
from src.models.schemas import PiiAction

logger = logging.getLogger(__name__)

# --- Singleton lazy para Presidio engines ---

_lock = threading.Lock()
_analyzer = None
_anonymizer = None


def _get_engines():
    """
    Retorna (analyzer, anonymizer) con carga lazy y thread-safe.
    Los modelos spaCy se cargan solo en el primer request.
    """
    global _analyzer, _anonymizer
    if _analyzer is not None:
        return _analyzer, _anonymizer

    with _lock:
        # Double-check despues del lock
        if _analyzer is not None:
            return _analyzer, _anonymizer

        from presidio_analyzer import AnalyzerEngine
        from presidio_anonymizer import AnonymizerEngine

        logger.info("Cargando Presidio engines + spaCy models (EN + ES)...")

        from presidio_analyzer.nlp_engine import NlpEngineProvider

        nlp_config = {
            "nlp_engine_name": "spacy",
            "models": [
                {"lang_code": "es", "model_name": "es_core_news_sm"},
                {"lang_code": "en", "model_name": "en_core_web_sm"},
            ],
        }
        provider = NlpEngineProvider(nlp_configuration=nlp_config)
        nlp_engine = provider.create_engine()
        _analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en", "es"])

        _anonymizer = AnonymizerEngine()
        logger.info("Presidio engines cargados exitosamente")
        return _analyzer, _anonymizer


# --- Resultado del escaneo ---

@dataclass
class PiiScanResult:
    """Resultado del escaneo PII sobre los mensajes."""
    sanitized_messages: list[dict]
    incidents: list[dict] = field(default_factory=list)
    pii_found: bool = False


# --- Funcion principal ---

def scan_messages(
    messages: list[dict],
    pii_action: PiiAction,
    pii_entities: list[str],
    tenant_id: str,
) -> PiiScanResult:
    """
    Escanea mensajes en busca de PII usando Presidio.

    Args:
        messages: Lista de dicts con role/content
        pii_action: REDACT, BLOCK, o LOG_ONLY
        pii_entities: Entidades a detectar (e.g. PERSON, CREDIT_CARD)
        tenant_id: ID del tenant para logging

    Returns:
        PiiScanResult con mensajes sanitizados e incidentes detectados
    """
    settings = get_settings()
    threshold = settings.pii_confidence_threshold

    try:
        analyzer, anonymizer = _get_engines()
    except (Exception, SystemExit) as e:
        # Fail-open: si Presidio no carga, el request pasa sin escaneo
        # SystemExit: spaCy lo lanza si falla descarga de modelo
        logger.error(f"Error cargando Presidio engines: {e}")
        return PiiScanResult(sanitized_messages=messages)

    all_incidents: list[dict] = []
    sanitized: list[dict] = []

    for msg in messages:
        role = msg.get("role", "")
        content = msg.get("content", "")

        # Saltar mensajes system y vacios
        if role == "system" or not content:
            sanitized.append(msg.copy())
            continue

        # Analizar con ambos idiomas y fusionar
        try:
            results_en = analyzer.analyze(
                text=content,
                entities=pii_entities,
                language="en",
                score_threshold=threshold,
            )
            results_es = analyzer.analyze(
                text=content,
                entities=pii_entities,
                language="es",
                score_threshold=threshold,
            )
        except Exception as e:
            # Fail-open por mensaje individual
            logger.error(f"Error analizando PII en mensaje: {e}")
            sanitized.append(msg.copy())
            continue

        # Fusionar resultados eliminando solapamientos (mayor score gana)
        merged = _merge_results(results_en + results_es)

        if not merged:
            sanitized.append(msg.copy())
            continue

        # Registrar incidentes
        action_label = pii_action.value.rstrip("_only")  # redact, block, log
        for result in merged:
            all_incidents.append({
                "entity_type": result.entity_type,
                "score": round(result.score, 4),
                "start": result.start,
                "end": result.end,
                "action": action_label,
            })

        # Aplicar accion segun configuracion
        if pii_action == PiiAction.REDACT:
            # Reemplazar PII con <ENTITY_TYPE> usando string replacement manual
            # (evita import de OperatorConfig, mas testeable)
            new_content = _redact_text(content, merged)
            new_msg = msg.copy()
            new_msg["content"] = new_content
            sanitized.append(new_msg)
        else:
            # BLOCK y LOG_ONLY: no modifican el contenido
            sanitized.append(msg.copy())

    return PiiScanResult(
        sanitized_messages=sanitized,
        incidents=all_incidents,
        pii_found=len(all_incidents) > 0,
    )


def _redact_text(text: str, results: list) -> str:
    """
    Reemplaza las secciones detectadas con <ENTITY_TYPE>.
    Procesa de fin a inicio para mantener indices validos.
    """
    # Ordenar por posicion descendente para no invalidar indices
    sorted_desc = sorted(results, key=lambda r: r.start, reverse=True)
    redacted = text
    for r in sorted_desc:
        redacted = redacted[:r.start] + f"<{r.entity_type}>" + redacted[r.end:]
    return redacted


def _merge_results(results: list) -> list:
    """
    Fusiona resultados de multiples idiomas eliminando solapamientos.
    Cuando dos detecciones se solapan, la de mayor score gana.
    """
    if not results:
        return []

    # Ordenar por start, luego por score descendente
    sorted_results = sorted(results, key=lambda r: (r.start, -r.score))

    merged = [sorted_results[0]]
    for current in sorted_results[1:]:
        last = merged[-1]
        # Si hay solapamiento
        if current.start < last.end:
            # Mantener el de mayor score
            if current.score > last.score:
                merged[-1] = current
            # Si no, simplemente lo ignoramos
        else:
            merged.append(current)

    return merged
