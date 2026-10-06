-- KNOW-KNOW: configuração única do Supabase (rode no SQL Editor do projeto).
-- As TABELAS são criadas pelas migrations do Prisma (`pnpm --filter @know-know/api prisma:deploy`).
-- Este arquivo cuida só do que é específico do Supabase: o bucket de fotos de perfil.

-- Bucket público para leitura (as fotos aparecem no perfil), com limite de tamanho e de tipos.
-- Os limites são aplicados pelo próprio Storage, mesmo que alguém tente burlar o front.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,                                           -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Não criamos políticas de INSERT/UPDATE/DELETE em storage.objects de propósito:
-- o upload acontece apenas por URL assinada, gerada pela API (service role) e restrita à
-- pasta do próprio usuário (<user_id>/<arquivo>). Com RLS ativo e sem políticas, `anon` e
-- `authenticated` não conseguem escrever diretamente.

-- Conferência:
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
