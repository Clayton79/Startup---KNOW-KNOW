import { Injectable } from '@nestjs/common';
import { ProfileStatus, type PublicProfile } from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import {
  toAvailability,
  toLearningSkills,
  toReputation,
  toTeachingSkills,
} from '../profiles/profile.mapper';
import { ProfilesRepository } from '../profiles/profiles.repository';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly profiles: ProfilesRepository,
    private readonly storage: StorageService,
  ) {}

  /**
   * Só expõe o necessário para a troca: nada de e-mail, papel ou dados de conta.
   * Contas desativadas ou ainda sem onboarding respondem 404.
   */
  async getPublicProfile(id: string): Promise<PublicProfile> {
    const profile = await this.profiles.findWithRelations(id);
    if (
      !profile ||
      profile.status !== ProfileStatus.ACTIVE ||
      profile.onboardingCompletedAt === null
    ) {
      throw AppException.notFound('Não encontramos essa pessoa.');
    }

    return {
      id: profile.id,
      displayName: profile.displayName,
      avatarUrl: this.storage.avatarPublicUrl(profile.avatarPath),
      bio: profile.bio,
      city: profile.city,
      state: profile.state,
      preferredMode: profile.preferredMode,
      timezone: profile.timezone,
      memberSince: profile.createdAt.toISOString(),
      reputation: toReputation(
        profile.mentorRatingSum,
        profile.mentorRatingCount,
        profile.studentRatingSum,
        profile.studentRatingCount,
      ),
      mentorReputation: toReputation(profile.mentorRatingSum, profile.mentorRatingCount, 0, 0),
      sessionsTaught: profile.sessionsTaught,
      sessionsLearned: profile.sessionsLearned,
      teachingSkills: toTeachingSkills(profile),
      learningSkills: toLearningSkills(profile),
      availability: toAvailability(profile),
    };
  }
}
