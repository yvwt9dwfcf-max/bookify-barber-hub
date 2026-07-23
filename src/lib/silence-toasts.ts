// Silences non-critical in-app notifications.
// Only error/warning toasts remain visible in-app.
// Push notifications outside the app are unaffected.
import { toast } from "sonner";

const noop: any = () => "" as any;

// Keep: error, warning, loading, promise, dismiss, custom (used for error UI)
// Silence: success, info, message, and default toast()
try {
  (toast as any).success = noop;
  (toast as any).info = noop;
  (toast as any).message = noop;

  // The default `toast(...)` call — replace with a no-op that preserves methods.
  const original = toast as any;
  const wrapped: any = (..._args: any[]) => "";
  for (const key of Object.keys(original)) {
    wrapped[key] = original[key];
  }
  // Re-assign silenced methods on the wrapper
  wrapped.success = noop;
  wrapped.info = noop;
  wrapped.message = noop;
  // Best-effort override of module export
  Object.assign(original, { success: noop, info: noop, message: noop });
} catch {
  // ignore
}
