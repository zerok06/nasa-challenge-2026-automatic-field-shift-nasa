/**
 * Pure URL resolver so the Expo Go/LAN behaviour can be tested without Expo.
 *
 * A physical device cannot reach `localhost`; when the configured URL uses a
 * loopback host we reuse the Metro dev-server host (the LAN IP shown by Expo).
 */
export function resolveApiUrl(configured: string | undefined, expoHost?: string): string {
  const fallback = 'http://localhost:8000';
  const metroHost = expoHost
    ?.replace(/^[a-z]+:\/\//i, '')
    .split('/')[0]
    .split(':')[0];

  if (!configured) {
    return metroHost && metroHost !== 'localhost' && metroHost !== '127.0.0.1'
      ? `http://${metroHost}:8000`
      : fallback;
  }

  const match = configured.match(/^(https?:\/\/)([^/:]+)(:\d+)?(\/.*)?$/);
  if (!match) return configured;
  const [, protocol, host, port, path] = match;
  if (host !== 'localhost' && host !== '127.0.0.1') return configured;
  if (!metroHost || metroHost === 'localhost' || metroHost === '127.0.0.1') return configured;

  return `${protocol}${metroHost}${port ?? ':8000'}${path ?? ''}`;
}
