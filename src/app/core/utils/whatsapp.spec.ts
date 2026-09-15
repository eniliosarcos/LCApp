import { buildWhatsAppHref } from './whatsapp';

describe('buildWhatsAppHref', () => {
  it('arma el link de wa.me con el número y el mensaje encodeado', () => {
    expect(buildWhatsAppHref('521234567890', 'Hola! ¿Qué tal?')).toBe(
      'https://wa.me/521234567890?text=Hola!%20%C2%BFQu%C3%A9%20tal%3F'
    );
  });

  it('devuelve "#" si no hay número configurado', () => {
    expect(buildWhatsAppHref('', 'hola')).toBe('#');
  });
});