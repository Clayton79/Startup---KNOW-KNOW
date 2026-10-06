import { AVATAR_RULES } from '@know-know/shared';
import { Camera } from 'lucide-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/components/ui/error-state';
import { supabase } from '@/lib/supabase';
import { profileApi } from './profile-api';
import { useProfileMutation } from './use-profile';

type AllowedType = (typeof AVATAR_RULES.mimeTypes)[number];

function isAllowedType(type: string): type is AllowedType {
  return (AVATAR_RULES.mimeTypes as readonly string[]).includes(type);
}

/** Envia a foto direto ao Storage por URL assinada e depois grava o caminho no perfil. */
export function AvatarUploader({ name, currentUrl }: { name: string; currentUrl: string | null }) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const savePath = useProfileMutation((avatarPath: string) => profileApi.updateMe({ avatarPath }));

  const onSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!isAllowedType(file.type)) {
      toast.error('Use uma imagem JPG, PNG ou WebP.');
      return;
    }
    if (file.size > AVATAR_RULES.maxBytes) {
      toast.error('A imagem passou de 2 MB. Escolha uma menor.');
      return;
    }

    setUploading(true);
    try {
      const ticket = await profileApi.createAvatarUpload({
        contentType: file.type,
        size: file.size,
      });
      const { error } = await supabase.storage
        .from(ticket.bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (error) throw error;
      await savePath.mutateAsync(ticket.path);
      setPreview(URL.createObjectURL(file));
      toast.success('Foto atualizada.');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={preview ?? currentUrl} size="xl" />
      <div className="space-y-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={AVATAR_RULES.mimeTypes.join(',')}
          className="sr-only"
          aria-label="Escolher foto de perfil"
          tabIndex={-1}
          onChange={(event) => void onSelect(event)}
        />
        <Button
          variant="outline"
          loading={uploading}
          onClick={() => inputRef.current?.click()}
          aria-describedby={`${inputId}-hint`}
        >
          <Camera aria-hidden="true" className="size-5" />
          {currentUrl || preview ? 'Trocar foto' : 'Enviar foto'}
        </Button>
        <p id={`${inputId}-hint`} className="text-sm text-fg-muted">
          JPG, PNG ou WebP, até 2 MB.
        </p>
      </div>
    </div>
  );
}
