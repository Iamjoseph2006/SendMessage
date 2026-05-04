export function trackGamingEvent(event: string, payload?: Record<string, unknown>) {
  console.log('[gaming.analytics]', event, payload ?? {});
}
