export async function getEdgeFunctionErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (error instanceof Error && error.message && error.message !== 'Edge Function returned a non-2xx status code') {
    return error.message;
  }

  const response = (error as { context?: Response })?.context;

  if (response) {
    try {
      const clonedResponse = response.clone();
      const contentType = clonedResponse.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const body = await clonedResponse.json();
        if (typeof body?.error === 'string' && body.error.trim()) {
          return body.error;
        }
        if (typeof body?.message === 'string' && body.message.trim()) {
          return body.message;
        }
      }

      const text = await clonedResponse.text();
      if (text.trim()) {
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed?.error === 'string' && parsed.error.trim()) {
            return parsed.error;
          }
          if (typeof parsed?.message === 'string' && parsed.message.trim()) {
            return parsed.message;
          }
        } catch {
          return text;
        }
      }
    } catch {
      // Ignore parse failures and fall back to the default message.
    }
  }

  return fallback;
}