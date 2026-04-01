import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useListSessions } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function History() {
  const { data: sessions, isLoading, isError } = useListSessions();

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
          <span className="text-sm text-muted-foreground">History</span>
        </header>

        <div className="space-y-2 mb-10">
          <h1 className="text-2xl text-foreground font-medium">Session history</h1>
          <p className="text-sm text-muted-foreground">
            Tap a session to read it again.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner message="Loading..." />
          </div>
        ) : isError ? (
          <div className="border border-destructive/30 rounded-xl p-6 text-center">
            <p className="text-sm text-destructive/80">
              Something went wrong loading your history.
            </p>
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border/50 rounded-xl p-12 text-center"
          >
            <p className="text-sm text-muted-foreground font-medium">No sessions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Start a conversation. It will appear here.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {[...sessions].reverse().map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link href={`/history/${session.id}`}>
                  <div
                    className="
                      border border-border/50 rounded-xl p-5 bg-card/60 space-y-3
                      cursor-pointer select-none
                      transition-all duration-150
                      hover:border-border hover:bg-card hover:shadow-sm
                      active:scale-[0.99] active:bg-muted/30
                    "
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 ${
                            session.timerCompleted ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        />
                        <span className="text-sm text-foreground leading-snug truncate">
                          {session.ruminationThought}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`text-xs border px-2.5 py-1 rounded-full ${
                            session.timerCompleted
                              ? "border-primary/30 text-primary/70"
                              : "border-border/60 text-muted-foreground"
                          }`}
                        >
                          {session.timerCompleted ? "Complete" : "Partial"}
                        </span>
                        <span className="text-muted-foreground/30 text-sm leading-none">›</span>
                      </div>
                    </div>

                    {session.aiResponse && (
                      <p className="text-xs text-muted-foreground pl-4 border-l border-border/40 leading-relaxed line-clamp-2">
                        {session.aiResponse}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground/40">
                      {format(parseISO(session.createdAt), "MMM d, yyyy · HH:mm")}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
