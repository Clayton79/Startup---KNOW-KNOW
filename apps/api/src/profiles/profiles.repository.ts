import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { meInclude, type ProfileWithRelations } from './profile.mapper';

@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAuthContext(id: string) {
    return this.prisma.profile.findUnique({
      where: { id },
      select: { id: true, role: true, status: true },
    });
  }

  findWithRelations(id: string): Promise<ProfileWithRelations | null> {
    return this.prisma.profile.findUnique({ where: { id }, include: meInclude });
  }

  update(id: string, data: Prisma.ProfileUpdateInput): Promise<ProfileWithRelations> {
    return this.prisma.profile.update({ where: { id }, data, include: meInclude });
  }

  countSkills(id: string) {
    return Promise.all([
      this.prisma.userTeachingSkill.count({ where: { userId: id } }),
      this.prisma.userLearningSkill.count({ where: { userId: id } }),
    ]);
  }
}
