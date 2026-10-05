import uuid
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.appointment import Appointment
from app.models.patient_plan_contract import (
    PatientPlanContract,
    PatientPlanContractItem,
)
from app.schemas.appointment import AppointmentStatus


OCCUPYING_APPOINTMENT_STATUSES = (
    AppointmentStatus.SCHEDULED.value,
    AppointmentStatus.CONFIRMED.value,
    AppointmentStatus.IN_PROGRESS.value,
)


class AppointmentRepository:
    @staticmethod
    def _operational_filters(
        company_id: uuid.UUID,
    ) -> tuple[ColumnElement[bool], ColumnElement[bool]]:
        return (
            Appointment.company_id == company_id,
            Appointment.deleted_at.is_(None),
        )

    @staticmethod
    def add(db: Session, appointment: Appointment) -> Appointment:
        db.add(appointment)
        db.flush()
        return appointment

    @staticmethod
    def get_by_id(
        db: Session,
        company_id: uuid.UUID,
        appointment_id: uuid.UUID,
        *,
        for_update: bool = False,
    ) -> Appointment | None:
        statement = (
            select(Appointment)
            .options(
                selectinload(Appointment.transactions),
                selectinload(Appointment.session_ledger_entries),
                selectinload(Appointment.patient_plan_contract_item)
                .selectinload(PatientPlanContractItem.ledger_entries),
                selectinload(Appointment.patient_plan_contract_item)
                .selectinload(PatientPlanContractItem.contract)
                .selectinload(PatientPlanContract.transactions),
            )
            .where(
                *AppointmentRepository._operational_filters(company_id),
                Appointment.id == appointment_id,
            )
        )
        if for_update:
            statement = statement.with_for_update()
        return db.execute(statement).scalar_one_or_none()
    @staticmethod
    def list_by_company(
        db: Session,
        company_id: uuid.UUID,
        *,
        window_start: datetime,
        window_end: datetime,
        professional_id: uuid.UUID | None,
        patient_id: uuid.UUID | None,
        service_id: uuid.UUID | None,
        status: AppointmentStatus | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Appointment], int]:
        filters = [
            *AppointmentRepository._operational_filters(company_id),
            Appointment.starts_at < window_end,
            Appointment.ends_at > window_start,
        ]
        if professional_id is not None:
            filters.append(
                Appointment.clinical_professional_id == professional_id
            )
        if patient_id is not None:
            filters.append(Appointment.patient_id == patient_id)
        if service_id is not None:
            filters.append(Appointment.service_id == service_id)
        if status is not None:
            filters.append(Appointment.status == status.value)

        total = db.scalar(
            select(func.count()).select_from(Appointment).where(*filters)
        ) or 0
        statement = (
            select(Appointment)
            .options(
                selectinload(Appointment.transactions),
                selectinload(Appointment.session_ledger_entries),
                selectinload(Appointment.patient_plan_contract_item)
                .selectinload(PatientPlanContractItem.ledger_entries),
                selectinload(Appointment.patient_plan_contract_item)
                .selectinload(PatientPlanContractItem.contract)
                .selectinload(PatientPlanContract.transactions),
            )
            .where(*filters)
            .order_by(Appointment.starts_at.asc(), Appointment.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(db.execute(statement).scalars().all()), total

    @staticmethod
    def find_overlap(
        db: Session,
        company_id: uuid.UUID,
        professional_id: uuid.UUID,
        *,
        starts_at: datetime,
        ends_at: datetime,
        exclude_appointment_id: uuid.UUID | None = None,
    ) -> Appointment | None:
        filters = [
            *AppointmentRepository._operational_filters(company_id),
            Appointment.clinical_professional_id == professional_id,
            Appointment.status.in_(OCCUPYING_APPOINTMENT_STATUSES),
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
        ]
        if exclude_appointment_id is not None:
            filters.append(Appointment.id != exclude_appointment_id)
        statement = (
            select(Appointment)
            .where(*filters)
            .order_by(Appointment.starts_at.asc(), Appointment.id.asc())
            .limit(1)
        )
        return db.execute(statement).scalar_one_or_none()
