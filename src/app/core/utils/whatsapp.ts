interface ProductWhatsAppMessage {
  name: string;
  price: number;
  url: string;
}

export function buildWhatsAppHref(number: string, message: string): string {
  if (!number) {
    return '#';
  }
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildProductWhatsAppMessage({ name, price, url }: ProductWhatsAppMessage): string {
  return [
    "Hola! Me interesa un producto de L'Essence de Cerise:",
    '',
    `Producto: ${name}`,
    `Precio: $${price.toFixed(2)}`,
    '',
    'Lo podés ver acá:',
    url
  ].join('\n');
}