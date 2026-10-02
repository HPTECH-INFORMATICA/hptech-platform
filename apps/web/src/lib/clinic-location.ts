export type ClinicLocationFields = {
  name: string;
  primary_unit_name: string | null;
  address_line: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
};

export function clinicUnitName(clinic: ClinicLocationFields): string {
  return clinic.primary_unit_name?.trim() || clinic.name;
}

export function formatClinicAddress(clinic: ClinicLocationFields): string | null {
  const locality = [clinic.address_city, clinic.address_state]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" - ");
  const parts = [
    clinic.address_line,
    clinic.address_complement,
    clinic.address_district,
    locality || null,
    clinic.address_postal_code
      ? `CEP ${clinic.address_postal_code.trim()}`
      : null,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.length ? parts.join(", ") : null;
}
