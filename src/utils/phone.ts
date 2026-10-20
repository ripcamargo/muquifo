// Telefones brasileiros: DDD (2 dígitos) + número de 8 (fixo) ou 9 dígitos (celular).
// Versão normalizada: só dígitos, com código do país. Ex.: 5515998110938

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48,
  49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Remove código do país e zero de operadora/DDD, deixando só DDD + número. */
export function toNationalDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 11);
}

/** Máscara progressiva para o campo: (15) 99811-0938 */
export function maskPhone(input: string): string {
  const d = toNationalDigits(input);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

export type PhoneValidation = { ok: true; normalized: string; display: string } | { ok: false; error: string };

export function validatePhone(input: string): PhoneValidation {
  const d = toNationalDigits(input);
  if (!d) return { ok: false, error: 'Informe seu WhatsApp com DDD.' };
  if (d.length < 10) return { ok: false, error: 'Número incompleto. Inclua o DDD, ex.: (15) 99999-9999.' };
  if (!VALID_DDDS.has(Number(d.slice(0, 2)))) return { ok: false, error: 'Esse DDD não existe. Confira o número.' };
  const number = d.slice(2);
  if (number.length === 9 && number[0] !== '9') return { ok: false, error: 'Celulares começam com 9 depois do DDD.' };
  if (number.length === 8 && !/[2-5]/.test(number[0])) {
    return { ok: false, error: 'Para celular, inclua o 9 na frente do número.' };
  }
  return { ok: true, normalized: `55${d}`, display: maskPhone(d) };
}

/** Exibição a partir do número normalizado: +55 (15) 99811-0938 */
export function formatNormalizedPhone(normalized: string): string {
  return `+55 ${maskPhone(normalized)}`;
}
