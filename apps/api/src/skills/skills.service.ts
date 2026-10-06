import { Injectable } from '@nestjs/common';
import type { SkillCatalogCategory } from '@know-know/shared';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Catálogo agrupado por categoria, só com habilidades ativas. */
  async listCatalog(): Promise<SkillCatalogCategory[]> {
    const categories = await this.prisma.skillCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        skills: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, slug: true },
        },
      },
    });
    return categories
      .filter((category) => category.skills.length > 0)
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        skills: category.skills,
      }));
  }

  /** Ids que existem e estão ativos, para validar listas enviadas pelo cliente. */
  async findActiveIds(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.skill.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true },
    });
    return new Set(rows.map((row) => row.id));
  }
}
