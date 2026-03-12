import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useListSessions } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function History() {
  const { data: sessions, isLoading, isError } = useListSessions();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <main className="w-full max-w-xl px-6 py-10">

        <header className="flex items-center justify-between mb-12">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            ← BACK
          </Link>
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            SESSION LOG
          </span>
        </header>

        <div className="space-y-2 mb-10">
          <p className="font-mono text-xs text-primary uppercase tracking-[0.25em]">UNTANGLE / LOG</p>
          <h1 className="font-mono text-3xl text-foreground font-bold">Interrupt history.</h1>
          <p className="font-mono text-xs text-muted-foreground">
            Every session logged. Loop frequency is the metric that matters.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner message="LOADING LOG..." />
          </div>
        ) : isError ? (
          <div className="border border-destructive/40 rounded p-6 text-center">
            <p className="font-mono text-xs text-destructive uppercase tracking-widest">ERROR: FAILED TO RETRIEVE LOG</p>
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border rounded p-12 text-center"
          >
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">NO ENTRIES</p>
            <p className="font-mono text-xs text-muted-foreground mt-2">
              Complete a session. It will appear here.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {[...sessions].reverse().map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="border border-border rounded p-4 bg-card/60 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        session.timerCompleted ? "bg-primary" : "bg-muted-foreground/40"
                      }`}
                    />
                    <span className="font-mono text-sm text-foreground">{session.ruminationThought}</span>
                  </div>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-widest border px-1.5 py-0.5 rounded flex-shrink-0 ${
                      session.timerCompleted
                        ? "border-primary/40 text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {session.timerCompleted ? "COMPLETED" : "PARTIAL"}
                  </span>
                </div>

                {session.aiResponse && (
                  <p className="font-mono text-xs text-muted-foreground pl-3.5 border-l border-border line-clamp-2">
                    {session.aiResponse}
                  </p>
                )}

                <p className="font-mono text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                  {format(parseISO(session.createdAt), "MMM d, yyyy · HH:mm")}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
