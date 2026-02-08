"""Tests para el modulo de escaneo PII con Presidio."""
import pytest
from unittest.mock import patch, MagicMock
from dataclasses import dataclass

from src.models.schemas import PiiAction
import src.pipeline.presidio_scan as presidio_mod


# --- Mock de resultados de Presidio ---

@dataclass
class FakeRecognizerResult:
    """Simula presidio_analyzer RecognizerResult."""
    entity_type: str
    start: int
    end: int
    score: float


@dataclass
class FakeAnonymizerResult:
    """Simula presidio_anonymizer AnonymizerResult."""
    text: str


# --- Fixtures ---

@pytest.fixture(autouse=True)
def reset_engines():
    """Resetea los singletons de Presidio entre tests."""
    presidio_mod._analyzer = None
    presidio_mod._anonymizer = None
    yield
    presidio_mod._analyzer = None
    presidio_mod._anonymizer = None


def _setup_mocks(analyzer_side_effect, anonymizer_text=None):
    """
    Configura mocks de analyzer y anonymizer directamente en el modulo.
    Setea _analyzer y _anonymizer para evitar que _get_engines intente importar presidio.
    """
    mock_analyzer = MagicMock()
    mock_analyzer.analyze.side_effect = analyzer_side_effect

    mock_anonymizer = MagicMock()
    if anonymizer_text is not None:
        mock_anonymizer.anonymize.return_value = FakeAnonymizerResult(text=anonymizer_text)

    # Setear directamente en el modulo para que _get_engines retorne inmediatamente
    presidio_mod._analyzer = mock_analyzer
    presidio_mod._anonymizer = mock_anonymizer

    return mock_analyzer, mock_anonymizer


# =============================================================================
# Tests de deteccion
# =============================================================================

class TestDetectPersonEN:
    """Deteccion de PERSON en ingles."""

    def test_detects_person_english(self):
        """Detecta nombre en ingles y lo redacta."""
        def analyze_fn(text, entities, language, score_threshold):
            if language == "en":
                return [FakeRecognizerResult("PERSON", 13, 23, 0.85)]
            return []

        _, mock_anon = _setup_mocks(analyze_fn, "The customer <PERSON> has a bug")

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "The customer John Smith has a bug"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert len(result.incidents) == 1
        assert result.incidents[0]["entity_type"] == "PERSON"
        assert result.sanitized_messages[0]["content"] == "The customer <PERSON> has a bug"


class TestDetectPersonES:
    """Deteccion de PERSON en español."""

    def test_detects_person_spanish(self):
        """Detecta nombre en español y lo redacta."""
        # "El cliente Juan Perez tiene un bug"
        #             ^11       ^21
        def analyze_fn(text, entities, language, score_threshold):
            if language == "es":
                return [FakeRecognizerResult("PERSON", 11, 21, 0.80)]
            return []

        _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "El cliente Juan Perez tiene un bug"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert result.incidents[0]["entity_type"] == "PERSON"
        assert result.sanitized_messages[0]["content"] == "El cliente <PERSON> tiene un bug"


