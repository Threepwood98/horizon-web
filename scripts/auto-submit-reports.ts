import "dotenv/config";

import { autoSubmitOverdueReports } from "../src/lib/report-auto-submission.ts";
import { db } from "../src/lib/db.ts";

try {
  const result = await autoSubmitOverdueReports();
  console.log(
    `Automatic report submission complete: ${result.submittedCount} draft(s) sent before ${result.businessDate}.`,
  );
} finally {
  await db.$disconnect();
}
