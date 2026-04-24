import { request } from './client';

interface TokenCache {
  customer?: string;
  admin?: string;
}

const cache: TokenCache = {};

const CREDENTIALS = {
  customer: { email: 'nguyenvana@gmail.com', matKhau: 'Admin@123' },
  admin: { email: 'admin@pcstore.vn', matKhau: 'Admin@123' },
};

const LOGIN_PATHS = {
  customer: '/auth/login',
  admin: '/auth/admin/login',
};

export async function getToken(type: 'customer' | 'admin'): Promise<string> {
  if (cache[type]) return cache[type]!;

  const res = await request('POST', LOGIN_PATHS[type], {
    body: CREDENTIALS[type],
  });

  if (res.status !== 200) {
    throw new Error(
      `[auth] Login failed (${type}): HTTP ${res.status}\n${JSON.stringify(res.body, null, 2)}`,
    );
  }

  const token = (res.body as any)?.data?.accessToken as string | undefined;
  if (!token) {
    throw new Error(
      `[auth] accessToken missing in response: ${JSON.stringify(res.body, null, 2)}`,
    );
  }

  cache[type] = token;
  return token;
}

export function clearTokenCache(): void {
  delete cache.customer;
  delete cache.admin;
}
