import { WISHLISTS } from './config/wishlists';
import { scraperOptionsFromEnv } from './config/scraperOptions';
import { syncWishlists } from './services/wishlistSyncService';
import { withJobLock } from './services/jobLock';
withJobLock(() => syncWishlists(WISHLISTS, scraperOptionsFromEnv()))
  .then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
