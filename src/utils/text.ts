/** Remove espaços extras (início, fim e repetidos). */
export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Limpa texto livre: preserva quebras de linha, remove espaços sobrando e limita o tamanho. */
export function cleanMultiline(value: string, max: number): string {
  return value
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

export function validateName(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = collapseSpaces(input);
  if (value.length < 2) return { ok: false, error: 'Conta pra gente seu nome.' };
  if (value.length > 80) return { ok: false, error: 'Use no máximo 80 caracteres.' };
  if (!/\p{L}/u.test(value)) return { ok: false, error: 'Digite um nome válido.' };
  return { ok: true, value };
}

export function firstName(name: string): string {
  return collapseSpaces(name).split(' ')[0] ?? '';
}

/** Identificador aleatório de sessão de agendamento (também usado como id do lead). */
export function newSessionId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