class TestDetectCreditCard:
    """Deteccion de tarjetas de credito (parametrizado)."""

    @pytest.mark.parametrize("card_number,card_name", [
        ("4111111111111111", "Visa"),
        ("5500000000000004", "Mastercard"),
        ("340000000000009", "Amex"),
    ])
    def test_detects_credit_card(self, card_number, card_name):
        """Detecta tarjeta {card_name}."""
        text = f"My card is {card_number}"

        def analyze_fn(text, entities, language, score_threshold):
            if language == "en":
                return [FakeRecognizerResult("CREDIT_CARD", 11, 11 + len(card_number), 0.99)]
            return []

        _setup_mocks(analyze_fn, "My card is <CREDIT_CARD>")

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": text}],
            pii_action=PiiAction.REDACT,
            pii_entities=["CREDIT_CARD"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert result.incidents[0]["entity_type"] == "CREDIT_CARD"
        assert result.incidents[0]["score"] == 0.99


class TestDetectOtherEntities:
    """Deteccion de EMAIL, PHONE, SSN, IP."""

    @pytest.mark.parametrize("entity_type,text,start,end,score", [
        ("EMAIL_ADDRESS", "Contact me at test@email.com please", 14, 28, 0.95),
        ("PHONE_NUMBER", "Call me at 555-123-4567", 11, 23, 0.75),
        ("PHONE_NUMBER", "Llamar al +52 55 1234 5678", 10, 26, 0.70),
        ("US_SSN", "SSN is 123-45-6789", 7, 18, 0.90),
        ("IP_ADDRESS", "Server at 192.168.1.1 is down", 10, 21, 0.80),
    ])
    def test_detects_entity(self, entity_type, text, start, end, score):
        """Detecta {entity_type} correctamente."""
        _start, _end, _score = start, end, score
        _entity = entity_type

        def analyze_fn(text, entities, language, score_threshold):
            if language == "en":
                return [FakeRecognizerResult(_entity, _start, _end, _score)]
            return []

        _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": text}],
            pii_action=PiiAction.REDACT,
            pii_entities=[entity_type],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert result.incidents[0]["entity_type"] == entity_type
        assert result.incidents[0]["score"] == score


# =============================================================================
# Tests de modos PII
# =============================================================================

class TestPiiModes:
    """Tests de los tres modos: redact, block, log_only."""

    def _make_analyzer_with_person(self):
        """Helper que siempre detecta PERSON en 'John Doe' (0-8)."""
        def analyze_fn(text, entities, language, score_threshold):
            if language == "en":
                return [FakeRecognizerResult("PERSON", 0, 8, 0.85)]
            return []
        return analyze_fn

    def test_redact_replaces_content(self):
        """Modo redact reemplaza el contenido con <ENTITY_TYPE>."""
        _, mock_anon = _setup_mocks(
            self._make_analyzer_with_person(),
            "<PERSON> said hello"
        )

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "John Doe said hello"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert result.sanitized_messages[0]["content"] == "<PERSON> said hello"
        assert result.incidents[0]["action"] == "redacted"

    def test_block_does_not_modify_content(self):
        """Modo block NO modifica el contenido (se bloquea en orchestrator)."""
        _setup_mocks(self._make_analyzer_with_person())

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "John Doe said hello"}],
            pii_action=PiiAction.BLOCK,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert result.sanitized_messages[0]["content"] == "John Doe said hello"
        assert result.incidents[0]["action"] == "blocked"

    def test_log_only_does_not_modify_content(self):
        """Modo log_only NO modifica el contenido."""
        _setup_mocks(self._make_analyzer_with_person())

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "John Doe said hello"}],
            pii_action=PiiAction.LOG_ONLY,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert result.sanitized_messages[0]["content"] == "John Doe said hello"
        assert result.incidents[0]["action"] == "logged"

    def test_incident_labels_match_action(self):
        """Los labels de accion coinciden con el modo configurado (DB constraint)."""
        for action, expected_label in [
            (PiiAction.REDACT, "redacted"),
            (PiiAction.BLOCK, "blocked"),
            (PiiAction.LOG_ONLY, "logged"),
        ]:
            _setup_mocks(
                self._make_analyzer_with_person(),
                "<PERSON> said hello"
            )
            result = presidio_mod.scan_messages(
                messages=[{"role": "user", "content": "John Doe said hello"}],
                pii_action=action,
                pii_entities=["PERSON"],
                tenant_id="t1",
            )
            assert result.incidents[0]["action"] == expected_label


# =============================================================================
# Tests de edge cases
# =============================================================================

