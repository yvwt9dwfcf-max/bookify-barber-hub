import { forwardRef, useEffect, useState, type ImgHTMLAttributes } from 'react';
import { getCachedSignedUrl, getSignedStorageUrl, parseStorageUrl } from '@/lib/storageImages';

const resolveNow = (src?: string) => (!src ? undefined : parseStorageUrl(src) ? getCachedSignedUrl(src) ?? undefined : src);

/**
 * <img> para fotos de buckets privados. Mostra na hora a versão guardada no
 * aparelho e nunca apaga a foto anterior enquanto busca a nova, evitando piscadas.
 */
const StorageImg = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(({ src, style, ...rest }, ref) => {
  const [resolved, setResolved] = useState<string | undefined>(() => resolveNow(src));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const now = resolveNow(src);
    if (now) { setResolved(now); return; }
    if (!src) { setResolved(undefined); return; }
    getSignedStorageUrl(src).then((signed) => { if (alive) setResolved(signed || src); });
    return () => { alive = false; };
  }, [src]);

  if (!resolved) {
    return <span aria-hidden className={rest.className} style={{ ...style, display: 'inline-block', background: 'hsl(var(--muted))' }} />;
  }
  return (
    <img
      ref={ref}
      src={resolved}
      decoding="async"
      {...rest}
      onLoad={(e) => { setLoaded(true); rest.onLoad?.(e); }}
      style={{ ...style, background: loaded ? style?.background : 'hsl(var(--muted))' }}
    />
  );
});
StorageImg.displayName = 'StorageImg';
export default StorageImg;
