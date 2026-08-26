from __future__ import annotations

import uuid

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.identity import AuthenticatedIdentity
from app.models.lead import Lead
from app.models.patient import Patient
from app.repositories.audit_log import AuditLogRepository
from app.repositories.lead import LeadRepository
from app.repositories.lead_history import LeadHistoryRepository
from app.repositories.patient import PatientRepository
from app.schemas.lead_history import LeadHistoryCreate
from app.schemas.patient import PatientCreate


class LeadPatientNotFoundError(RuntimeError):
    pass


class LeadPatientConflictError(RuntimeError):
    pass


class LeadPatientInactiveError(RuntimeError):
    pass


class LeadPatientDependencyError(RuntimeError):
    pass


class LeadPatientPersistenceError(RuntimeError):
    pass


class LeadPatientDomain:
    @staticmethod
    def _lead(
        db: Session,
        identity: AuthenticatedIdentity,
        lead_id: uuid.UUID,
        *,
        for_update: bool,
    ) -> Lead:
        lead = LeadRepository.get_by_id(
            db,
            identity.company.id,
            lead_id,
            for_update=for_update,
        )
        if lead is None:
            raise LeadPatientNotFoundError
        return lead

    @staticmethod
    def _patient(
        db: Session,
        identity: AuthenticatedIdentity,
        patient_id: uuid.UUID,
    ) -> Patient:
        patient = PatientRepository.get_by_id(
            db,
            identity.company.id,
            patient_id,
        )
        if patient is None:
            raise LeadPatientNotFoundError
        return patient

    @staticmethod
    def _history(
        db: Session,
        identity: AuthenticatedIdentity,
        lead: Lead,
        *,
        action: str,
        patient_id: uuid.UUID,
    ) -> None:
        linked = action == "PATIENT_LINKED"
        LeadHistoryRepository.create(
            db,
            lead.company_id,
            lead.id,
            identity.user.id,
            LeadHistoryCreate(
                company_id=lead.company_id,
                lead_id=lead.id,
                user_id=identity.user.id,
                action=action,
                previous_value=None if linked else str(patient_id),
                new_value=str(patient_id) if linked else None,
                description=(
                    "Paciente associado ao Lead"
                    if linked
                    else "Paciente desvinculado do Lead"
                ),
            ),
        )

    @staticmethod
    def _audit(
        db: Session,
        identity: AuthenticatedIdentity,
        *,
        action: str,
        target_type: str,
        target_id: uuid.UUID,
        details: dict[str, str],
    ) -> None:
        AuditLogRepository.add(
            db,
            company_id=identity.company.id,
            actor_user_id=identity.user.id,
            target_type=target_type,
            target_id=target_id,
            action=action,
            details=details,
        )

    @staticmethod
    def _commit(db: Session) -> None:
        try:
            db.commit()
        except SQLAlchemyError as error:
            db.rollback()
            raise LeadPatientPersistenceError from error

    @classmethod
    def get_link(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        lead_id: uuid.UUID,
    ) -> Patient | None:
        lead = cls._lead(db, identity, lead_id, for_update=False)
        if lead.patient_id is None:
            return None
        return cls._patient(db, identity, lead.patient_id)

    @classmethod
    def create_from_lead(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        lead_id: uuid.UUID,
    ) -> Patient:
        try:
            lead = cls._lead(db, identity, lead_id, for_update=True)
            if lead.patient_id is not None:
                return cls._patient(db, identity, lead.patient_id)

            patient = PatientRepository.create(
                db,
                identity.company.id,
                PatientCreate(
                    name=lead.name,
                    phone=lead.phone,
                    whatsapp=lead.whatsapp,
                    email=lead.email,
                    birth_date=lead.birth_date,
                ),
            )
            lead.patient_id = patient.id
            cls._history(
                db,
                identity,
                lead,
                action="PATIENT_LINKED",
                patient_id=patient.id,
            )
            cls._audit(
                db,
                identity,
                action="PATIENT_CREATED_FROM_LEAD",
                target_type="PATIENT",
                target_id=patient.id,
                details={"lead_id": str(lead.id), "state": "ACTIVE"},
            )
            cls._audit(
                db,
                identity,
                action="LEAD_LINKED_TO_PATIENT",
                target_type="LEAD",
                target_id=lead.id,
                details={"patient_id": str(patient.id)},
            )
            cls._commit(db)
            db.refresh(patient)
            return patient
        except (LeadPatientNotFoundError, LeadPatientConflictError):
            db.rollback()
            raise
        except SQLAlchemyError as error:
            db.rollback()
            raise LeadPatientPersistenceError from error

    @classmethod
    def link_existing(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        lead_id: uuid.UUID,
        patient_id: uuid.UUID,
    ) -> Patient:
        try:
            lead = cls._lead(db, identity, lead_id, for_update=True)
            if lead.patient_id == patient_id:
                return cls._patient(db, identity, patient_id)
            if lead.patient_id is not None:
                raise LeadPatientConflictError

            patient = cls._patient(db, identity, patient_id)
            if not patient.is_active:
                raise LeadPatientInactiveError
            lead.patient_id = patient.id
            cls._history(
                db,
                identity,
                lead,
                action="PATIENT_LINKED",
                patient_id=patient.id,
            )
            cls._audit(
                db,
                identity,
                action="LEAD_LINKED_TO_PATIENT",
                target_type="LEAD",
                target_id=lead.id,
                details={"patient_id": str(patient.id)},
            )
            cls._commit(db)
            return patient
        except (
            LeadPatientNotFoundError,
            LeadPatientConflictError,
            LeadPatientInactiveError,
        ):
            db.rollback()
            raise
        except SQLAlchemyError as error:
            db.rollback()
            raise LeadPatientPersistenceError from error

    @classmethod
    def unlink(
        cls,
        db: Session,
        identity: AuthenticatedIdentity,
        lead_id: uuid.UUID,
    ) -> None:
        try:
            lead = cls._lead(db, identity, lead_id, for_update=True)
            if lead.patient_id is None:
                return
            if LeadRepository.has_appointments(db, identity.company.id, lead.id):
                raise LeadPatientDependencyError

            patient_id = lead.patient_id
            lead.patient_id = None
            cls._history(
                db,
                identity,
                lead,
                action="PATIENT_UNLINKED",
                patient_id=patient_id,
            )
            cls._audit(
                db,
                identity,
                action="LEAD_UNLINKED_FROM_PATIENT",
                target_type="LEAD",
                target_id=lead.id,
                details={"patient_id": str(patient_id)},
            )
            cls._commit(db)
        except (LeadPatientNotFoundError, LeadPatientDependencyError):
            db.rollback()
            raise
        except SQLAlchemyError as error:
            db.rollback()
            raise LeadPatientPersistenceError from error
