import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setAccessTokenProvider } from './api-client';

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('api-client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    setAccessTokenProvider(async () => null);
  });

  it('envia o token como Bearer e monta a query sem valores vazios', async () => {
    setAccessTokenProvider(async () => 'abc123');
    const fetchMock = mockFetch(Response.json({ ok: true }));

    await api.get('/explore', { skillId: 's1', level: undefined, page: 2 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/explore?skillId=s1&page=2');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer abc123');
  });

  it('converte o erro padronizado da API em ApiError', async () => {
    mockFetch(
      Response.json(
        { error: { code: 'INSUFFICIENT_CREDITS', message: 'Você precisa de mais 5 créditos.' } },
        { status: 409 },
      ),
    );

    await expect(api.post('/sessions', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'INSUFFICIENT_CREDITS',
      message: 'Você precisa de mais 5 créditos.',
    });
  });

  it('trata falha de rede com mensagem amigável', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await api.get('/skills').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK_ERROR');
  });
});
