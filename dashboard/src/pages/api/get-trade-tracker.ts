import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // trade-tracker.json lives in root repo analysis-results
    // dashboard/. -> parent directory is project root
    const filePath = path.join(
      process.cwd(),
      "..",
      "analysis-results",
      "trade-tracker.json"
    );
    if (!fs.existsSync(filePath)) {
      return res.status(200).json({ success: true, store: null });
    }
    const raw = fs.readFileSync(filePath, "utf8");
    const store = JSON.parse(raw);
    return res.status(200).json({ success: true, store });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
