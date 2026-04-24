const BASE_URL = `http://localhost:${process.env.PORT ?? 4000}/api`;

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  raw: string;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  query?: Record<string, string | number>;
  body?: unknown;
  cookies?: string;
}

export async function request(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<HttpResponse> {
  const url = new URL(`${BASE_URL}${path}`);

  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (options.headers) Object.assign(headers, options.headers);
  if (options.cookies) headers['Cookie'] = options.cookies;

  const fetchOptions: RequestInit = { method, headers };
  if (options.body !== undefined && method !== 'GET' && method !== 'DELETE') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url.toString(), fetchOptions);
  const raw = await response.text();

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    body = raw;
  }

  const resHeaders: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    resHeaders[k.toLowerCase()] = v;
  });

  return { status: response.status, headers: resHeaders, body, raw };
}
