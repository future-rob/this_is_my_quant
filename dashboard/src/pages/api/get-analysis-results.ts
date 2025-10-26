// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const RESULTS_DIR = path.join(process.cwd(), "../analysis-results");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const files = fs.readdirSync(RESULTS_DIR);

    if (files.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const results = files
      .map((file) => {
        if (!file.endsWith(".json")) {
          return null; // Skip non-JSON files
        }

        const filePath = path.join(RESULTS_DIR, file);

        const content = fs.readFileSync(filePath, "utf-8");
        return {
          fileName: file,
          content: JSON.parse(content),
        };
      })
      .filter((result) => result !== null)
      // sort by date last modified first analysis-2025-09-02T15-17-55.json
      .sort((a, b) => {
        if (!a || !b) return 0;
        const aTime = fs
          .statSync(path.join(RESULTS_DIR, a.fileName))
          .mtime.getTime();
        const bTime = fs
          .statSync(path.join(RESULTS_DIR, b.fileName))
          .mtime.getTime();
        return bTime - aTime;
      });

    res.status(200).json({ results });
  } catch (error) {
    console.error("Error reading analysis results:", error);
    res.status(500).json({ error: "Failed to read analysis results" });
  }
}
