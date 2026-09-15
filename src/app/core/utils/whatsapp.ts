export function buildWhatsAppHref(number: string, message: string): string {
  if (!number) {
    return '#';
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}