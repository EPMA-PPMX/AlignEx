export function formatCurrency(value: string | number | null | undefined, includeDecimals: boolean = false): string {
  if (value === null || value === undefined || value === '') return '$0';

  const numericValue = typeof value === 'string'
    ? parseFloat(value.replace(/[^0-9.-]/g, ''))
    : value;

  if (isNaN(numericValue)) return '$0';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(numericValue);
}

export function formatCurrencyInput(value: string): string {
  const numbersAndDecimal = value.replace(/[^0-9.]/g, '');

  if (!numbersAndDecimal) return '';

  const parts = numbersAndDecimal.split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1].slice(0, 2) : '';

  const formattedInteger = parseInt(integerPart || '0', 10).toLocaleString('en-US');

  if (decimalPart || numbersAndDecimal.includes('.')) {
    return `$${formattedInteger}.${decimalPart}`;
  }

  return `$${formattedInteger}`;
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

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not specified';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return value.toLocaleString('en-US');
}
