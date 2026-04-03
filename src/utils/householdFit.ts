import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { HouseholdFitResult, HouseholdFitMember } from '../models/householdFit';
import type { UserProfile } from '../models/userProfile';
import type { ResolvedProduct } from '../types/product';
import { buildResultAnalysis } from './resultAnalysis';
import { assessProductRestrictions } from './restrictionMatching';

function getReason(
  product: ResolvedProduct,
  profileId: DietProfileId,
  restrictionIds: UserProfile['restrictionIds'],
  restrictionSeverity: UserProfile['restrictionSeverity']
) {
  const restrictionAssessment = assessProductRestrictions(
    product,
    restrictionIds,
    restrictionSeverity
  );

  if (restrictionAssessment.matches.length > 0) {
    return {
      reason: restrictionAssessment.summary,
      status: restrictionAssessment.tone === 'avoid' ? 'avoid' : 'caution',
    } as const;
  }

  const analysis = buildResultAnalysis(product, profileId);

  if (analysis.foodStatus === 'non-food' || analysis.foodStatus === 'unclear') {
    return {
      reason: analysis.decisionSummary,
      status: 'caution',
    } as const;
  }

  const score = analysis.insights.smartScore ?? 50;

  if (score >= 75) {
    return {
      reason: null,
      status: 'clear',
    } as const;
  }

  if (score >= 55) {
    return {
      reason: analysis.topConcern
        ? `Watch ${analysis.topConcern.toLowerCase()}.`
        : analysis.decisionSummary,
      status: 'caution',
    } as const;
  }

  return {
    reason: analysis.topConcern
      ? `Not a strong fit because of ${analysis.topConcern.toLowerCase()}.`
      : analysis.decisionSummary,
    status: 'avoid',
  } as const;
}

function getSummary(verdict: HouseholdFitResult['verdict'], blockingReason: string | null) {
  switch (verdict) {
    case 'works-for-everyone':
      return 'Works for everyone in this household.';
    case 'works-for-you-only':
      return blockingReason ?? 'Some household profiles may want a different option.';
    case 'one-household-caution':
      return blockingReason ?? 'One saved household profile may want a closer look.';
    default:
      return blockingReason ?? 'This does not fit the active household setup.';
  }
}

export function getHouseholdFitRank(
  verdict: HouseholdFitResult['verdict'] | null | undefined
) {
  switch (verdict) {
    case 'works-for-everyone':
      return 3;
    case 'one-household-caution':
      return 2;
    case 'works-for-you-only':
      return 1;
    default:
      return 0;
  }
}

export function buildHouseholdFitResult(
  product: ResolvedProduct,
  profile: UserProfile | null,
  activeProfileId?: DietProfileId
) {
  const activeMember = {
    id: 'self',
    name: profile?.name?.trim() || 'You',
    profileId:
      activeProfileId ||
      profile?.dietProfileId ||
      DEFAULT_DIET_PROFILE_ID,
    restrictionIds: profile?.restrictionIds ?? [],
    restrictionSeverity: profile?.restrictionSeverity ?? 'strict',
    isActiveShopper: true,
  };
  const householdMembers = (profile?.householdProfiles ?? []).map((item) => ({
    id: item.id,
    isActiveShopper: false,
    name: item.name,
    profileId: item.dietProfileId,
    restrictionIds: item.restrictionIds,
    restrictionSeverity: item.restrictionSeverity,
  }));

  const members = [activeMember, ...householdMembers].map((member) => {
    const fit = getReason(
      product,
      member.profileId,
      member.restrictionIds,
      member.restrictionSeverity
    );

    return {
      id: member.id,
      isActiveShopper: member.isActiveShopper,
      name: member.name,
      reason: fit.reason,
      status: fit.status,
    } satisfies HouseholdFitMember;
  });

  const activeShopper = members[0];
  const firstAvoidingOtherMember =
    members.slice(1).find((member) => member.status === 'avoid') ?? null;
  const firstCautionMember =
    members.slice(1).find((member) => member.status === 'caution') ?? null;

  let verdict: HouseholdFitResult['verdict'] = 'works-for-everyone';
  let blockingReason: string | null = null;

  if (activeShopper?.status === 'avoid') {
    verdict = 'doesnt-fit-this-household';
    blockingReason = activeShopper.reason;
  } else if (firstAvoidingOtherMember) {
    verdict = 'works-for-you-only';
    blockingReason =
      firstAvoidingOtherMember.reason || `${firstAvoidingOtherMember.name} may need a different option.`;
  } else if (firstCautionMember) {
    verdict = 'one-household-caution';
    blockingReason =
      firstCautionMember.reason || `${firstCautionMember.name} may want a closer look.`;
  }

  return {
    blockingReason,
    members,
    summary: getSummary(verdict, blockingReason),
    verdict,
  } satisfies HouseholdFitResult;
}
