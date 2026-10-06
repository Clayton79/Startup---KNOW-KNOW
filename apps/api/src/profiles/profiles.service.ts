import { Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  DEFAULT_TIMEZONE,
  LIMITS,
  ProfileStatus,
  type AvatarUploadTicket,
  type MeProfile,
  type UpdateProfileInput,
} from '@know-know/shared';
import type { AuthenticatedUser, VerifiedClaims } from '../auth/auth.types';
import { AppException } from '../common/errors/app-exception';
import { AppConfig } from '../config/app-config.service';
import { LedgerService } from '../credits/ledger.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { StorageService } from '../storage/storage.service';
import { toMeProfile } from './profile.mapper';
import { ProfilesRepository } from './profiles.repository';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly repository: ProfilesRepository,
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly storage: StorageService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Resolve o usuário a partir de um token válido. Na primeira requisição cria o perfil,
   * a carteira e o bônus de boas-vindas, tudo em uma única transação.
   */
  async resolveAuthenticatedUser(claims: VerifiedClaims): Promise<AuthenticatedUser> {
    let profile = await this.repository.findAuthContext(claims.sub);

    if (!profile) {
      await this.provision(claims);
      profile = await this.repository.findAuthContext(claims.sub);
    }
    if (!profile) throw AppException.unauthorized();

    if (profile.status !== ProfileStatus.ACTIVE) {
      throw new AppException(
        ApiErrorCode.ACCOUNT_DISABLED,
        'Sua conta está desativada. Fale com o suporte se acha que foi um engano.',
        403,
      );
    }
    return { id: profile.id, role: profile.role, email: claims.email };
  }

  private async provision(claims: VerifiedClaims): Promise<void> {
    const bonus = this.config.welcomeBonusCredits;
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            id: claims.sub,
            displayName: this.initialDisplayName(claims),
            timezone: DEFAULT_TIMEZONE,
            termsAcceptedAt: claims.termsAcceptedAt,
            wallet: { create: {} },
          },
        });
        if (bonus > 0) {
          await this.ledger.credit(tx, {
            userId: claims.sub,
            type: 'BONUS',
            amount: bonus,
            description: 'Créditos de boas-vindas',
          });
        }
      });
    } catch (error) {
      // Duas requisições simultâneas na primeira chamada: a outra já criou o perfil.
      const raced = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!raced) throw error;
    }
  }

  private initialDisplayName(claims: VerifiedClaims): string {
    const fromEmail = claims.email
      ?.split('@')[0]
      ?.replace(/[._-]+/g, ' ')
      .trim();
    const raw = (claims.fullName ?? fromEmail ?? '').trim().slice(0, LIMITS.displayName.max);
    return raw.length >= LIMITS.displayName.min ? raw : 'Novo membro';
  }

  async getMe(userId: string): Promise<MeProfile> {
    const profile = await this.repository.findWithRelations(userId);
    if (!profile) throw AppException.notFound();
    return toMeProfile(profile, this.storage);
  }

  async updateMe(userId: string, input: UpdateProfileInput): Promise<MeProfile> {
    if (
      typeof input.avatarPath === 'string' &&
      !this.storage.isOwnAvatarPath(userId, input.avatarPath)
    ) {
      throw AppException.forbidden('Essa imagem não pertence à sua conta.');
    }

    const updated = await this.repository.update(userId, {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.bio !== undefined && { bio: input.bio }),
      ...(input.city !== undefined && { city: input.city }),
      ...(input.state !== undefined && { state: input.state }),
      ...(input.preferredMode !== undefined && { preferredMode: input.preferredMode }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.avatarPath !== undefined && { avatarPath: input.avatarPath }),
    });
    return toMeProfile(updated, this.storage);
  }

  async setOnboardingStep(userId: string, step: number): Promise<MeProfile> {
    const updated = await this.repository.update(userId, { onboardingStep: step });
    return toMeProfile(updated, this.storage);
  }

  async completeOnboarding(userId: string): Promise<MeProfile> {
    const [teaching, learning] = await this.repository.countSkills(userId);
    if (teaching + learning === 0) {
      throw AppException.unprocessable(
        ApiErrorCode.ONBOARDING_REQUIRED,
        'Conte pelo menos uma coisa que você sabe ensinar ou quer aprender para concluir.',
      );
    }
    const updated = await this.repository.update(userId, {
      onboardingStep: 5,
      onboardingCompletedAt: new Date(),
    });
    return toMeProfile(updated, this.storage);
  }

  createAvatarUploadTicket(userId: string, contentType: string): Promise<AvatarUploadTicket> {
    return this.storage.createAvatarUploadTicket(userId, contentType);
  }
}
