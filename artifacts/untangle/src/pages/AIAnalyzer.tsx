// AI Insight Analyzer page — /analyze
// Sends user text to /api/analyze (backend) and displays loopType, insight, nextQuestion

import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

interface AnalysisResult {
  loopType: string;
  insight: string;
  nextQuestion: string;
}

const PLACEHOLDER =
  "Paste a stakeholder note, user observation, or description of an eating-related struggle here...";

export function AIAnalyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setResult(data as AnalysisResult);
    } catch {
      setError("Could not reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      void handleAnalyze();
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <main className="w-full max-w-lg px-6 py-10">

        <header className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <span className="text-sm text-muted-foreground">Research</span>
        </header>

        <div className="space-y-2 mb-8">
          <h1 className="text-2xl text-foreground font-medium">AI Insight Analyzer</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Paste a note about an eating-related struggle. Get a pattern read, a short insight, and a next question.
          </p>
        </div>

        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER}
            rows={6}
            className="w-full text-sm bg-card border border-border/50 rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-border transition-colors resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground/40">⌘ + Enter to analyze</p>
            <button
              onClick={() => void handleAnalyze()}
              disabled={loading || !text.trim()}
              className="text-sm text-foreground/80 hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/40 rounded-lg px-5 py-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Reading…" : "Analyze →"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 py-10 flex flex-col items-center gap-3"
            >
              <div className="w-5 h-5 rounded-full border-2 border-border border-t-foreground/40 animate-spin" />
              <p className="text-xs text-muted-foreground/50">Reading the pattern…</p>
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 border border-destructive/30 rounded-xl p-5"
            >
              <p className="text-sm text-destructive/70">{error}</p>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 space-y-px"
            >
              <div className="border border-border/50 rounded-t-xl bg-card px-5 py-4 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
                  Pattern
                </p>
                <p className="text-base font-medium text-foreground">{result.loopType}</p>
              </div>

              <div className="border border-border/50 bg-card px-5 py-4 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
                  Insight
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed">{result.insight}</p>
              </div>

              <div className="border border-border/50 rounded-b-xl bg-card px-5 py-4 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
                  Next question
                </p>
                <p className="text-sm text-foreground/70 leading-relaxed italic">
                  {result.nextQuestion}
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => { setResult(null); setError(null); }}
                  className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-16 pt-8 border-t border-border/20 text-center">
          <p className="text-xs text-muted-foreground/30">
            Analysis is generated by Gemini. Not medical advice.
          </p>
        </div>
      </main>
    </div>
  );
}