class TestPiiEdgeCases:
    """Casos borde del escaneo PII."""

    def test_no_pii_detected(self):
        """Sin PII, los mensajes pasan sin cambios."""
        def analyze_fn(text, entities, language, score_threshold):
            return []

        _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "Hello world"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is False
        assert len(result.incidents) == 0
        assert result.sanitized_messages[0]["content"] == "Hello world"

    def test_system_message_skipped(self):
        """Mensajes con role=system se saltan."""
        def analyze_fn(text, entities, language, score_threshold):
            return [FakeRecognizerResult("PERSON", 0, 4, 0.9)]

        mock_az, _ = _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[{"role": "system", "content": "You are John the assistant"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is False
        assert result.sanitized_messages[0]["content"] == "You are John the assistant"
        mock_az.analyze.assert_not_called()

    def test_empty_content_skipped(self):
        """Mensajes con content vacio se saltan."""
        def analyze_fn(text, entities, language, score_threshold):
            return [FakeRecognizerResult("PERSON", 0, 4, 0.9)]

        mock_az, _ = _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": ""}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is False
        mock_az.analyze.assert_not_called()

    def test_multiple_messages(self):
        """Multiples mensajes se escanean independientemente."""
        def analyze_fn(text, entities, language, score_threshold):
            if language == "en" and "John" in text:
                idx = text.index("John")
                return [FakeRecognizerResult("PERSON", idx, idx + 4, 0.85)]
            return []

        _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[
                {"role": "user", "content": "John found"},
                {"role": "assistant", "content": "No PII here"},
                {"role": "user", "content": "Another John message"},
            ],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert len(result.incidents) == 2  # Dos mensajes con PII

    def test_entity_subset_filter(self):
        """Solo se detectan las entidades configuradas."""
        def analyze_fn(text, entities, language, score_threshold):
            results = []
            if "PERSON" in entities and language == "en":
                results.append(FakeRecognizerResult("PERSON", 0, 4, 0.85))
            if "EMAIL_ADDRESS" in entities and language == "en":
                results.append(FakeRecognizerResult("EMAIL_ADDRESS", 5, 20, 0.95))
            return results

        _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "John test@email.com"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],  # Solo PERSON
            tenant_id="t1",
        )

        assert result.pii_found is True
        entity_types = [i["entity_type"] for i in result.incidents]
        assert "PERSON" in entity_types
        assert "EMAIL_ADDRESS" not in entity_types

    def test_presidio_engine_error_failopen(self):
        """Si _get_engines falla, el request pasa sin escaneo (fail-open)."""
        # Resetear a None para forzar que _get_engines intente cargar
        presidio_mod._analyzer = None
        presidio_mod._anonymizer = None

        with patch.object(presidio_mod, "_get_engines", side_effect=RuntimeError("spacy not found")):
            result = presidio_mod.scan_messages(
                messages=[{"role": "user", "content": "John Smith secret data"}],
                pii_action=PiiAction.REDACT,
                pii_entities=["PERSON"],
                tenant_id="t1",
            )

        assert result.pii_found is False
        assert result.sanitized_messages[0]["content"] == "John Smith secret data"

    def test_analyzer_error_failopen_per_message(self):
        """Si analyzer falla en un mensaje, ese mensaje pasa sin escaneo."""
        def analyze_fn(text, entities, language, score_threshold):
            raise RuntimeError("NLP engine error")

        _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "John Smith secret data"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is False
        assert result.sanitized_messages[0]["content"] == "John Smith secret data"


# =============================================================================
# Tests de telefonos MX/US (custom recognizer)
# =============================================================================

class TestPhoneDetection:
    """Tests para deteccion de telefonos MX y US con custom recognizer."""

    @pytest.mark.parametrize("text,start,end,label", [
        # MX formato internacional
        ("Llamar al +52 55 1234 5678 por favor", 10, 27, "MX +52"),
        # MX formato local con area code comun
        ("Tel: 55 1234 5678 oficina", 5, 17, "MX local 55"),
        # MX Guadalajara
        ("Contacto: 33 9876 5432", 10, 22, "MX local 33"),
        # MX Monterrey
        ("Su numero es 81 5555 4444 y esta activo", 13, 25, "MX local 81"),
        # US formato 3-3-4 con guiones
        ("Call me at 555-123-4567 please", 11, 23, "US dash"),
        # US formato internacional
        ("Phone: +1-555-867-5309", 7, 22, "US intl"),
        # Parentesis
        ("Tel: (55) 1234-5678 para citas", 5, 19, "Parens"),
    ])
    def test_detects_phone(self, text, start, end, label):
        """Detecta telefono: {label}."""
        _start, _end = start, end

        def analyze_fn(text, entities, language, score_threshold):
            if "PHONE_NUMBER" in entities:
                return [FakeRecognizerResult("PHONE_NUMBER", _start, _end, 0.65)]
            return []

        _setup_mocks(analyze_fn)

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": text}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PHONE_NUMBER"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert result.incidents[0]["entity_type"] == "PHONE_NUMBER"
        assert "<PHONE_NUMBER>" in result.sanitized_messages[0]["content"]


