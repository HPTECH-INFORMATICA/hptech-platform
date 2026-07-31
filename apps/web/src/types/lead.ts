export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL"
  | "WON"
  | "LOST";

export type LeadSource =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "GOOGLE"
  | "WEBSITE"
  | "WHATSAPP"
  | "REFERRAL"
  | "EVENT"
  | "OTHER"
  | "TESTE";

export interface Lead {
  id: string;
  company_id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  birth_date: string | null;
  source: LeadSource | string;
  interest: string | null;
  pipeline_status: LeadStatus;
  notes: string | null;
}

export type LeadKanban = Record<LeadStatus, Lead[]>;