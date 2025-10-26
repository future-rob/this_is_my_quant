import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const RESULTS_DIR = path.join(process.cwd(), "../analysis-results");

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

function loadRecentAnalyses(limit = 25) {
  if (!fs.existsSync(RESULTS_DIR)) return [];
  const files = fs
    .readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, limit);
  return files
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), "utf-8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const SYSTEM_PROMPT = `You are a quantitative trading analysis assistant.
You are given structured historical multi-timeframe crypto analyses including:
- individualAnalyses (trend, strength, keyLevels, indicators, signals, confidence, analysis)
- tradingDecision (action, reasoning, key levels, warnings)
- finalVerdict (action, confidence, positionSize, keyReason, criticalWarnings, nextCheckMinutes)
Respond with concise, actionable answers. If user asks for data, cite timeframe(s). If asked to compare periods, look at trend/strength changes across snapshots (ordered by timestamp ascending). If risk or confidence unclear, explain factors.
Return markdown; keep paragraphs short.`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const { messages } = req.body as { messages: ChatMessage[] };
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured" });
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const analyses = loadRecentAnalyses();
  const slim = analyses.map((a: any) => ({
    timestamp: a.timestamp,
    final: {
      action: a.finalVerdict?.action,
      confidence: a.finalVerdict?.confidence,
      positionSize: a.finalVerdict?.positionSize,
      risk: a.finalVerdict?.riskLevel,
      nextCheckMinutes: a.finalVerdict?.nextCheckMinutes,
      keyReason: a.finalVerdict?.keyReason,
    },
    metrics: {}, // Comprehensive analysis removed - metrics calculated from individual analyses
    timeframes: (a.analysisData?.individualAnalyses || []).map((t: any) => ({
      timeframe: t.timeframe,
      trend: t.trend,
      strength: t.strength,
      confidence: t.confidence,
      support: t.keyLevels?.support,
      resistance: t.keyLevels?.resistance,
      signals: t.signals,
    })),
  }));

  const userContextMessage: ChatMessage = {
    role: "system",
    content: "DATA:\n" + JSON.stringify(slim).slice(0, 12000), // limit size
  };

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        userContextMessage,
        ...messages,
      ],
      temperature: 0.25,
      max_tokens: 800,
    });
    const answer = completion.choices[0]?.message?.content || "No answer.";
    res.status(200).json({ answer });
  } catch (e: any) {
    console.error(e);
    res
      .status(500)
      .json({ error: "OpenAI request failed", details: e.message });
  }
}