# =============================================================================
# Tests de merge de resultados
# =============================================================================

class TestMergeResults:
    """Tests para la fusion de resultados EN + ES."""

    def test_overlapping_results_higher_score_wins(self):
        """Cuando EN y ES detectan lo mismo, el de mayor score gana."""
        def analyze_fn(text, entities, language, score_threshold):
            if language == "en":
                return [FakeRecognizerResult("PERSON", 0, 10, 0.70)]
            elif language == "es":
                return [FakeRecognizerResult("PERSON", 0, 10, 0.90)]
            return []

        _setup_mocks(analyze_fn, "<PERSON> has a bug")

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "Juan Perez has a bug"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert len(result.incidents) == 1
        assert result.incidents[0]["score"] == 0.90  # ES gano

    def test_non_overlapping_results_both_kept(self):
        """Detecciones que no se solapan se mantienen ambas."""
        def analyze_fn(text, entities, language, score_threshold):
            if language == "en":
                return [FakeRecognizerResult("PERSON", 0, 4, 0.85)]
            elif language == "es":
                return [FakeRecognizerResult("EMAIL_ADDRESS", 20, 35, 0.95)]
            return []

        _setup_mocks(analyze_fn, "<PERSON> contact at <EMAIL_ADDRESS>")

        result = presidio_mod.scan_messages(
            messages=[{"role": "user", "content": "John contact at test@email.com"}],
            pii_action=PiiAction.REDACT,
            pii_entities=["PERSON", "EMAIL_ADDRESS"],
            tenant_id="t1",
        )

        assert result.pii_found is True
        assert len(result.incidents) == 2


# =============================================================================
# Tests para fire_and_forget_log_with_pii
# =============================================================================

class TestFireAndForgetLogWithPii:
    """Tests para la funcion de log encadenado con PII."""

    @pytest.mark.asyncio
    @patch("src.services.audit_logger.log_pii_incidents")
    @patch("src.services.audit_logger.log_request")
    async def test_chains_log_and_pii(self, mock_log_request, mock_log_pii):
        """Log request seguido de PII incidents con log_id real."""
        from src.services.audit_logger import _safe_log_with_pii
        from src.models.schemas import GatewayLogEntry, LogStatus, PiiIncident

        mock_log_request.return_value = "real-log-uuid-456"
        mock_log_pii.return_value = None

        entry = GatewayLogEntry(
            tenant_id="t1",
            request_model="gpt-4o",
            request_provider="openai",
            credits_charged=0.1,
            status=LogStatus.SUCCESS,
        )
        incidents = [
            PiiIncident(
                log_id="pending",
                tenant_id="t1",
                entity_type="PERSON",
                action_taken="redacted",
                confidence=0.85,
            )
        ]

        await _safe_log_with_pii(entry, incidents)

        mock_log_request.assert_called_once_with(entry)
        mock_log_pii.assert_called_once()
        # Verificar que el log_id se actualizo al real
        saved_incidents = mock_log_pii.call_args[0][0]
        assert saved_incidents[0].log_id == "real-log-uuid-456"

    @pytest.mark.asyncio
    @patch("src.services.audit_logger.log_pii_incidents")
    @patch("src.services.audit_logger.log_request")
    async def test_no_pii_when_log_fails(self, mock_log_request, mock_log_pii):
        """Si log_request retorna None, no se insertan PII incidents."""
        from src.services.audit_logger import _safe_log_with_pii
        from src.models.schemas import GatewayLogEntry, LogStatus, PiiIncident

        mock_log_request.return_value = None

        entry = GatewayLogEntry(
            tenant_id="t1",
            request_model="gpt-4o",
            request_provider="openai",
            credits_charged=0.1,
            status=LogStatus.SUCCESS,
        )
        incidents = [
            PiiIncident(
                log_id="pending",
                tenant_id="t1",
                entity_type="PERSON",
                action_taken="redacted",
                confidence=0.85,
            )
        ]

        await _safe_log_with_pii(entry, incidents)

        mock_log_request.assert_called_once()
        mock_log_pii.assert_not_called()


