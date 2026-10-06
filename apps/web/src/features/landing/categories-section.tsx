import { BookOpen, Laptop, Languages, Music, Palette, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
  {
    icon: Laptop,
    name: 'Tecnologia',
    examples: 'Java, JavaScript, Python, React, SQL, Excel, Git',
  },
  { icon: Languages, name: 'Idiomas', examples: 'Inglês, espanhol, francês, alemão' },
  { icon: BookOpen, name: 'Estudos', examples: 'Matemática, física, redação' },
  { icon: Music, name: 'Música', examples: 'Violão, piano, canto' },
  { icon: Palette, name: 'Criatividade', examples: 'Photoshop, edição de vídeo, desenho' },
  { icon: Sparkles, name: 'Outros', examples: 'Culinária, oratória, finanças pessoais' },
];

export function CategoriesSection() {
  return (
    <section aria-labelledby="categorias-titulo" className="bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <h2 id="categorias-titulo" className="text-3xl font-extrabold text-brand sm:text-4xl">
            Tem espaço para todo tipo de conhecimento
          </h2>
          <p className="text-lg text-fg-muted">
            De programação a violão. Se você sabe fazer e consegue explicar, alguém quer aprender.
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.name}>
              <Link
                to="/explorar"
                className="group flex h-full gap-4 rounded-lg border border-border bg-surface p-5 transition-shadow hover:shadow-md"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand text-secondary">
                  <category.icon aria-hidden="true" className="size-6" />
                </span>
                <span>
                  <span className="block text-lg font-bold group-hover:text-primary-strong">
                    {category.name}
                  </span>
                  <span className="mt-1 block text-fg-muted">{category.examples}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
