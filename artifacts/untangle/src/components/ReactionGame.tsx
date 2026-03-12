import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Target {
  id: number;
  x: number;
  y: number;
  size: number;
  expiresAt: number;
}

type GameState = "idle" | "playing" | "done";

const GAME_DURATION = 30;
const TARGET_LIFETIME_MS = 900;
const SPAWN_INTERVAL_MS = 600;

export function ReactionGame() {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [targets, setTargets] = useState<Target[]>([]);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [bestScore, setBestScore] = useState(0);
  const nextId = useRef(0);
  const fieldRef = useRef<HTMLDivElement>(null);

  const spawnTarget = useCallback(() => {
    const margin = 10;
    const size = Math.floor(Math.random() * 16) + 28; // 28-44px
    const x = margin + Math.random() * (100 - margin * 2);
    const y = margin + Math.random() * (100 - margin * 2);
    const id = nextId.current++;
    setTargets((prev) => [
      ...prev,
      { id, x, y, size, expiresAt: Date.now() + TARGET_LIFETIME_MS },
    ]);
    // Auto-remove expired target
    setTimeout(() => {
      setTargets((prev) => {
        const removed = prev.find((t) => t.id === id);
        if (removed) setMissed((m) => m + 1);
        return prev.filter((t) => t.id !== id);
      });
    }, TARGET_LIFETIME_MS);
  }, []);

  const startGame = () => {
    setScore(0);
    setMissed(0);
    setTimeLeft(GAME_DURATION);
    setTargets([]);
    setGameState("playing");
    nextId.current = 0;
  };

  const hitTarget = (id: number) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
    setScore((s) => s + 1);
  };

  // Countdown
  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameState("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Spawn targets
  useEffect(() => {
    if (gameState !== "playing") return;
    const interval = setInterval(spawnTarget, SPAWN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [gameState, spawnTarget]);

  // Track best
  useEffect(() => {
    if (gameState === "done") {
      setBestScore((b) => Math.max(b, score));
    }
  }, [gameState, score]);

  if (gameState === "idle") {
    return (
      <div className="border border-border rounded p-5 text-center space-y-4">
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">MINI-GAME / REACTION TEST</p>
          <p className="text-sm text-foreground/80">
            30 seconds. Tap targets before they vanish. Your brain cannot ruminate and do this simultaneously.
          </p>
        </div>
        <button
          onClick={startGame}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-mono text-sm uppercase tracking-widest rounded hover:opacity-90 transition-opacity"
        >
          LAUNCH
        </button>
        {bestScore > 0 && (
          <p className="font-mono text-xs text-primary">BEST: {bestScore} TARGETS</p>
        )}
      </div>
    );
  }

  if (gameState === "done") {
    const accuracy = score + missed > 0 ? Math.round((score / (score + missed)) * 100) : 0;
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border border-border rounded p-5 text-center space-y-4"
      >
        <p className="font-mono text-xs text-primary uppercase tracking-widest">ROUND COMPLETE</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="font-mono text-3xl text-foreground">{score}</div>
            <div className="font-mono text-xs text-muted-foreground mt-1">HITS</div>
          </div>
          <div>
            <div className="font-mono text-3xl text-foreground">{missed}</div>
            <div className="font-mono text-xs text-muted-foreground mt-1">MISSED</div>
          </div>
          <div>
            <div className="font-mono text-3xl text-foreground">{accuracy}%</div>
            <div className="font-mono text-xs text-muted-foreground mt-1">ACCURACY</div>
          </div>
        </div>
        {score > bestScore - 1 && score > 0 && (
          <p className="font-mono text-xs text-primary">NEW BEST</p>
        )}
        <button
          onClick={startGame}
          className="px-5 py-2 bg-secondary text-foreground font-mono text-xs uppercase tracking-widest rounded border border-border hover:border-primary/50 transition-colors"
        >
          RUN AGAIN
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {/* HUD */}
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span className="text-primary">{score} HITS</span>
        <span>{timeLeft}s</span>
      </div>

      {/* Game field */}
      <div
        ref={fieldRef}
        className="relative w-full bg-card border border-border rounded overflow-hidden select-none"
        style={{ height: 220 }}
      >
        <AnimatePresence>
          {targets.map((target) => (
            <motion.button
              key={target.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => hitTarget(target.id)}
              className="absolute rounded-full bg-primary border-2 border-primary/60 cursor-pointer focus:outline-none"
              style={{
                width: target.size,
                height: target.size,
                left: `calc(${target.x}% - ${target.size / 2}px)`,
                top: `calc(${target.y}% - ${target.size / 2}px)`,
                boxShadow: "0 0 12px hsl(168 80% 52% / 0.6)",
              }}
            />
          ))}
        </AnimatePresence>
        {/* Hint on first run */}
        {targets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-xs text-muted-foreground/50 uppercase tracking-widest">Targets incoming...</span>
          </div>
        )}
      </div>
    </div>
  );
}
