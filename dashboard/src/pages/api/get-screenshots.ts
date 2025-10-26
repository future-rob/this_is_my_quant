import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = path.join(process.cwd(), "../screenshots");

interface ScreenshotMeta {
  fileName: string;
  mtime: string;
  timeframe?: string;
  cropped: boolean;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
      return res.status(200).json({ screenshots: [] });
    }
    const files = fs
      .readdirSync(SCREENSHOTS_DIR)
      .filter((f) => /(png|jpg|jpeg)$/i.test(f));
    const screenshots: ScreenshotMeta[] = files
      .map((f) => {
        const stat = fs.statSync(path.join(SCREENSHOTS_DIR, f));
        const match = f.match(/jupiter-(.*?)(-cropped)?\.(png|jpg|jpeg)$/i);
        const timeframe = match ? match[1] : undefined;
        const cropped = /-cropped\.(png|jpg|jpeg)$/i.test(f);
        return {
          fileName: f,
          mtime: stat.mtime.toISOString(),
          timeframe,
          cropped,
        };
      })
      .sort((a, b) => b.mtime.localeCompare(a.mtime));

    res.status(200).json({ screenshots });
  } catch (e) {
    console.error("Error reading screenshots", e);
    res.status(500).json({ error: "Failed to read screenshots" });
  }
}
