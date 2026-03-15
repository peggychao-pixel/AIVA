import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import { useListMoments } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";

export function Moments() {
  const { data: moments, isLoading, isError } = useListMoments();

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
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            History
          </Link>
        </header>

        <div className="space-y-2 mb-10">
          <h1 className="text-2xl text-foreground font-medium">Saved moments</h1>
          <p className="text-sm text-muted-foreground">
            Moments where something clicked.
          </p>
        </div>

        {isLoading ? (
          <div className="py-20">
            <LoadingSpinner message="Loading..." />
          </div>
        ) : isError ? (
          <div className="border border-destructive/30 rounded-xl p-6 text-center">
            <p className="text-sm text-destructive/80">
              Something went wrong loading your moments.
            </p>
          </div>
        ) : !moments || moments.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border/50 rounded-xl p-12 text-center space-y-2"
          >
            <p className="text-sm text-muted-foreground font-medium">Nothing saved yet</p>
            <p className="text-xs text-muted-foreground/60">
              When an insight lands, tap "Save this moment" during a conversation.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {moments.map((moment, index) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-border/50 bg-card rounded-xl p-6 space-y-4"
              >
                {/* Loop type badge */}
                {moment.loopType && (
                  <span className="inline-block text-xs text-primary/70 border border-primary/20 bg-primary/8 px-3 py-1 rounded-full">
                    {moment.loopType}
                  </span>
                )}

                {/* Original thought */}
                {moment.originalThought && (
                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                    "{moment.originalThought}"
                  </p>
                )}

                {/* Insight */}
                <p className="text-sm text-foreground leading-relaxed">{moment.content}</p>

                {/* Core need */}
                {moment.coreNeed && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-muted-foreground/50">Core need: </span>
                    {moment.coreNeed}
                  </p>
                )}

                {/* Anchor phrase */}
                {moment.anchorPhrase && (
                  <div className="border-t border-border/40 pt-4 space-y-1">
                    <p className="text-xs text-muted-foreground/50">Anchor phrase</p>
                    <p className="text-sm text-primary font-medium">"{moment.anchorPhrase}"</p>
                  </div>
                )}

                {/* Timestamp */}
                <p className="text-xs text-muted-foreground/40 pt-1">
                  {format(parseISO(moment.createdAt as unknown as string), "MMM d, yyyy · HH:mm")}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
