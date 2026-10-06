import type { NotificationType } from '../enums';

export interface NotificationView {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Rota do app para abrir ao tocar na notificação. */
  link: string | null;
  read: boolean;
  createdAt: string;
  actor: { id: string; displayName: string; avatarUrl: string | null } | null;
}

export interface UnreadCount {
  count: number;
}