# =============================================================================
# Tests de logging PII en paths BLOCK y ERROR
# =============================================================================

class TestPiiLoggingInBlockAndError:
    """Verifica que _log_blocked y _log_error incluyen PII data."""

    @patch("src.pipeline.orchestrator.fire_and_forget_log_with_pii")
    @patch("src.pipeline.orchestrator.fire_and_forget_log")
    def test_log_blocked_with_pii_uses_pii_logger(self, mock_log, mock_log_pii):
        """_log_blocked con PII incidents usa fire_and_forget_log_with_pii."""
        from src.pipeline.orchestrator import _log_blocked
        from src.models.schemas import (
            AuthContext, ProxyRequest, ChatMessage,
            LogStatus, PiiIncident,
        )

        auth = AuthContext(
            tenant_id="t1", api_key_id="k1",
            key_hash="abc", ai_gateway_enabled=True,
        )
        request = ProxyRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="test")],
        )
        pii_incidents = [
            PiiIncident(
                log_id="pending", tenant_id="t1",
                entity_type="PERSON", action_taken="block", confidence=0.85,
            )
        ]
        pii_detected = [{"entity_type": "PERSON", "score": 0.85}]

        _log_blocked(
            auth, request, LogStatus.BLOCKED_PII, 0.0,
            pii_incidents=pii_incidents, pii_detected=pii_detected,
        )

        mock_log_pii.assert_called_once()
        mock_log.assert_not_called()
        # Verificar que el entry tiene pii_detected
        entry = mock_log_pii.call_args[0][0]
        assert entry.pii_detected == pii_detected
        assert entry.status == LogStatus.BLOCKED_PII

    @patch("src.pipeline.orchestrator.fire_and_forget_log_with_pii")
    @patch("src.pipeline.orchestrator.fire_and_forget_log")
    def test_log_blocked_without_pii_uses_normal_logger(self, mock_log, mock_log_pii):
        """_log_blocked sin PII usa fire_and_forget_log normal."""
        from src.pipeline.orchestrator import _log_blocked
        from src.models.schemas import (
            AuthContext, ProxyRequest, ChatMessage, LogStatus,
        )

        auth = AuthContext(
            tenant_id="t1", api_key_id="k1",
            key_hash="abc", ai_gateway_enabled=True,
        )
        request = ProxyRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="test")],
        )

        _log_blocked(auth, request, LogStatus.BLOCKED_CREDITS, 0.0)

        mock_log.assert_called_once()
        mock_log_pii.assert_not_called()

    @patch("src.pipeline.orchestrator.fire_and_forget_log_with_pii")
    @patch("src.pipeline.orchestrator.fire_and_forget_log")
    def test_log_error_with_pii_uses_pii_logger(self, mock_log, mock_log_pii):
        """_log_error con PII incidents usa fire_and_forget_log_with_pii."""
        from src.pipeline.orchestrator import _log_error
        from src.models.schemas import (
            AuthContext, ProxyRequest, ChatMessage,
            LogStatus, PiiIncident,
        )

        auth = AuthContext(
            tenant_id="t1", api_key_id="k1",
            key_hash="abc", ai_gateway_enabled=True,
        )
        request = ProxyRequest(
            model="gpt-4o",
            messages=[ChatMessage(role="user", content="test")],
        )
        pii_incidents = [
            PiiIncident(
                log_id="pending", tenant_id="t1",
                entity_type="CREDIT_CARD", action_taken="redact", confidence=1.0,
            )
        ]
        pii_detected = [{"entity_type": "CREDIT_CARD", "score": 1.0}]

        _log_error(
            auth, request, 0.0, "LLM auth error",
            pii_incidents=pii_incidents, pii_detected=pii_detected,
        )

        mock_log_pii.assert_called_once()
        mock_log.assert_not_called()
        entry = mock_log_pii.call_args[0][0]
        assert entry.pii_detected == pii_detected
        assert entry.status == LogStatus.ERROR
