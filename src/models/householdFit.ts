export type HouseholdFitStatus = 'avoid' | 'caution' | 'clear';

export type HouseholdFitVerdict =
  | 'works-for-everyone'
  | 'works-for-you-only'
  | 'one-household-caution'
  | 'doesnt-fit-this-household';

export type HouseholdFitMember = {
  id: string;
  isActiveShopper: boolean;
  name: string;
  reason: string | null;
  status: HouseholdFitStatus;
};

export type HouseholdFitResult = {
  blockingReason: string | null;
  members: HouseholdFitMember[];
  summary: string;
  verdict: HouseholdFitVerdict;
};
