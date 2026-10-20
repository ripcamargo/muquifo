import { describe, expect, it } from 'vitest';
import { formatNormalizedPhone, maskPhone, validatePhone } from './phone';
import { validateName } from './text';
import { buildBookingMessage, studioWhatsappUrl } from './whatsapp';

describe('telefone', () => {
  it('aplica a máscara progressivamente', () => {
    expect(maskPhone('15')).toBe('(15');
    expect(maskPhone('15998')).toBe('(15) 998');
    expect(maskPhone('1533334444')).toBe('(15) 3333-4444');
    expect(maskPhone('15998110938')).toBe('(15) 99811-0938');
  });

  it.each([
    ['(15) 99811-0938'],
    ['15998110938'],
    ['+55 15 99811-0938'],
    ['5515998110938'],
    ['015 99811-0938'],
  ])('normaliza %s', (input) => {
    expect(validatePhone(input)).toEqual({ ok: true, normalized: '5515998110938', display: '(15) 99811-0938' });
  });

  it('rejeita números inválidos', () => {
    expect(validatePhone('').ok).toBe(false);
    expect(validatePhone('99811-0938').ok).toBe(false); // sem DDD
    expect(validatePhone('(20) 99811-0938').ok).toBe(false); // DDD inexistente
    expect(validatePhone('(15) 89811-0938').ok).toBe(false); // celular sem o 9
    expect(validatePhone('(15) 9981-1093').ok).toBe(false); // 8 dígitos começando com 9
  });

  it('aceita fixo de 8 dígitos', () => {
    expect(validatePhone('(15) 3333-4444')).toMatchObject({ ok: true, normalized: '551533334444' });
  });

  it('formata a partir do normalizado', () => {
    expect(formatNormalizedPhone('5515998110938')).toBe('+55 (15) 99811-0938');
  });
});

describe('nome', () => {
  it('aceita nomes compostos e remove espaços extras', () => {
    expect(validateName('  Maria   da  Silva ')).toEqual({ ok: true, value: 'Maria da Silva' });
    expect(validateName('A').ok).toBe(false);
    expect(validateName('123').ok).toBe(false);
  });
});

describe('mensagem do WhatsApp', () => {
  const base = {
    name: 'João',
    whatsapp: '(15) 99999-0000',
    service: 'ensaio' as const,
    date: '2026-10-24',
    start: '19:00',
    end: '21:00',
  };

  it('omite campos opcionais vazios', () => {
    const msg = buildBookingMessage(base);
    expect(msg).toContain('Serviço: Ensaio musical');
    expect(msg).toContain('Data: 24/10/2026 (sábado)');
    expect(msg).toContain('Horário: 19h às 21h (2h)');
    expect(msg).not.toContain('Projeto/banda');
    expect(msg).not.toContain('Observações');
  });

  it('inclui os opcionais preenchidos e codifica a URL', () => {
    const msg = buildBookingMessage({ ...base, projectName: 'Os Muquifos', notes: 'Levo pedal & cabo' });
    expect(msg).toContain('Projeto/banda: Os Muquifos');
    const url = studioWhatsappUrl(msg);
    expect(url.startsWith('https://wa.me/5515998110938?text=')).toBe(true);
    expect(decodeURIComponent(url.split('text=')[1])).toBe(msg);
    expect(url).not.toContain(' ');
  });
});
