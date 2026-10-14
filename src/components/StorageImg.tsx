import { forwardRef, useEffect, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { getSignedStorageUrl, parseStorageUrl } from '@/lib/storageImages';

/**
 * <img> that resolves private-bucket storage URLs into signed URLs before loading,
 * so photos never fall back to initials/placeholder just because the bucket is private.
 */
const StorageImg = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(({ src, onError, ...rest }, ref) => {
  const isStorage = !!src && !!parseStorageUrl(src);
  const [resolved, setResolved] = useState<string | undefined>(isStorage ? undefined : src);

  useEffect(() => {
    let alive = true;
    if (!src || !parseStorageUrl(src)) { setResolved(src); return; }
    setResolved(undefined);
    getSignedStorageUrl(src).then((signed) => { if (alive) setResolved(signed || src); });
    return () => { alive = false; };
  }, [src]);

  if (!resolved) return <span aria-hidden className={rest.className} style={{ ...rest.style, display: 'inline-block', background: 'hsl(var(--muted))' }} />;
  return <img ref={ref} src={resolved} onError={(e: SyntheticEvent<HTMLImageElement, Event>) => onError?.(e)} {...rest} />;
});
StorageImg.displayName = 'StorageImg';
export default StorageImg;
