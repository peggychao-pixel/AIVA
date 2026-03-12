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
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = ((initialSeconds - secondsLeft) / initialSeconds) * 100;

  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-md mx-auto">
      {/* Time Display */}
      <div className="relative flex items-center justify-center">
        {/* Soft glowing aura behind the timer */}
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-150 animate-breathe" />
        
        <motion.div 
          className="relative z-10 glass-panel w-48 h-48 rounded-full flex flex-col items-center justify-center shadow-soft border-white/60"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
        >
          <span className="font-serif text-5xl text-foreground tracking-tighter tabular-nums">
            {formattedTime}
          </span>
          <span className="text-sm font-medium text-muted-foreground mt-2 uppercase tracking-widest">
            {secondsLeft > 0 ? "Remaining" : "Complete"}
          </span>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="w-full space-y-2">
        <div className="h-3 w-full bg-secondary/50 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full relative"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "linear", duration: 1 }}
          >
            {/* Shimmer effect on the progress bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-[200%] animate-[shimmer_2s_infinite]" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
