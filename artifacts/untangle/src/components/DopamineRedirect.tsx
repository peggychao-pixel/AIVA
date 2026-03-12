import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, CheckCircle2 } from "lucide-react";
import { getRandomActivities } from "../lib/activities";

export function DopamineRedirect() {
  const activities = useMemo(() => getRandomActivities(3), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(completedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      setExpandedId(null); // auto close on complete
    }
    setCompletedIds(next);
  };

  return (
    <div className="w-full mt-12 space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-serif text-2xl text-foreground">Shift Your Focus</h3>
      </div>
      
      <div className="grid gap-4">
        {activities.map((activity, index) => {
          const isExpanded = expandedId === activity.id;
          const isCompleted = completedIds.has(activity.id);

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                glass-card rounded-2xl overflow-hidden transition-all duration-300
                ${isExpanded ? 'ring-2 ring-primary/20 shadow-lg' : 'hover:shadow-md'}
                ${isCompleted ? 'opacity-60 bg-muted/50' : ''}
              `}
            >
              <button
                onClick={() => toggleExpand(activity.id)}
                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={(e) => toggleComplete(activity.id, e)}
                    className={`
                      flex-shrink-0 w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center
                      ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30 text-transparent hover:border-primary'}
                    `}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div>
                    <h4 className={`font-semibold text-lg transition-colors ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {activity.title}
                    </h4>
                    {!isExpanded && !isCompleted && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{activity.description}</p>
                    )}
                  </div>
                </div>
                
                <ChevronDown 
                  className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
                />
              </button>

              <AnimatePresence>
                {isExpanded && !isCompleted && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 pt-2 pl-[4.5rem]">
                      <p className="text-foreground/80 mb-4">{activity.description}</p>
                      <ul className="space-y-3">
                        {activity.instructions.map((instruction, idx) => (
                          <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                            <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-foreground flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className="leading-relaxed">{instruction}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
