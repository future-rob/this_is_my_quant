import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = path.join(process.cwd(), "../screenshots");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { name } = req.query;
    if (!name || Array.isArray(name)) return res.status(400).end("Bad request");
    const filePath = path.join(SCREENSHOTS_DIR, name);
    if (!fs.existsSync(filePath)) return res.status(404).end("Not found");
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : "application/octet-stream";
    res.setHeader("Content-Type", mime);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.status(500).end("Server error");
  }
}
