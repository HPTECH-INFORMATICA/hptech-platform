export type CurrentCompany = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  company: CurrentCompany;
};
