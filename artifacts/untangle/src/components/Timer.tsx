import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TimerProps {
  initialSeconds?: number;
  onComplete: () => void;
}

export function Timer({ initialSeconds = 1800, onComplete }: TimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsActive(false);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, onComplete]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const progressPercent = ((initialSeconds - secondsLeft) / initialSeconds) * 100;

  return (
    <div className="w-full space-y-3">
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-border overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ ease: "linear", duration: 1 }}
          style={{ boxShadow: "0 0 8px hsl(168 80% 52% / 0.7)" }}
        />
      </div>

      {/* Time + label */}
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
          {secondsLeft > 0 ? "WINDOW ACTIVE" : "WINDOW CLOSED"}
        </span>
        <span className="font-mono text-lg tabular-nums text-foreground">
          {formattedTime}
        </span>
      </div>
    </div>
  );
}
