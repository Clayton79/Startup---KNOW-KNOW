import { Injectable } from '@nestjs/common';
import {
  ProfileStatus,
  SKILL_LEVEL_ORDER,
  type ExploreCard,
  type ExploreQuery,
  type Paginated,
  type SkillLevel,
} from '@know-know/shared';
import { slugify } from '../common/slug';
import { AppConfig } from '../config/app-config.service';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { MatchingService, type PartySource } from '../matching/matching.service';
import { bayesianAverage, scoreMatch, type MatchParty } from '../matching/scoring';
import { toReputation } from '../profiles/profile.mapper';
import { StorageService } from '../storage/storage.service';

/**
 * Teto de candidatos avaliados por busca. A pontuação de compatibilidade é calculada em memória
 * (precisa dos dois perfis); para escalar além do MVP, mover o pré-filtro/ordenação para SQL.
 */
const CANDIDATE_CAP = 300;

const candidateInclude = {
  skill: true,
  user: { include: { teachingSkills: true, learningSkills: true, availability: true } },
} as const satisfies Prisma.UserTeachingSkillInclude;

type CandidateRow = Prisma.UserTeachingSkillGetPayload<{ include: typeof candidateInclude }>;

@Injectable()
export class ExploreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matching: MatchingService,
    private readonly storage: StorageService,
    private readonly config: AppConfig,
  ) {}

  async search(viewerId: string | null, query: ExploreQuery): Promise<Paginated<ExploreCard>> {
    const viewer = viewerId ? await this.loadViewer(viewerId) : null;
    const rows = await this.loadCandidates(viewerId, this.buildWhere(viewerId, query));

    let cards = this.toCards(rows, viewer);
    if (query.minRating !== undefined) {
      const min = query.minRating;
      cards = cards.filter(
        (card) =>
          card.reputation.average !== null &&
          card.reputation.count > 0 &&
          card.reputation.average >= min,
      );
    }

    const bayes = (card: ExploreCard) =>
      bayesianAverage(
        (card.reputation.average ?? 0) * card.reputation.count,
        card.reputation.count,
      );
    cards.sort((a, b) => {
      const byScore = (b.match?.score ?? 0) - (a.match?.score ?? 0);
      if (byScore !== 0) return byScore;
      const byRating = bayes(b) - bayes(a);
      if (byRating !== 0) return byRating;
      return b.sessionsTaught - a.sessionsTaught;
    });

    const start = (query.page - 1) * query.pageSize;
    return {
      items: cards.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: cards.length,
    };
  }

  /** Pessoas que ensinam o que eu quero aprender: uma por pessoa, na melhor habilidade, por compatibilidade. */
  async recommendations(viewerId: string, limit: number): Promise<ExploreCard[]> {
    const viewer = await this.loadViewer(viewerId);
    const wantedIds = viewer.profile.learningSkills.map((item) => item.skillId);
    if (wantedIds.length === 0) return [];

    const rows = await this.loadCandidates(
      viewerId,
      this.buildWhere(viewerId, { skillIds: wantedIds }),
    );
    const cards = this.toCards(rows, viewer);

    const bestByPerson = new Map<string, ExploreCard>();
    for (const card of cards) {
      const current = bestByPerson.get(card.userId);
      if (!current || (card.match?.score ?? 0) > (current.match?.score ?? 0)) {
        bestByPerson.set(card.userId, card);
      }
    }
    return [...bestByPerson.values()]
      .sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0))
      .slice(0, limit);
  }

  private async loadViewer(viewerId: string): Promise<{ profile: PartySource; party: MatchParty }> {
    const profile = await this.prisma.profile.findUniqueOrThrow({
      where: { id: viewerId },
      include: { teachingSkills: true, learningSkills: true, availability: true },
    });
    return { profile, party: this.matching.toParty(profile) };
  }

  private buildWhere(
    viewerId: string | null,
    query: Partial<ExploreQuery> & { skillIds?: string[] },
  ): Prisma.UserTeachingSkillWhereInput {
    const levelsAtLeast = (level: SkillLevel): SkillLevel[] =>
      (Object.keys(SKILL_LEVEL_ORDER) as SkillLevel[]).filter(
        (item) => SKILL_LEVEL_ORDER[item] >= SKILL_LEVEL_ORDER[level],
      );

    const userFilter: Prisma.ProfileWhereInput = {
      status: ProfileStatus.ACTIVE,
      onboardingCompletedAt: { not: null },
      ...(viewerId ? { id: { not: viewerId } } : {}),
      ...(query.mode === 'ONLINE' ? { preferredMode: { in: ['ONLINE', 'BOTH'] } } : {}),
      ...(query.mode === 'IN_PERSON' ? { preferredMode: { in: ['IN_PERSON', 'BOTH'] } } : {}),
      ...(query.available ? { availability: { some: {} } } : {}),
    };

    const text = query.q?.trim();
    // "violao" deve achar "Violão": o slug da habilidade já é minúsculo e sem acento.
    const textSlug = text ? slugify(text) : '';
    return {
      skill: { isActive: true },
      user: userFilter,
      ...(query.skillId ? { skillId: query.skillId } : {}),
      ...(query.skillIds ? { skillId: { in: query.skillIds } } : {}),
      ...(query.level ? { level: { in: levelsAtLeast(query.level) } } : {}),
      ...(text
        ? {
            OR: [
              { skill: { name: { contains: text, mode: 'insensitive' as const } } },
              ...(textSlug ? [{ skill: { slug: { contains: textSlug } } }] : []),
              { user: { displayName: { contains: text, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
  }

  private loadCandidates(
    viewerId: string | null,
    where: Prisma.UserTeachingSkillWhereInput,
  ): Promise<CandidateRow[]> {
    void viewerId;
    return this.prisma.userTeachingSkill.findMany({
      where,
      include: candidateInclude,
      orderBy: { createdAt: 'desc' },
      take: CANDIDATE_CAP,
    });
  }

  private toCards(
    rows: CandidateRow[],
    viewer: { profile: PartySource; party: MatchParty } | null,
  ): ExploreCard[] {
    const creditsPerHour = this.config.creditsPerHour;

    return rows.map((row): ExploreCard => {
      const user = row.user;
      const match = viewer
        ? scoreMatch({
            viewer: viewer.party,
            candidate: this.matching.toCandidate(user),
            focusSkillId: row.skillId,
          })
        : null;

      return {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: this.storage.avatarPublicUrl(user.avatarPath),
        skill: { id: row.skill.id, name: row.skill.name },
        level: row.level,
        description: row.description,
        reputation: toReputation(user.mentorRatingSum, user.mentorRatingCount, 0, 0),
        sessionsTaught: user.sessionsTaught,
        preferredMode: user.preferredMode,
        city: user.city,
        state: user.state,
        creditsPerHour,
        availability: user.availability
          .map(({ id, weekday, startMinute, endMinute }) => ({
            id,
            weekday,
            startMinute,
            endMinute,
          }))
          .sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute),
        match,
      };
    });
  }
}
