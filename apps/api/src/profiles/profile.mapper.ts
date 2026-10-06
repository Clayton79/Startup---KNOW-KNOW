import type {
  AvailabilityRuleView,
  LearningSkillView,
  MeProfile,
  ReputationView,
  SkillSummary,
  TeachingSkillView,
} from '@know-know/shared';
import type { Prisma } from '../generated/prisma/client';
import type { StorageService } from '../storage/storage.service';

export const skillInclude = { include: { category: true } } as const;

export const meInclude = {
  teachingSkills: { include: { skill: skillInclude }, orderBy: { createdAt: 'asc' } },
  learningSkills: { include: { skill: skillInclude }, orderBy: { createdAt: 'asc' } },
  availability: { orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }] },
} as const satisfies Prisma.ProfileInclude;

export type ProfileWithRelations = Prisma.ProfileGetPayload<{ include: typeof meInclude }>;
type SkillWithCategory = Prisma.SkillGetPayload<typeof skillInclude>;

export function toSkillSummary(skill: SkillWithCategory): SkillSummary {
  return {
    id: skill.id,
    name: skill.name,
    slug: skill.slug,
    categoryId: skill.categoryId,
    categoryName: skill.category.name,
  };
}

export function toReputation(
  mentorSum: number,
  mentorCount: number,
  studentSum: number,
  studentCount: number,
): ReputationView {
  const count = mentorCount + studentCount;
  if (count === 0) return { average: null, count: 0 };
  return { average: Math.round(((mentorSum + studentSum) / count) * 10) / 10, count };
}

export function toTeachingSkills(profile: ProfileWithRelations): TeachingSkillView[] {
  return profile.teachingSkills.map((item) => ({
    skill: toSkillSummary(item.skill),
    level: item.level,
    description: item.description,
  }));
}

export function toLearningSkills(profile: ProfileWithRelations): LearningSkillView[] {
  return profile.learningSkills.map((item) => ({
    skill: toSkillSummary(item.skill),
    desiredLevel: item.desiredLevel,
  }));
}

export function toAvailability(profile: ProfileWithRelations): AvailabilityRuleView[] {
  return profile.availability.map((rule) => ({
    id: rule.id,
    weekday: rule.weekday,
    startMinute: rule.startMinute,
    endMinute: rule.endMinute,
  }));
}

export function toMeProfile(profile: ProfileWithRelations, storage: StorageService): MeProfile {
  return {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: storage.avatarPublicUrl(profile.avatarPath),
    avatarPath: profile.avatarPath,
    bio: profile.bio,
    city: profile.city,
    state: profile.state,
    preferredMode: profile.preferredMode,
    timezone: profile.timezone,
    role: profile.role,
    createdAt: profile.createdAt.toISOString(),
    onboarding: {
      step: profile.onboardingStep,
      completed: profile.onboardingCompletedAt !== null,
    },
    teachingSkills: toTeachingSkills(profile),
    learningSkills: toLearningSkills(profile),
    availability: toAvailability(profile),
    reputation: toReputation(
      profile.mentorRatingSum,
      profile.mentorRatingCount,
      profile.studentRatingSum,
      profile.studentRatingCount,
    ),
    sessionsTaught: profile.sessionsTaught,
    sessionsLearned: profile.sessionsLearned,
  };
}
