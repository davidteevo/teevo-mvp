/**
 * Notification CTA navigation. Courier tracking links are absolute http(s) URLs
 * and must open in a new tab so the user stays in Teevo.
 */

export function isExternalActionUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function navigateNotificationAction(
  url: string,
  push: (href: string) => void
): void {
  if (isExternalActionUrl(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  push(url);
}
