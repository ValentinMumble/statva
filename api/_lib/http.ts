type HeaderList = Headers | Record<string, string>;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

const redirect = (location: string, extra: HeaderList = {}): Response => {
  const headers = new Headers(extra);
  headers.set('Location', location);

  return new Response(null, {status: 302, headers});
};

const readCookie = (request: Request, name: string): string | null => {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');

    if (key === name) return decodeURIComponent(value.join('='));
  }

  return null;
};

const cookie = (name: string, value: string, maxAgeSeconds: number): string =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;

export {cookie, json, readCookie, redirect};
