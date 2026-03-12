import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { ArrowLeft, CheckCircle2, Circle, SearchX } from "lucide-react";
import { useListSessions } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function History() {
  const { data: sessions, isLoading, isError } = useListSessions();

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

      <main className="relative z-10 w-full max-w-3xl px-6 py-12 md:py-20">
        
        <header className="flex items-center justify-between mb-12">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-full hover:bg-black/5"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back Home</span>
          </Link>
        </header>

        <div className="mb-10">
          <h1 className="font-serif text-5xl text-foreground mb-4">Your Journey</h1>
          <p className="text-lg text-muted-foreground">
            A record of the moments you chose to pause and untangle. Every entry is a step forward.
          </p>
        </div>

        {isLoading ? (
          <div className="py-24">
            <LoadingSpinner message="Loading your history..." />
          </div>
        ) : isError ? (
          <div className="glass-card rounded-3xl p-12 text-center text-destructive">
            <p className="text-lg font-medium">Failed to load history. Please try again later.</p>
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-16 flex flex-col items-center text-center mt-12"
          >
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-6">
              <SearchX className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-serif text-3xl text-foreground mb-3">No sessions yet</h3>
            <p className="text-muted-foreground max-w-sm">
              When you complete a 30-minute pause, it will appear here as a testament to your practice.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row gap-6 sm:items-center hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex-shrink-0 flex items-center gap-4 sm:flex-col sm:items-start sm:gap-2 sm:w-32 border-b sm:border-b-0 sm:border-r border-border/50 pb-4 sm:pb-0 pr-4">
                  {session.timerCompleted ? (
                    <div className="flex items-center gap-2 text-primary font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="sm:hidden">Completed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Circle className="w-5 h-5" />
                      <span className="sm:hidden">Incomplete</span>
                    </div>
                  )}
                  <div className="text-sm font-semibold text-foreground/80 sm:mt-2">
                    {format(parseISO(session.createdAt), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(session.createdAt), "h:mm a")}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Thought</span>
                    <p className="font-medium text-lg text-foreground mt-0.5">"{session.ruminationThought}"</p>
                  </div>
                  
                  {session.aiResponse && (
                    <div className="bg-secondary/30 p-4 rounded-xl">
                      <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Insight</span>
                      <p className="text-sm text-foreground/80 italic mt-1 line-clamp-2">
                        {session.aiResponse}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
