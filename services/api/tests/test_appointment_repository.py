from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock
from uuid import uuid4

from sqlalchemy.dialects import postgresql

from app.models.appointment import Appointment
from app.repositories.appointment import AppointmentRepository
from app.schemas.appointment import AppointmentStatus


def compiled(statement: object) -> str:
    return str(
        statement.compile(
            dialect=postgresql.dialect(),
            compile_kwargs={"literal_binds": True},
        )
    )


def execute_statement(db: MagicMock) -> object:
    return db.execute.call_args.args[0]


def test_get_by_id_is_tenant_scoped_and_excludes_soft_deleted() -> None:
    db = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = None
    company_id = uuid4()
    appointment_id = uuid4()

    AppointmentRepository.get_by_id(
        db,
        company_id,
        appointment_id,
        for_update=True,
    )
    sql = compiled(execute_statement(db))

    assert f"appointments.company_id = '{company_id}'" in sql
    assert f"appointments.id = '{appointment_id}'" in sql
    assert "appointments.deleted_at IS NULL" in sql
    assert "FOR UPDATE" in sql


def test_list_uses_half_open_intersection_and_official_filters() -> None:
    db = MagicMock()
    db.scalar.return_value = 1
    db.execute.return_value.scalars.return_value.all.return_value = []
    company_id = uuid4()
    professional_id = uuid4()
    patient_id = uuid4()
    service_id = uuid4()
    start = datetime(2026, 9, 14, 12, tzinfo=UTC)
    end = start + timedelta(days=7)

    items, total = AppointmentRepository.list_by_company(
        db,
        company_id,
        window_start=start,
        window_end=end,
        professional_id=professional_id,
        patient_id=patient_id,
        service_id=service_id,
        status=AppointmentStatus.CONFIRMED,
        page=2,
        page_size=20,
    )
    count_sql = compiled(db.scalar.call_args.args[0])
    list_sql = compiled(execute_statement(db))

    assert items == []
    assert total == 1
    for sql in (count_sql, list_sql):
        assert f"appointments.company_id = '{company_id}'" in sql
        assert "appointments.deleted_at IS NULL" in sql
        assert f"appointments.clinical_professional_id = '{professional_id}'" in sql
        assert f"appointments.patient_id = '{patient_id}'" in sql
        assert f"appointments.service_id = '{service_id}'" in sql
        assert "appointments.status = 'CONFIRMED'" in sql
        assert "appointments.starts_at <" in sql
        assert "appointments.ends_at >" in sql
    assert "ORDER BY appointments.starts_at ASC, appointments.id ASC" in list_sql
    assert "LIMIT 20 OFFSET 20" in list_sql


def test_overlap_is_tenant_and_professional_scoped_with_adjacency() -> None:
    db = MagicMock()
    db.execute.return_value.scalar_one_or_none.return_value = None
    company_id = uuid4()
    professional_id = uuid4()
    excluded_id = uuid4()
    starts_at = datetime(2026, 9, 14, 12, tzinfo=UTC)
    ends_at = starts_at + timedelta(hours=1)

    AppointmentRepository.find_overlap(
        db,
        company_id,
        professional_id,
        starts_at=starts_at,
        ends_at=ends_at,
        exclude_appointment_id=excluded_id,
    )
    sql = compiled(execute_statement(db))

    assert f"appointments.company_id = '{company_id}'" in sql
    assert f"appointments.clinical_professional_id = '{professional_id}'" in sql
    assert "appointments.deleted_at IS NULL" in sql
    assert "appointments.status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')" in sql
    assert "appointments.starts_at <" in sql
    assert "appointments.ends_at >" in sql
    assert f"appointments.id != '{excluded_id}'" in sql
    assert " LIMIT 1" in sql


def test_add_flushes_without_committing() -> None:
    db = MagicMock()
    appointment = MagicMock(spec=Appointment)

    result = AppointmentRepository.add(db, appointment)

    assert result is appointment
    db.add.assert_called_once_with(appointment)
    db.flush.assert_called_once_with()
    db.commit.assert_not_called()
