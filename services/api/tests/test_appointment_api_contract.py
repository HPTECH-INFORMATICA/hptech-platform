from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.core.identity import PermissionAction, PermissionModule, UserRole
from app.core.rbac import has_permission, permissions_for_role
from app.main import app
from app.repositories.appointment import AppointmentRepository
from app.repositories.professional import ProfessionalRepository
from app.services.appointment import AppointmentDomain, AppointmentNotFoundError


def test_openapi_exposes_only_the_frozen_semantic_contract() -> None:
    paths = {path for path in app.openapi()["paths"] if "/appointments" in path}

    assert paths == {
        "/api/v1/appointments",
        "/api/v1/appointments/{appointment_id}",
        "/api/v1/appointments/{appointment_id}/reschedule",
        "/api/v1/appointments/{appointment_id}/confirm",
        "/api/v1/appointments/{appointment_id}/start",
        "/api/v1/appointments/{appointment_id}/complete",
        "/api/v1/appointments/{appointment_id}/cancel",
        "/api/v1/appointments/{appointment_id}/no-show",
    }
    assert "delete" not in app.openapi()["paths"]["/api/v1/appointments/{appointment_id}"]


@pytest.mark.parametrize(
    ("role", "actions"),
    [
        (UserRole.OWNER, {"VIEW", "CREATE", "UPDATE"}),
        (UserRole.ADMIN, {"VIEW", "CREATE", "UPDATE"}),
        (UserRole.MANAGER, {"VIEW", "CREATE", "UPDATE"}),
        (UserRole.RECEPTIONIST, {"VIEW", "CREATE", "UPDATE"}),
        (UserRole.PROFESSIONAL, {"VIEW", "UPDATE"}),
        (UserRole.SALES, {"VIEW", "CREATE"}),
        (UserRole.FINANCIAL, set()),
        (UserRole.VIEWER, {"VIEW"}),
    ],
)
def test_rbac_matrix_matches_architecture(role: UserRole, actions: set[str]) -> None:
    permissions = permissions_for_role(role)

    assert {
        action.value
        for action in PermissionAction
        if has_permission(permissions, PermissionModule.APPOINTMENTS, action)
    } == actions


def professional_identity() -> SimpleNamespace:
    return SimpleNamespace(
        company=SimpleNamespace(id=uuid4()),
        user=SimpleNamespace(id=uuid4()),
        role=UserRole.PROFESSIONAL,
    )


def test_professional_list_is_forced_to_own_scope(monkeypatch) -> None:
    identity = professional_identity()
    own_id = uuid4()
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_user_id",
        MagicMock(
            return_value=SimpleNamespace(
                id=own_id,
                is_active=True,
                deleted_at=None,
            )
        ),
    )
    listing = MagicMock(return_value=([], 0))
    monkeypatch.setattr(AppointmentRepository, "list_by_company", listing)

    AppointmentDomain.list(
        MagicMock(),
        identity,
        window_start=MagicMock(),
        window_end=MagicMock(),
        professional_id=uuid4(),
        patient_id=None,
        service_id=None,
        status=None,
        page=1,
        page_size=50,
    )

    assert listing.call_args.kwargs["professional_id"] == own_id


def test_professional_without_valid_link_has_no_global_fallback(monkeypatch) -> None:
    monkeypatch.setattr(
        ProfessionalRepository,
        "get_by_user_id",
        MagicMock(return_value=None),
    )

    with pytest.raises(AppointmentNotFoundError):
        AppointmentDomain.list(
            MagicMock(),
            professional_identity(),
            window_start=MagicMock(),
            window_end=MagicMock(),
            professional_id=None,
            patient_id=None,
            service_id=None,
            status=None,
            page=1,
            page_size=50,
        )
