import type { PrismaClient } from '../src/generated/prisma/client';

export interface CatalogCategory {
  name: string;
  slug: string;
  skills: string[];
}

/** Catálogo inicial de habilidades (editável depois pelo painel de admin). */
export const CATALOG: CatalogCategory[] = [
  {
    name: 'Tecnologia',
    slug: 'tecnologia',
    skills: ['Java', 'JavaScript', 'Python', 'React', 'SQL', 'Excel', 'Git'],
  },
  {
    name: 'Idiomas',
    slug: 'idiomas',
    skills: ['Inglês', 'Espanhol', 'Francês', 'Alemão'],
  },
  {
    name: 'Estudos',
    slug: 'estudos',
    skills: ['Matemática', 'Física', 'Redação'],
  },
  {
    name: 'Música',
    slug: 'musica',
    skills: ['Violão', 'Piano', 'Canto'],
  },
  {
    name: 'Criatividade',
    slug: 'criatividade',
    skills: ['Photoshop', 'Edição de vídeo', 'Desenho', 'Design'],
  },
  {
    name: 'Outros',
    slug: 'outros',
    skills: ['Culinária', 'Oratória', 'Finanças pessoais'],
  },
];

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Cria/atualiza categorias e habilidades. Idempotente (pode rodar várias vezes). */
export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  for (const [index, category] of CATALOG.entries()) {
    const saved = await prisma.skillCategory.upsert({
      where: { slug: category.slug },
      create: { name: category.name, slug: category.slug, sortOrder: index },
      update: { name: category.name, sortOrder: index },
    });
    for (const name of category.skills) {
      const slug = slugify(name);
      await prisma.skill.upsert({
        where: { slug },
        create: { name, slug, categoryId: saved.id },
        update: { name, categoryId: saved.id },
      });
    }
  }
}
