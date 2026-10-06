import { z } from 'zod';
import { PAGINATION } from '../constants';

/** Query string padrão de listas paginadas (?page=1&pageSize=12). */
export const paginationQueryShape = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.maxPageSize)
    .default(PAGINATION.defaultPageSize),
} as const;
export const paginationQuerySchema = z.object(paginationQueryShape);
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
