import { Link, useParams } from "wouter";
import { format, parseISO } from "date-fns";
import { useListSessions } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function SessionDetail() {
  const params = useParams<{ id: string }>();
  const sessionId = Number(params.id);

  const { data: sessions, isLoading, isError } = useListSessions();

  const session = sessions?.find((s) => s.id === sessionId);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      <main className="w-full max-w-lg px-6 py-10">
        <header className="flex items-center justify-between mb-12">
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← History
          </Link>
          {session && (
            <p className="text-xs text-muted-foreground/50">
              {format(parseISO(session.createdAt), "MMM d, yyyy · HH:mm")}
            </p>
          )}
        </header>

        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner message="Loading..." />
          </div>
        ) : isError ? (
          <div className="border border-destructive/30 rounded-xl p-6 text-center">
            <p className="text-sm text-destructive/80">
              Something went wrong loading this session.
            </p>
          </div>
        ) : !session ? (
          <div className="border border-border/50 rounded-xl p-12 text-center">
            <p className="text-sm text-muted-foreground font-medium">Moment not found</p>
            <Link href="/history" className="text-xs text-muted-foreground/60 mt-3 block hover:text-foreground transition-colors">
              Back to history
            </Link>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {session.aiResponse ? (
              <>
                <div className="rounded-xl bg-primary/8 border border-primary/20 p-6">
                  <p className="text-sm text-foreground leading-[1.75] whitespace-pre-line">
                    {session.aiResponse}
                  </p>
                </div>

                <div className="space-y-1.5 pl-1">
                  <p className="text-xs text-muted-foreground/50 font-medium tracking-wide uppercase">
                    What you brought in
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {session.ruminationThought}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5 pl-1">
                  <p className="text-xs text-muted-foreground/50 font-medium tracking-wide uppercase">
                    What you brought in
                  </p>
                  <p className="text-base text-foreground leading-relaxed">
                    {session.ruminationThought}
                  </p>
                </div>

                <div className="rounded-xl border border-border/30 p-5">
                  <p className="text-sm text-muted-foreground/55 leading-relaxed">
                    This session ended before an insight was reached.
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center gap-2 pl-1">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  session.timerCompleted ? "bg-primary/50" : "bg-muted-foreground/25"
                }`}
              />
              <p className="text-xs text-muted-foreground/40">
                {session.timerCompleted ? "Completed" : "Partial"}
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
