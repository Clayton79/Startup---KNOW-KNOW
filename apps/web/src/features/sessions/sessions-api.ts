import type {
  AcceptSessionInput,
  AvailableSlots,
  CreateSessionInput,
  ListSessionsQuery,
  Paginated,
  ProposeTimeInput,
  SessionView,
  UpdateMeetingInput,
} from '@know-know/shared';
import { api } from '@/lib/api-client';

type ListQuery = Partial<Pick<ListSessionsQuery, 'scope' | 'role' | 'from' | 'to'>> & {
  page?: number;
  pageSize?: number;
};

export const sessionsApi = {
  list: (query: ListQuery) => api.get<Paginated<SessionView>>('/sessions', query),
  get: (id: string) => api.get<SessionView>(`/sessions/${id}`),
  create: (input: CreateSessionInput) => api.post<SessionView>('/sessions', input),
  accept: (id: string, input: AcceptSessionInput) =>
    api.patch<SessionView>(`/sessions/${id}/accept`, input),
  reject: (id: string) => api.patch<SessionView>(`/sessions/${id}/reject`),
  proposeTime: (id: string, input: ProposeTimeInput) =>
    api.patch<SessionView>(`/sessions/${id}/propose-time`, input),
  cancel: (id: string) => api.patch<SessionView>(`/sessions/${id}/cancel`),
  updateMeeting: (id: string, input: UpdateMeetingInput) =>
    api.patch<SessionView>(`/sessions/${id}/meeting`, input),
  confirm: (id: string, happened: boolean) =>
    api.post<SessionView>(`/sessions/${id}/confirm`, { happened }),
  slots: (userId: string, durationMinutes: number, days = 14) =>
    api.get<AvailableSlots>(`/users/${userId}/slots`, { durationMinutes, days }),
};
