/** Email-аккаунты с обходом лимита «один пак в сутки» (только клиент; не секрет). */
const BYPASS_EMAILS = new Set(["ya.tsuxomlinov@yandex.ru".toLowerCase()]);

export function canBypassDailyBlisterLimit(email: string | null | undefined): boolean {
  if (!email) return false;
  return BYPASS_EMAILS.has(email.trim().toLowerCase());
}
