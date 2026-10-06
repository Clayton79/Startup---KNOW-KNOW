import type {
  AdminDisputeView,
  AdminReportView,
  AdminSkillView,
  AdminStats,
  AdminUserView,
  Paginated,
  ProfileStatus,
  ReportStatus,
} from '@know-know/shared';
import { api } from '@/lib/api-client';

export const adminApi = {
  stats: () => api.get<AdminStats>('/admin/stats'),
  disputes: () => api.get<AdminDisputeView[]>('/admin/disputes'),
  resolveSession: (id: string, outcome: 'COMPLETE' | 'CANCEL') =>
    api.post<void>(`/admin/sessions/${id}/resolve`, { outcome }),
  users: (params: { q?: string; status?: ProfileStatus; page: number }) =>
    api.get<Paginated<AdminUserView>>('/admin/users', { ...params, pageSize: 15 }),
  setUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api.patch<void>(`/admin/users/${id}/status`, { status }),
  adjustCredits: (input: { userId: string; amount: number; description: string }) =>
    api.post<{ balance: number }>('/admin/credits/adjust', input),
  reports: (params: { status?: ReportStatus; page: number }) =>
    api.get<Paginated<AdminReportView>>('/admin/reports', { ...params, pageSize: 15 }),
  updateReport: (id: string, status: ReportStatus, resolutionNote?: string) =>
    api.patch<void>(`/admin/reports/${id}`, { status, resolutionNote: resolutionNote ?? null }),
  skills: () => api.get<AdminSkillView[]>('/admin/skills'),
  categories: () => api.get<{ id: string; name: string }[]>('/admin/skill-categories'),
  createSkill: (input: { categoryId: string; name: string }) =>
    api.post<void>('/admin/skills', input),
  updateSkill: (id: string, input: { name?: string; isActive?: boolean }) =>
    api.patch<void>(`/admin/skills/${id}`, input),
};
