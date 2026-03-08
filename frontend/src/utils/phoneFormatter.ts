export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }

  if (cleaned.startsWith('0')) {
    return '+421' + cleaned.slice(1);
  }

  return '+' + cleaned;
}

export function displayPhone(phone: string | null): string {
  if (!phone) return '—';
  return phone;
}
