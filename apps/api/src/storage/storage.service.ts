import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { StorageClient } from '@supabase/storage-js';
import type { AvatarUploadTicket } from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import { AppConfig } from '../config/app-config.service';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Acesso ao Supabase Storage. Usa a service role key (somente no servidor) para gerar URLs de
 * upload assinadas; o navegador nunca recebe essa chave.
 */
@Injectable()
export class StorageService {
  private readonly client: StorageClient;
  private readonly bucket: string;
  private readonly baseUrl: string;

  constructor(config: AppConfig) {
    this.baseUrl = config.get('SUPABASE_URL').replace(/\/$/, '');
    this.bucket = config.get('SUPABASE_AVATAR_BUCKET');
    const serviceKey = config.get('SUPABASE_SERVICE_ROLE_KEY');
    this.client = new StorageClient(`${this.baseUrl}/storage/v1`, {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    });
  }

  /** URL pública de um avatar (o bucket de avatares é público para leitura). */
  avatarPublicUrl(path: string | null): string | null {
    return path ? `${this.baseUrl}/storage/v1/object/public/${this.bucket}/${path}` : null;
  }

  /** O caminho do avatar sempre começa pelo id do dono: ninguém grava na pasta de outro usuário. */
  isOwnAvatarPath(userId: string, path: string): boolean {
    return path.startsWith(`${userId}/`) && !path.includes('..');
  }

  async createAvatarUploadTicket(userId: string, contentType: string): Promise<AvatarUploadTicket> {
    const extension = EXTENSIONS[contentType];
    if (!extension) {
      throw AppException.unprocessable('VALIDATION_ERROR', 'Use uma imagem JPG, PNG ou WebP.');
    }
    const path = `${userId}/${randomUUID()}.${extension}`;
    const { data, error } = await this.client.from(this.bucket).createSignedUploadUrl(path);
    if (error || !data) throw new Error(`Falha ao criar URL de upload: ${error?.message}`);
    return { bucket: this.bucket, path: data.path, token: data.token, signedUrl: data.signedUrl };
  }
}
