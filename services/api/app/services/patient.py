import uuid
from datetime import datetime, timezone

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.patient import Patient
from app.repositories.audit_log import AuditLogRepository
from app.repositories.patient import PatientRepository
from app.schemas.patient import (
    PatientCreate,
    PatientListResponse,
    PatientResponse,
    PatientStatusUpdate,
    PatientUpdate,
)


class PatientNotFoundError(RuntimeError):
    pass


class PatientPersistenceError(RuntimeError):
    pass


class PatientLinkedLeadConflictError(RuntimeError):
    pass


class PatientDomain:
    @staticmethod
    def _commit(db: Session, patient: Patient) -> Patient:
        try:
            db.commit()
            db.refresh(patient)
            return patient
        except SQLAlchemyError as error:
            db.rollback()
            raise PatientPersistenceError from error

    @staticmethod
    def list(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        page: int,
        page_size: int,
        search: str | None,
        is_active: bool | None,
    ) -> PatientListResponse:
        items, total = PatientRepository.list_by_company(
            db,
            identity.company.id,
            page=page,
            page_size=page_size,
            search=search,
            is_active=is_active,
        )
        return PatientListResponse(
            items=[PatientResponse.model_validate(item) for item in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def detail(
        db: Session,
        identity: AuthenticatedIdentity,
        patient_id: uuid.UUID,
    ) -> Patient:
        patient = PatientRepository.get_by_id(db, identity.company.id, patient_id)
        if patient is None:
            raise PatientNotFoundError
        return patient

    @classmethod
    def create(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        data: PatientCreate,
    ) -> Patient:
        try:
            patient = PatientRepository.create(db, identity.company.id, data)
            AuditLogRepository.add(
                db,
                company_id=identity.company.id,
                actor_user_id=identity.user.id,
                target_type="PATIENT",
                target_id=patient.id,
                action="PATIENT_CREATED",
                details={"state": "ACTIVE"},
            )
        except SQLAlchemyError as error:
            db.rollback()
            raise PatientPersistenceError from error
        return cls._commit(db, patient)

    @classmethod
    def update(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        patient_id: uuid.UUID,
        data: PatientUpdate,
    ) -> Patient:
        patient = PatientRepository.get_by_id(
            db, identity.company.id, patient_id, for_update=True
        )
        if patient is None:
            raise PatientNotFoundError

        changed: list[str] = []
        for field, value in data.model_dump(exclude_unset=True).items():
            if getattr(patient, field) != value:
                setattr(patient, field, value)
                changed.append(field)
        if not changed:
            return patient

        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="PATIENT",
            target_id=patient.id,
            action="PATIENT_UPDATED",
            details={"fields": changed},
        )
        return cls._commit(db, patient)

    @classmethod
    def change_status(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        patient_id: uuid.UUID,
        data: PatientStatusUpdate,
    ) -> Patient:
        patient = PatientRepository.get_by_id(
            db, identity.company.id, patient_id, for_update=True
        )
        if patient is None:
            raise PatientNotFoundError
        if patient.is_active is data.is_active:
            return patient

        previous = "ACTIVE" if patient.is_active else "INACTIVE"
        current = "ACTIVE" if data.is_active else "INACTIVE"
        patient.is_active = data.is_active
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="PATIENT",
            target_id=patient.id,
            action="PATIENT_STATUS_CHANGED",
            details={"from": previous, "to": current},
        )
        return cls._commit(db, patient)

    @classmethod
    def soft_delete(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        patient_id: uuid.UUID,
    ) -> None:
        patient = PatientRepository.get_by_id(
            db, identity.company.id, patient_id, for_update=True
        )
        if patient is None:
            raise PatientNotFoundError

        if PatientRepository.has_linked_leads(
            db,
            identity.company.id,
            patient.id,
        ):
            db.rollback()
            raise PatientLinkedLeadConflictError

        patient.is_active = False
        patient.deleted_at = datetime.now(timezone.utc)
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type="PATIENT",
            target_id=patient.id,
            action="PATIENT_SOFT_DELETED",
            details={"state": "DELETED"},
        )
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise PatientPersistenceError from error
