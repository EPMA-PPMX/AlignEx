export function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return '$0';

  const numericValue = typeof value === 'string'
    ? parseFloat(value.replace(/[^0-9.-]/g, ''))
    : value;

  if (isNaN(numericValue)) return '$0';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function parseCurrencyInput(value: string): string {
  const numbersOnly = value.replace(/[^0-9]/g, '');

  if (!numbersOnly) return '';

  const numericValue = parseInt(numbersOnly, 10);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function extractNumericValue(formattedValue: string): number {
  const numericValue = parseFloat(formattedValue.replace(/[^0-9.-]/g, ''));
  return isNaN(numericValue) ? 0 : numericValue;
}
