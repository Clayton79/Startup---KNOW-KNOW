import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import type { Prisma } from '../generated/prisma/client';
import type { CandidateParty, MatchParty } from './scoring';

/** Dados mínimos de um perfil necessários para pontuar compatibilidade. */
export type PartySource = Prisma.ProfileGetPayload<{
  include: { teachingSkills: true; learningSkills: true; availability: true };
}>;

@Injectable()
export class MatchingService {
  /** Deslocamento atual do fuso em minutos em relação ao UTC (0 se o fuso for inválido). */
  utcOffsetMinutes(timezone: string): number {
    const zoned = DateTime.now().setZone(timezone);
    return zoned.isValid ? zoned.offset : 0;
  }

  toParty(profile: PartySource): MatchParty {
    return {
      teaching: profile.teachingSkills.map((item) => ({
        skillId: item.skillId,
        level: item.level,
      })),
      learning: profile.learningSkills.map((item) => ({
        skillId: item.skillId,
        desiredLevel: item.desiredLevel,
      })),
      preferredMode: profile.preferredMode,
      city: profile.city,
      availability: profile.availability.map(({ weekday, startMinute, endMinute }) => ({
        weekday,
        startMinute,
        endMinute,
      })),
      utcOffsetMinutes: this.utcOffsetMinutes(profile.timezone),
    };
  }

  toCandidate(profile: PartySource): CandidateParty {
    return {
      ...this.toParty(profile),
      mentorRatingSum: profile.mentorRatingSum,
      mentorRatingCount: profile.mentorRatingCount,
    };
  }
}
