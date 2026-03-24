export function validateCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const digits = cnpj.split("").map(Number);
  const firstVerifier = calculateVerifier(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondVerifier = calculateVerifier(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return digits[12] === firstVerifier && digits[13] === secondVerifier;
}

function calculateVerifier(baseDigits: number[], weights: number[]): number {
  const sum = baseDigits.reduce((accumulator, digit, index) => {
    const weight = weights[index] ?? 0;
    return accumulator + digit * weight;
  }, 0);
  const remainder = sum % 11;

  return remainder < 2 ? 0 : 11 - remainder;
}
