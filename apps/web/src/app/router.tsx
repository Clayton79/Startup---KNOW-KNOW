import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from './layouts/public-layout';
import { RouteError } from './route-error';

/**
 * Cada página é carregada sob demanda (code splitting por rota).
 * As rotas autenticadas e de admin entram nas próximas fases.
 */
export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (await import('@/features/landing/landing-page')).LandingPage,
        }),
      },
      {
        path: '*',
        lazy: async () => ({
          Component: (await import('@/features/errors/not-found-page')).NotFoundPage,
        }),
      },
    ],
  },
]);
