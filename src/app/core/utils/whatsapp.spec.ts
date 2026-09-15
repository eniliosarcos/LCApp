import { buildProductWhatsAppMessage, buildWhatsAppHref } from './whatsapp';

describe('buildWhatsAppHref', () => {
  it('arma el link de wa.me con el número y el mensaje encodeado', () => {
    expect(buildWhatsAppHref('521234567890', 'Hola! ¿Qué tal?')).toBe(
      'https://wa.me/521234567890?text=Hola!%20%C2%BFQu%C3%A9%20tal%3F'
    );
  });

  it('devuelve "#" si no hay número configurado', () => {
    expect(buildWhatsAppHref('', 'hola')).toBe('#');
  });

  it('encodea los saltos de línea del mensaje', () => {
    expect(buildWhatsAppHref('521234567890', 'línea 1\nlínea 2')).toBe(
      'https://wa.me/521234567890?text=l%C3%ADnea%201%0Al%C3%ADnea%202'
    );
  });
});

describe('buildProductWhatsAppMessage', () => {
  it('arma un mensaje multilínea con nombre, precio formateado y link al producto', () => {
    const message = buildProductWhatsAppMessage({
      name: 'Rosa',
      price: 100,
      url: 'https://example.com/catalog/c1/product/p1'
    });
    expect(message).toBe(
      "Hola! Me interesa un producto de L'Essence de Cerise:\n\n" +
        'Producto: Rosa\n' +
        'Precio: $100.00\n\n' +
        'Lo podés ver acá:\n' +
        'https://example.com/catalog/c1/product/p1'
    );
  });

  it('formatea el precio de venta con dos decimales y el prefijo $', () => {
    const message = buildProductWhatsAppMessage({ name: 'Rosa', price: 80.5, url: 'https://example.com/p' });
    expect(message).toContain('Precio: $80.50');
  });
});