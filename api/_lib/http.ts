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

// Strava allows names up to 255 characters; anything longer is no name.
const MAX_NAME = 255;
// A Strava bike (b) or shoes (g) id, or "none" to take the gear off.
const GEAR_ID = /^([bg]\d+|none)$/;

export {cookie, GEAR_ID, json, MAX_NAME, readCookie, redirect};
