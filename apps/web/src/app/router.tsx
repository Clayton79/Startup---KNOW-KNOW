import type { ComponentType } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import {
  FullPageSpinner,
  GuestOnly,
  RequireAuth,
  RequireOnboarded,
} from '@/features/auth/route-guards';
import { AdaptiveLayout } from './layouts/adaptive-layout';
import { AppLayout } from './layouts/app-layout';
import { PublicLayout } from './layouts/public-layout';
import { RouteError } from './route-error';

/** Carrega a página só quando a rota é aberta (code splitting por rota). */
function page<T extends Record<string, unknown>>(
  loader: () => Promise<T>,
  name: keyof T,
): Pick<RouteObject, 'lazy'> {
  return {
    lazy: async () => ({ Component: (await loader())[name] as ComponentType }),
  };
}

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    hydrateFallbackElement: <FullPageSpinner label="Carregando" />,
    children: [
      // Públicas (com cabeçalho e rodapé do site)
      {
        element: <PublicLayout />,
        children: [
          { index: true, ...page(() => import('@/features/landing/landing-page'), 'LandingPage') },
          {
            path: 'como-funciona',
            ...page(() => import('@/features/static/how-it-works-page'), 'HowItWorksPage'),
          },
          {
            path: 'privacidade',
            ...page(() => import('@/features/static/privacy-page'), 'PrivacyPage'),
          },
          { path: 'termos', ...page(() => import('@/features/static/terms-page'), 'TermsPage') },
          {
            path: '*',
            ...page(() => import('@/features/errors/not-found-page'), 'NotFoundPage'),
          },
        ],
      },

      // Explorar: pública, mas usa o layout do app quando há login
      {
        element: <AdaptiveLayout />,
        children: [
          {
            path: 'explorar',
            ...page(() => import('@/features/explore/explore-page'), 'ExplorePage'),
          },
        ],
      },

      // Entrada (só para quem ainda não está logado)
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', ...page(() => import('@/features/auth/login-page'), 'LoginPage') },
          { path: 'cadastro', ...page(() => import('@/features/auth/signup-page'), 'SignupPage') },
          {
            path: 'esqueci-minha-senha',
            ...page(() => import('@/features/auth/forgot-password-page'), 'ForgotPasswordPage'),
          },
        ],
      },
      {
        path: 'redefinir-senha',
        ...page(() => import('@/features/auth/reset-password-page'), 'ResetPasswordPage'),
      },

      // Autenticadas
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'onboarding',
            ...page(() => import('@/features/onboarding/onboarding-page'), 'OnboardingPage'),
          },
          {
            element: <RequireOnboarded />,
            children: [
              {
                element: <AppLayout />,
                children: [
                  {
                    path: 'dashboard',
                    ...page(() => import('@/features/dashboard/dashboard-page'), 'DashboardPage'),
                  },
                  {
                    path: 'perfil',
                    ...page(() => import('@/features/profile/my-profile-page'), 'MyProfilePage'),
                  },
                  {
                    path: 'perfil/editar',
                    ...page(
                      () => import('@/features/profile/edit-profile-page'),
                      'EditProfilePage',
                    ),
                  },
                  {
                    path: 'usuario/:id',
                    ...page(
                      () => import('@/features/profile/public-profile-page'),
                      'PublicProfilePage',
                    ),
                  },
                  {
                    path: 'aulas',
                    ...page(() => import('@/features/sessions/sessions-page'), 'SessionsPage'),
                  },
                  {
                    path: 'aulas/:id',
                    ...page(
                      () => import('@/features/sessions/session-detail-page'),
                      'SessionDetailPage',
                    ),
                  },
                  {
                    path: 'agenda',
                    ...page(() => import('@/features/sessions/agenda-page'), 'AgendaPage'),
                  },
                  {
                    path: 'carteira',
                    ...page(() => import('@/features/wallet/wallet-page'), 'WalletPage'),
                  },
                  {
                    path: 'avaliacoes',
                    ...page(() => import('@/features/reviews/reviews-page'), 'ReviewsPage'),
                  },
                  {
                    path: 'notificacoes',
                    ...page(
                      () => import('@/features/notifications/notifications-page'),
                      'NotificationsPage',
                    ),
                  },
                  {
                    path: 'configuracoes',
                    ...page(() => import('@/features/settings/settings-page'), 'SettingsPage'),
                  },
                  {
                    path: 'admin',
                    ...page(() => import('@/features/admin/admin-layout'), 'AdminLayout'),
                    children: [
                      {
                        index: true,
                        ...page(() => import('@/features/admin/admin-home-page'), 'AdminHomePage'),
                      },
                      {
                        path: 'usuarios',
                        ...page(
                          () => import('@/features/admin/admin-users-page'),
                          'AdminUsersPage',
                        ),
                      },
                      {
                        path: 'denuncias',
                        ...page(
                          () => import('@/features/admin/admin-reports-page'),
                          'AdminReportsPage',
                        ),
                      },
                      {
                        path: 'habilidades',
                        ...page(
                          () => import('@/features/admin/admin-skills-page'),
                          'AdminSkillsPage',
                        ),
                      },
                    ],
                  },
                  {
                    path: '*',
                    ...page(() => import('@/features/errors/not-found-page'), 'NotFoundPage'),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
