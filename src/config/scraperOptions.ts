import './loadEnv';
export function scraperOptionsFromEnv() {
  const readBoolean = (name: string, fallback: boolean) => process.env[name] === undefined ? fallback : /^(1|true|yes|on)$/i.test(process.env[name]!);
  const wait = Number(process.env.SCRAPER_WAIT_AFTER_LOAD_MS ?? 3000);
  return { headless: readBoolean('SCRAPER_HEADLESS', true),
    allowManualVerification: readBoolean('SCRAPER_ALLOW_MANUAL_VERIFICATION', false),
    userDataDir: process.env.PLAYWRIGHT_USER_DATA_DIR || './playwright-user-data-job',
    waitAfterLoadMs: Number.isFinite(wait) && wait >= 0 ? wait : 3000 };
}
