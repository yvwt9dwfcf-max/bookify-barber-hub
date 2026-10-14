import { supabase } from '@/integrations/supabase/client';

/**
 * As fotos ficam em buckets privados. Geramos URLs assinadas e guardamos no
 * aparelho (localStorage) para que as fotos apareçam instantaneamente nas
 * próximas aberturas, sem nova ida ao servidor.
 */

const PUBLIC_MARKER = '/storage/v1/object/public/';
const SIGN_TTL_SECONDS = 60 * 60 * 24; // 24 horas
const REUSE_MARGIN_MS = 60 * 60 * 1000; // renova com 1h de folga
const STORE_KEY = 'bookify-signed-images';
const MAX_ENTRIES = 300;

type Entry = { url: string; exp: number };
const memory = new Map<string, Entry>();
const pending = new Map<string, Promise<string | null>>();

function loadStore() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') as Record<string, Entry>;
    const now = Date.now();
    Object.entries(raw).forEach(([k, v]) => { if (v?.url && v.exp - REUSE_MARGIN_MS > now) memory.set(k, v); });
  } catch { /* storage indisponível */ }
}
let persistTimer: ReturnType<typeof setTimeout> | undefined;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    try {
      const entries = [...memory.entries()].slice(-MAX_ENTRIES);
      localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch { /* cheio ou privado */ }
  }, 300);
}
if (typeof window !== 'undefined') loadStore();

export function clearSignedImageCache() {
  memory.clear();
  pending.clear();
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
}

export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const idx = url.indexOf(PUBLIC_MARKER);
  if (idx === -1) return null;
  const rest = url.slice(idx + PUBLIC_MARKER.length).split('?')[0];
  const [bucket, ...segments] = rest.split('/');
  if (!bucket || segments.length === 0) return null;
  return { bucket, path: decodeURIComponent(segments.join('/')) };
}

const keyOf = (url: string) => {
  const p = parseStorageUrl(url);
  return p ? `${p.bucket}/${p.path}` : null;
};

/** Retorna na hora a URL assinada já guardada no aparelho, se existir. */
export function getCachedSignedUrl(url: string): string | null {
  const key = keyOf(url);
  if (!key) return null;
  const hit = memory.get(key);
  return hit && hit.exp - REUSE_MARGIN_MS > Date.now() ? hit.url : null;
}

export function getSignedStorageUrl(url: string): Promise<string | null> {
  const parsed = parseStorageUrl(url);
  if (!parsed) return Promise.resolve(null);
  const cached = getCachedSignedUrl(url);
  if (cached) return Promise.resolve(cached);

  const key = `${parsed.bucket}/${parsed.path}`;
  const inflight = pending.get(key);
  if (inflight) return inflight;

  const promise = supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGN_TTL_SECONDS)
    .then(({ data, error }) => {
      const signed = error ? null : data?.signedUrl ?? null;
      if (signed) {
        memory.set(key, { url: signed, exp: Date.now() + SIGN_TTL_SECONDS * 1000 });
        persist();
      }
      return signed;
    })
    .catch(() => null)
    .finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

/** Pré-carrega fotos em segundo plano (ex.: avatares da equipe). */
export function preloadStorageImages(urls: (string | null | undefined)[]) {
  urls.forEach((u) => {
    if (!u) return;
    void getSignedStorageUrl(u).then((s) => { if (s) { const i = new Image(); i.decoding = 'async'; i.src = s; } });
  });
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
      getSignedStorageUrl(src).then((signed) => { if (signed) img.src = signed; });
    },
    true,
  );
}
