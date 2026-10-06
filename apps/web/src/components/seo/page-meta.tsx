import { useEffect } from 'react';

const SUFFIX = 'KNOW-KNOW';

function setMeta(name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

/** Define título, descrição e indexação da página atual. Páginas privadas usam `noindex`. */
export function PageMeta({
  title,
  description,
  noindex = false,
}: {
  title: string;
  description?: string;
  noindex?: boolean;
}) {
  useEffect(() => {
    document.title = title === SUFFIX ? title : `${title} · ${SUFFIX}`;
    if (description) setMeta('description', description);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow');
  }, [title, description, noindex]);

  return null;
}
