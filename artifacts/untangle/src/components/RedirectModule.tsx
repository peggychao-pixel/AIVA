import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { getRandomActivities } from "../lib/activities";
import { ReactionGame } from "./ReactionGame";

export function RedirectModule() {
  const activities = useMemo(() => getRandomActivities(3), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest px-1 mb-3">
        — REDIRECT OPTIONS —
      </p>

      {activities.map((activity, index) => {
        const isExpanded = expandedId === activity.id;
        const isGame = activity.id === "reaction-test";

        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={`border rounded transition-colors duration-200 ${
              isExpanded ? "border-primary/40 bg-card" : "border-border bg-card/50 hover:border-border/80"
            }`}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : activity.id)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-primary border border-primary/40 px-1.5 py-0.5 rounded tracking-widest">
                  {activity.tag}
                </span>
                <span className="font-mono text-sm text-foreground">{activity.title}</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 space-y-4">
                    <p className="text-sm text-muted-foreground">{activity.description}</p>

                    {isGame ? (
                      <ReactionGame />
                    ) : (
                      <ol className="space-y-2">
                        {activity.steps.map((step, idx) => (
                          <li key={idx} className="flex gap-3 text-sm">
                            <span className="font-mono text-xs text-primary flex-shrink-0 mt-0.5">
                              {String(idx + 1).padStart(2, "0")}.
                            </span>
                            <span className="text-foreground/80">{step}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
