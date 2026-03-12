import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useListMoments } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function Moments() {
  const { data: moments, isLoading, isError } = useListMoments();

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
          <Link
            href="/history"
            className="font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            SESSION LOG
          </Link>
        </header>

        <div className="space-y-2 mb-10">
          <p className="font-mono text-xs text-primary uppercase tracking-[0.25em]">
            ✦ UNTANGLE MOMENTS
          </p>
          <h1 className="font-mono text-3xl text-foreground font-bold">Saved insights.</h1>
          <p className="font-mono text-xs text-muted-foreground">
            Moments where something clicked. Saved from your conversations.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner message="LOADING MOMENTS..." />
          </div>
        ) : isError ? (
          <div className="border border-destructive/40 rounded p-6 text-center">
            <p className="font-mono text-xs text-destructive uppercase tracking-widest">
              ERROR: FAILED TO RETRIEVE MOMENTS
            </p>
          </div>
        ) : !moments || moments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border rounded p-12 text-center space-y-2"
          >
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              NO MOMENTS SAVED
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              When an insight lands, tap "Save" during a conversation.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {moments.map((moment, index) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-primary/30 bg-primary/5 rounded p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-[10px] text-primary uppercase tracking-[0.2em]">
                    ✦ UNTANGLE MOMENT
                  </span>
                  {moment.loopType && (
                    <span className="font-mono text-[9px] text-muted-foreground border border-border px-1.5 py-0.5 rounded uppercase tracking-widest flex-shrink-0">
                      {moment.loopType}
                    </span>
                  )}
                </div>

                <p className="font-mono text-sm text-foreground leading-relaxed">
                  {moment.content}
                </p>

                <p className="font-mono text-[10px] text-muted-foreground/50 uppercase tracking-widest">
                  {format(parseISO(moment.createdAt), "MMM d, yyyy · HH:mm")}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
