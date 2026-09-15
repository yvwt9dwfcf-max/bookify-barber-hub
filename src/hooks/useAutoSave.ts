import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  /** Debounce delay in ms (default 1000) */
  debounceMs?: number;
  /** Save on blur (default true) */
  saveOnBlur?: boolean;
  /** Callback to persist the value */
  onSave: (value: string) => Promise<void>;
  /** Initial/synced value from server */
  serverValue: string;
}

export function useAutoSave({
  debounceMs = 1000,
  saveOnBlur = true,
  onSave,
  serverValue,
}: UseAutoSaveOptions) {
  const [value, setValue] = useState(serverValue);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(serverValue);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync when server value changes externally
  useEffect(() => {
    setValue(serverValue);
    lastSavedRef.current = serverValue;
  }, [serverValue]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, []);

  const save = useCallback(async (val: string) => {
    const trimmed = val.trim();
    if (!trimmed || trimmed === lastSavedRef.current.trim()) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const requestId = ++requestIdRef.current;
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatus('saving');
    try {
      await onSave(trimmed);
      if (isMountedRef.current && requestId === requestIdRef.current) {
        lastSavedRef.current = trimmed;
        setStatus('saved');
        statusTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setStatus('idle');
        }, 3000);
      }
    } catch (error) {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setStatus('error');
        toast.error('Não foi possível salvar. Tente novamente.');
        console.error('Erro no salvamento automático:', error);
      }
    }
  }, [onSave]);

  const handleChange = useCallback((newValue: string) => {
    requestIdRef.current += 1;
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
