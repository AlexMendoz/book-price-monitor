import { buildReports } from '../services/buildReportsService';
import { withJobLock } from '../services/jobLock';
withJobLock(buildReports).catch(error => { console.error(error); process.exitCode = 1; });
