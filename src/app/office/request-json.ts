export async function requestJson(url: string, body: unknown, waitMs: number, timeoutMessage: string, failureMessage: string) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), waitMs);
 try {
  const response = await fetch(url, {
   method: 'POST',
   headers: {'Content-Type': 'application/json'},
   body: JSON.stringify(body),
   signal: controller.signal,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || failureMessage);
  return data;
 } catch (error) {
  if (controller.signal.aborted) throw new Error(timeoutMessage);
  throw error;
 } finally {
  clearTimeout(timer);
 }
}
