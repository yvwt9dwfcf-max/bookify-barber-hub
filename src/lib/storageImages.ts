import { supabase } from '@/integrations/supabase/client';

/**
 * As fotos ficam em buckets privados. As URLs "públicas" salvas no banco
 * retornam 400/404, resultando na imagem quebrada (ícone de interrogação).
 *
 * Este módulo instala um fallback global: sempre que uma <img> de storage
 * falhar, geramos uma URL assinada e trocamos o src automaticamente.
 */

const PUBLIC_MARKER = '/storage/v1/object/public/';
const SIGN_TTL_SECONDS = 60 * 60; // 1 hora

const cache = new Map<string, Promise<string | null>>();

export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const idx = url.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;
  const rest = url.slice(idx + PUBLIC_MARKER.length).split('?')[0];
  const [bucket, ...segments] = rest.split('/');
  if (!bucket || segments.length === 0) return null;
  return { bucket, path: decodeURIComponent(segments.join('/')) };
}

export function getSignedStorageUrl(url: string): Promise<string | null> {
  const parsed = parseStorageUrl(url);
  if (!parsed) return Promise.resolve(null);

  const key = `${parsed.bucket}/${parsed.path}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const promise = supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGN_TTL_SECONDS)
    .then(({ data, error }) => (error ? null : data?.signedUrl ?? null))
    .catch(() => null);

  cache.set(key, promise);
  // Renova o cache antes do link assinado expirar
  setTimeout(() => cache.delete(key), (SIGN_TTL_SECONDS - 300) * 1000);
  return promise;
}

const RETRIED = new WeakSet<HTMLImageElement>();

export function installStorageImageFallback() {
  if (typeof document === 'undefined') return;

  document.addEventListener(
    'error',
    (event) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.tagName !== 'IMG') return;

      const img = target as HTMLImageElement;
      if (RETRIED.has(img)) return;

      const src = img.currentSrc || img.src;
      if (!src || !src.includes(PUBLIC_MARKER)) return;

      RETRIED.add(img);
      getSignedStorageUrl(src).then((signed) => {
        if (signed) img.src = signed;
      });
    },
    true,
  );
}
