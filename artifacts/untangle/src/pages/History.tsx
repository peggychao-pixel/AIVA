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
          <h1 className="text-2xl text-foreground font-medium">Past moments</h1>
          <p className="text-sm text-muted-foreground">
            Tap a moment to revisit it.
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
            <p className="text-sm text-muted-foreground font-medium">Nothing here yet</p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Start a session. It will appear here.
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
                  {session.aiResponse ? (
                    <div
                      className="
                        border border-border/50 rounded-xl p-5 bg-card/60
                        cursor-pointer select-none
                        transition-all duration-150
                        hover:border-border hover:bg-card hover:shadow-sm
                        active:scale-[0.99] active:bg-muted/30
                      "
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-foreground leading-relaxed line-clamp-3 flex-1">
                          {session.aiResponse}
                        </p>
                        <span className="text-muted-foreground/30 text-sm leading-none flex-shrink-0 mt-0.5">›</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3">
                        <span
                          className={`w-1 h-1 rounded-full flex-shrink-0 ${
                            session.timerCompleted ? "bg-primary/60" : "bg-muted-foreground/25"
                          }`}
                        />
                        <p className="text-xs text-muted-foreground/50 truncate flex-1">
                          {session.ruminationThought}
                        </p>
                        <span className="text-muted-foreground/30 text-xs">·</span>
                        <span className="text-xs text-muted-foreground/40 flex-shrink-0">
                          {format(parseISO(session.createdAt), "MMM d")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="
                        border border-border/30 rounded-xl p-5 bg-card/30
                        cursor-pointer select-none
                        transition-all duration-150
                        hover:border-border/50 hover:bg-card/50
                        active:scale-[0.99]
                      "
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                          {session.ruminationThought}
                        </p>
                        <span className="text-muted-foreground/20 text-sm leading-none flex-shrink-0 mt-0.5">›</span>
                      </div>
                      <p className="text-xs text-muted-foreground/35 mt-3">
                        {format(parseISO(session.createdAt), "MMM d")} · ended before an insight
                      </p>
                    </div>
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
