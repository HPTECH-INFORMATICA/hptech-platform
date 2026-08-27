from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.repositories.audit_log import AuditLogRepository
from app.repositories.lead import LeadRepository
from app.repositories.lead_history import LeadHistoryRepository
from app.schemas.lead import LeadCreate, LeadPipelineUpdate, LeadUpdate
from app.services.audit_log import sanitize_audit_metadata
from app.services.lead import LeadService


def make_lead(**overrides: object) -> SimpleNamespace:
    values: dict[str, object] = {
        "id": uuid4(),
        "company_id": uuid4(),
        "name": "João Pereira",
        "email": "joao@example.com",
        "phone": "11999990000",
        "whatsapp": None,
        "birth_date": None,
        "source": "Indicação",
        "interest": None,
        "pipeline_status": "NEW",
        "notes": None,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_create_normalizes_official_fields() -> None:
    data = LeadCreate(
        name="  João   Pereira ",
        email=" JOAO@EXAMPLE.COM ",
        phone="  11999990000  ",
        whatsapp="  ",
        source="   ",
        interest="  Avaliação  ",
        notes="  Contato inicial  ",
    )

    assert data.name == "João Pereira"
    assert str(data.email) == "joao@example.com"
    assert data.phone == "11999990000"
    assert data.whatsapp == ""
    assert data.source is None
    assert data.interest == "Avaliação"
    assert data.notes == "Contato inicial"


@pytest.mark.parametrize("name", ["", "   ", "\t\n"])
def test_create_rejects_blank_name(name: str) -> None:
    with pytest.raises(ValidationError):
        LeadCreate(name=name)


@pytest.mark.parametrize("payload", [{}, {"name": None}, {"name": "   "}])
def test_update_rejects_invalid_payload(payload: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        LeadUpdate.model_validate(payload)


@pytest.mark.parametrize(
    "field",
    ["id", "company_id", "patient_id", "deleted_at", "created_at", "updated_at"],
)
def test_create_and_update_reject_mass_assignment(field: str) -> None:
    with pytest.raises(ValidationError):
        LeadCreate.model_validate({"name": "Lead", field: str(uuid4())})
    with pytest.raises(ValidationError):
        LeadUpdate.model_validate({"notes": "Atualização", field: str(uuid4())})


def test_create_writes_history_and_sanitized_audit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = MagicMock()
    user_id = uuid4()
    lead = make_lead()
    history_create = MagicMock()
    audit_add = MagicMock()
    monkeypatch.setattr(LeadRepository, "create", lambda *_args: lead)
    monkeypatch.setattr(LeadHistoryRepository, "create", history_create)
    monkeypatch.setattr(AuditLogRepository, "add", audit_add)

    result = LeadService.create(
        db, lead.company_id, LeadCreate(name="Lead de teste"), user_id
    )

    assert result is lead
    history = history_create.call_args.args[4]
    assert history.action == "LEAD_CREATED"
    assert history.previous_value is None
    assert history.new_value is None
    assert audit_add.call_args.kwargs["details"] == {"state": "ACTIVE"}


def test_update_real_change_writes_only_field_names(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = MagicMock()
    user_id = uuid4()
    lead = make_lead()
    history_create = MagicMock()
    audit_add = MagicMock()

    def update(
        _db: object,
        selected: SimpleNamespace,
        data: LeadUpdate,
    ) -> SimpleNamespace:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(selected, field, value)
        return selected

    monkeypatch.setattr(LeadRepository, "update", update)
    monkeypatch.setattr(LeadHistoryRepository, "create", history_create)
    monkeypatch.setattr(AuditLogRepository, "add", audit_add)

    result, changed = LeadService.update(
        db,
        lead,
        LeadUpdate(name="Maria Souza", email="MARIA@EXAMPLE.COM"),
        user_id,
    )

    assert result is lead
    assert changed is True
    assert lead.name == "Maria Souza"
    assert str(lead.email) == "maria@example.com"
    history = history_create.call_args.args[4]
    assert history.action == "LEAD_UPDATED"
    assert history.description == "Campos alterados: email, name"
    assert audit_add.call_args.kwargs["details"] == {"fields": ["email", "name"]}


def test_semantic_noop_writes_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    db = MagicMock()
    lead = make_lead()
    repository_update = MagicMock()
    history_create = MagicMock()
    audit_add = MagicMock()
    monkeypatch.setattr(LeadRepository, "update", repository_update)
    monkeypatch.setattr(LeadHistoryRepository, "create", history_create)
    monkeypatch.setattr(AuditLogRepository, "add", audit_add)

    result, changed = LeadService.update(
        db, lead, LeadUpdate(name="  João   Pereira  "), uuid4()
    )

    assert result is lead
    assert changed is False
    repository_update.assert_not_called()
    history_create.assert_not_called()
    audit_add.assert_not_called()


def test_pipeline_writes_sanitized_audit(monkeypatch: pytest.MonkeyPatch) -> None:
    db = MagicMock()
    lead = make_lead()
    audit_add = MagicMock()
    monkeypatch.setattr(LeadHistoryRepository, "create", MagicMock())
    monkeypatch.setattr(AuditLogRepository, "add", audit_add)

    LeadService.update_pipeline(
        db, lead, LeadPipelineUpdate(pipeline_status="WON"), uuid4()
    )

    assert audit_add.call_args.kwargs["details"] == {"from": "NEW", "to": "WON"}


@pytest.mark.parametrize(
    ("action", "details", "expected"),
    [
        ("LEAD_CREATED", {"state": "ACTIVE", "email": "private"}, {"state": "ACTIVE"}),
        (
            "LEAD_UPDATED",
            {"fields": ["email"], "email": "private", "notes": "private"},
            {"fields": ["email"]},
        ),
        (
            "LEAD_PIPELINE_CHANGED",
            {"from": "NEW", "to": "WON", "name": "private"},
            {"from": "NEW", "to": "WON"},
        ),
    ],
)
def test_lead_audit_metadata_is_sanitized(
    action: str,
    details: dict[str, object],
    expected: dict[str, object],
) -> None:
    assert sanitize_audit_metadata(action, details) == expected
