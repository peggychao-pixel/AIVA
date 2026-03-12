import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import confetti from "canvas-confetti";
import { ArrowLeft, Clock, History } from "lucide-react";
import { useCreateSession, useGetAiResponse, useUpdateSession } from "@workspace/api-client-react";

import { Timer } from "../components/Timer";
import { DopamineRedirect } from "../components/DopamineRedirect";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

type FlowStep = "home" | "thought" | "loading" | "active" | "complete";

const THOUGHT_OPTIONS = [
  "I chose the wrong food",
  "The portion was too big",
  "I want to keep eating",
  "I'm bored",
  "Something else"
];

export function SessionFlow() {
  const [step, setStep] = useState<FlowStep>("home");
  const [selectedThought, setSelectedThought] = useState<string>("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [aiMessage, setAiMessage] = useState<string>("");

  const { mutateAsync: fetchAiResponse } = useGetAiResponse();
  const { mutateAsync: createSession } = useCreateSession();
  const { mutateAsync: updateSession } = useUpdateSession();

  const handleStart = () => {
    setStep("thought");
  };

  const handleThoughtSubmit = async () => {
    if (!selectedThought) return;
    
    setStep("loading");
    try {
      // Fetch AI coaching message
      const aiRes = await fetchAiResponse({ data: { thought: selectedThought } });
      
      // Create DB session
      const sessionRes = await createSession({ 
        data: { 
          ruminationThought: selectedThought, 
          aiResponse: aiRes.message 
        }
      });
      
      setSessionId(sessionRes.id);
      setAiMessage(aiRes.message);
      setStep("active");
    } catch (error) {
      console.error("Failed to start session:", error);
      // Fallback for demo/resilience
      setAiMessage("Take a deep breath. Your body knows how to handle this. Let's redirect your energy for the next 30 minutes.");
      setStep("active");
    }
  };

  const handleTimerComplete = async () => {
    // Celebrate
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#D4A373', '#A3B18A', '#EAE0D5']
    });

    setStep("complete");
    
    if (sessionId) {
      try {
        await updateSession({ 
          id: sessionId, 
          data: { timerCompleted: true } 
        });
      } catch (err) {
        console.error("Failed to update session completion", err);
      }
    }
  };

  const resetFlow = () => {
    setStep("home");
    setSelectedThought("");
    setSessionId(null);
    setAiMessage("");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden flex flex-col items-center">
      {/* Background Image/Gradient */}
      <div className="fixed inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/wellness-bg.png`}
          alt="" 
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-background/40 backdrop-blur-[100px]"></div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 w-full max-w-2xl px-6 py-12 md:py-24 flex flex-col">
        
        {/* Header / Nav */}
        <header className="flex justify-between items-center mb-12 w-full">
          {(step !== 'home' && step !== 'loading') ? (
            <button 
              onClick={resetFlow}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-black/5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">End Session</span>
            </button>
          ) : (
            <div /> // Spacer
          )}
          
          <Link 
            href="/history" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-full hover:bg-black/5"
          >
            <History className="w-4 h-4" />
            <span className="text-sm font-medium">History</span>
          </Link>
        </header>

        <div className="flex-1 flex flex-col justify-center w-full">
          <AnimatePresence mode="wait">
            
            {/* STEP: HOME */}
            {step === "home" && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center text-center space-y-12"
              >
                <div className="space-y-4">
                  <h1 className="font-serif text-6xl md:text-7xl text-foreground">Untangle.</h1>
                  <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto">
                    A gentle space to pause, breathe, and redirect your post-meal thoughts.
                  </p>
                </div>
                
                <button
                  onClick={handleStart}
                  className="
                    relative group px-10 py-6 rounded-full font-serif text-3xl
                    bg-primary text-primary-foreground shadow-glow
                    hover:-translate-y-1 hover:shadow-[0_0_50px_-10px_hsl(24_45%_60%_/_0.5)]
                    active:translate-y-0 active:scale-95
                    transition-all duration-300 ease-out
                  "
                >
                  I finished eating
                </button>
              </motion.div>
            )}

            {/* STEP: THOUGHT SELECTION */}
            {step === "thought" && (
              <motion.div
                key="thought"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full space-y-8"
              >
                <div className="text-center space-y-3 mb-10">
                  <h2 className="font-serif text-4xl text-foreground">What thought is looping right now?</h2>
                  <p className="text-muted-foreground">Select the one that feels most true, without judgment.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {THOUGHT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSelectedThought(opt)}
                      className={`
                        p-6 rounded-2xl text-left transition-all duration-200 border-2
                        ${selectedThought === opt 
                          ? 'bg-primary/5 border-primary shadow-md scale-[1.02]' 
                          : 'glass-card border-transparent hover:border-primary/30 hover:scale-[1.01]'}
                      `}
                    >
                      <span className={`font-medium text-lg ${selectedThought === opt ? 'text-primary' : 'text-foreground/80'}`}>
                        {opt}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-12 flex justify-center h-16">
                  <AnimatePresence>
                    {selectedThought && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onClick={handleThoughtSubmit}
                        className="
                          px-10 py-4 rounded-full font-semibold text-lg
                          bg-foreground text-background shadow-lg
                          hover:bg-foreground/90 hover:-translate-y-0.5
                          transition-all duration-200
                        "
                      >
                        Continue
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* STEP: LOADING */}
            {step === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center my-auto"
              >
                <LoadingSpinner message="Untangling your thoughts..." />
              </motion.div>
            )}

            {/* STEP: ACTIVE (TIMER) */}
            {step === "active" && (
              <motion.div
                key="active"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full flex flex-col items-center space-y-12 pb-24"
              >
                {/* AI Coaching Card */}
                <div className="glass-card w-full p-8 md:p-10 rounded-[2rem] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-primary/60" />
                  <p className="font-serif text-2xl md:text-3xl leading-relaxed text-foreground text-center italic">
                    "{aiMessage}"
                  </p>
                </div>

                {/* The Timer */}
                <div className="w-full pt-6">
                  <Timer initialSeconds={1800} onComplete={handleTimerComplete} />
                </div>

                {/* The Distraction / Redirect Activities */}
                <DopamineRedirect />
                
              </motion.div>
            )}

            {/* STEP: COMPLETE */}
            {step === "complete" && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center space-y-8 my-auto"
              >
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-12 h-12 text-primary" />
                </div>
                <h2 className="font-serif text-5xl text-foreground">You did it.</h2>
                <p className="text-xl text-muted-foreground max-w-md">
                  30 minutes have passed. Notice how your body feels now compared to when you started. The urgency has likely faded.
                </p>
                <button
                  onClick={resetFlow}
                  className="
                    mt-8 px-8 py-4 rounded-full font-semibold
                    bg-foreground text-background shadow-lg
                    hover:bg-foreground/90 hover:-translate-y-0.5
                    transition-all duration-200
                  "
                >
                  Return Home
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
