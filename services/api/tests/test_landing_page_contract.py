from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.landing_page import (
    LandingPageContent,
    LandingPageCreate,
    LandingPageStatus,
    LandingPageTemplate,
    LandingPageUpdate,
)


def valid_content() -> dict:
    return {
        "version": 1,
        "blocks": [
            {
                "id": str(uuid4()),
                "type": "HERO",
                "eyebrow": "Clínica Exemplo",
                "heading": "Cuidado que acolhe",
                "body": "Agende seu atendimento.",
                "primary_action": {
                    "label": "Agendar",
                    "href": "/agendar",
                },
            },
            {
                "id": str(uuid4()),
                "type": "FEATURES",
                "heading": "Diferenciais",
                "items": [
                    {
                        "title": "Atendimento humano",
                        "body": "Uma experiência próxima e segura.",
                    }
                ],
            },
            {
                "id": str(uuid4()),
                "type": "CALL_TO_ACTION",
                "heading": "Fale com a equipe",
                "action": {
                    "label": "Entrar em contato",
                    "href": "https://example.com/contato",
                },
            },
        ],
    }


def test_create_accepts_versioned_structured_content() -> None:
    payload = LandingPageCreate(
        name="  Campanha de avaliação  ",
        slug="  Campanha-Avaliacao  ",
        template=LandingPageTemplate.LEAD_CAPTURE,
        content=valid_content(),
        seo={
            "title": "Avaliação clínica",
            "description": "Conheça a avaliação da Clínica Exemplo.",
            "canonical_url": "https://example.com/campanha-avaliacao",
        },
    )

    assert payload.name == "Campanha de avaliação"
    assert payload.slug == "campanha-avaliacao"
    assert payload.content.version == 1
    assert len(payload.content.blocks) == 3
    assert payload.template is LandingPageTemplate.LEAD_CAPTURE


@pytest.mark.parametrize(
    "href",
    [
        "javascript:alert(1)",
        "http://example.com",
        "//example.com/path",
        "https://user:password@example.com/path",
    ],
)
def test_action_rejects_unsafe_or_insecure_url(href: str) -> None:
    content = valid_content()
    content["blocks"][0]["primary_action"]["href"] = href

    with pytest.raises(ValidationError):
        LandingPageContent.model_validate(content)


def test_content_rejects_duplicate_block_ids() -> None:
    content = valid_content()
    content["blocks"][1]["id"] = content["blocks"][0]["id"]

    with pytest.raises(ValidationError, match="id único"):
        LandingPageContent.model_validate(content)


def test_content_rejects_unknown_block_and_raw_html_shape() -> None:
    content = {
        "version": 1,
        "blocks": [
            {
                "id": str(uuid4()),
                "type": "HTML",
                "html": "<script>alert(1)</script>",
            }
        ],
    }

    with pytest.raises(ValidationError):
        LandingPageContent.model_validate(content)


def test_block_rejects_extra_fields() -> None:
    content = valid_content()
    content["blocks"][0]["html"] = "<strong>não permitido</strong>"

    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        LandingPageContent.model_validate(content)


def test_content_limits_block_count() -> None:
    content = {
        "version": 1,
        "blocks": [
            {
                "id": str(uuid4()),
                "type": "TEXT",
                "body": f"Bloco {index}",
            }
            for index in range(51)
        ],
    }

    with pytest.raises(ValidationError):
        LandingPageContent.model_validate(content)


def test_create_defaults_to_empty_blank_draft_contract() -> None:
    payload = LandingPageCreate(name="Página inicial", slug="pagina-inicial")

    assert payload.template is LandingPageTemplate.BLANK
    assert payload.content.blocks == []
    assert payload.seo.no_index is False
    assert LandingPageStatus.DRAFT.value == "DRAFT"


@pytest.mark.parametrize("slug", ["com espaço", "com_underscore", "área", "-inicio"])
def test_create_rejects_invalid_slug(slug: str) -> None:
    with pytest.raises(ValidationError):
        LandingPageCreate(name="Página", slug=slug)


def test_update_requires_at_least_one_non_null_field() -> None:
    with pytest.raises(ValidationError, match="ao menos um campo"):
        LandingPageUpdate()

    with pytest.raises(ValidationError, match="não aceita valor nulo"):
        LandingPageUpdate(content=None)


def test_seo_rejects_insecure_canonical_url() -> None:
    with pytest.raises(ValidationError, match="HTTPS"):
        LandingPageCreate(
            name="Página",
            slug="pagina",
            seo={"canonical_url": "http://example.com/pagina"},
        )
