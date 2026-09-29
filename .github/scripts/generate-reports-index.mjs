import { prepareReportSite } from '../../src/services/reportSite.mjs';

prepareReportSite().catch(error => { console.error(error); process.exitCode = 1; });
