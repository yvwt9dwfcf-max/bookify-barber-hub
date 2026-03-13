import { useState, useEffect, useRef, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  /** Debounce delay in ms (default 3000) */
  debounceMs?: number;
  /** Save on blur (default true) */
  saveOnBlur?: boolean;
  /** Callback to persist the value */
  onSave: (value: string) => Promise<void>;
  /** Initial/synced value from server */
  serverValue: string;
}

export function useAutoSave({
  debounceMs = 3000,
  saveOnBlur = true,
  onSave,
  serverValue,
}: UseAutoSaveOptions) {
  const [value, setValue] = useState(serverValue);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(serverValue);
  const isMountedRef = useRef(true);

  // Sync when server value changes externally
  useEffect(() => {
    setValue(serverValue);
    lastSavedRef.current = serverValue;
  }, [serverValue]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const save = useCallback(async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === lastSavedRef.current.trim()) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;

    setStatus('saving');
    try {
      await onSave(trimmed);
      if (isMountedRef.current) {
        lastSavedRef.current = trimmed;
        setStatus('saved');
        setTimeout(() => {
          if (isMountedRef.current) setStatus('idle');
        }, 2000);
      }
    } catch {
      if (isMountedRef.current) {
        setStatus('error');
        setTimeout(() => {
          if (isMountedRef.current) setStatus('idle');
        }, 3000);
      }
    }
  }, [onSave]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(newValue), debounceMs);
  }, [debounceMs, save]);

  const handleBlur = useCallback(() => {
    if (saveOnBlur) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      save(value);
    }
  }, [saveOnBlur, save, value]);

  return {
    value,
    setValue: handleChange,
    onBlur: handleBlur,
    status,
  };
}
