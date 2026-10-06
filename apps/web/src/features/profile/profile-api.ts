import type {
  AvailabilityRuleView,
  AvatarUploadRequest,
  AvatarUploadTicket,
  LearningSkillView,
  MeProfile,
  PublicProfile,
  ReplaceAvailabilityInput,
  ReplaceLearningSkillsInput,
  ReplaceTeachingSkillsInput,
  SkillCatalogCategory,
  TeachingSkillView,
  UpdateProfileInput,
} from '@know-know/shared';
import { api } from '@/lib/api-client';

export const profileApi = {
  getMe: () => api.get<MeProfile>('/me'),
  updateMe: (input: UpdateProfileInput) => api.patch<MeProfile>('/me', input),
  setOnboardingStep: (step: number) => api.patch<MeProfile>('/me/onboarding', { step }),
  completeOnboarding: () => api.post<MeProfile>('/me/onboarding/complete'),
  replaceTeaching: (input: ReplaceTeachingSkillsInput) =>
    api.put<TeachingSkillView[]>('/me/teaching-skills', input),
  replaceLearning: (input: ReplaceLearningSkillsInput) =>
    api.put<LearningSkillView[]>('/me/learning-skills', input),
  replaceAvailability: (input: ReplaceAvailabilityInput) =>
    api.put<AvailabilityRuleView[]>('/me/availability', input),
  createAvatarUpload: (input: AvatarUploadRequest) =>
    api.post<AvatarUploadTicket>('/me/avatar-upload-url', input),
  getUser: (id: string) => api.get<PublicProfile>(`/users/${id}`),
  getSkillCatalog: () => api.get<SkillCatalogCategory[]>('/skills'),
};
