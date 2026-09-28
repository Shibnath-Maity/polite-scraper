import fs from "node:fs/promises";
import path from "node:path";

export async function writeRunReport(stats) {
  const outDir = path.join(process.cwd(), "output");
  await fs.mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, "run-report.json");
  await fs.writeFile(reportPath, JSON.stringify(stats, null, 2), "utf-8");
  return reportPath;
}