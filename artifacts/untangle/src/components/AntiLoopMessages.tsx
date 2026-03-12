import { useState, useEffect } from "react";

const MESSAGES = [
  "Replay is not progress.",
  "The event is over.",
  "You are reviewing a closed file.",
  "No improved outcome exists inside this loop.",
  "This is a boredom window, not a decision window.",
  "Optimization attempt rejected.",
  "Current objective: outlast the loop.",
  "Your brain wants stimulation, not more analysis.",
  "Reopening this will not produce a better ending.",
  "Decision locked. No alternate timeline available.",
  "The loop is the problem, not the meal.",
  "Analysis has expired.",
  "Nothing to fix here.",
  "Idle processing detected. Redirect required.",
  "The review process is now closed.",
  "Post-event optimization: not useful right now.",
];

export function AntiLoopMessages() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border border-border/60 rounded px-4 py-3 bg-card/60">
      <p
        className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2"
      >
        SYSTEM MESSAGE
      </p>
      <p
        className="font-mono text-sm text-primary transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {MESSAGES[index]}
      </p>
    </div>
  );
}
