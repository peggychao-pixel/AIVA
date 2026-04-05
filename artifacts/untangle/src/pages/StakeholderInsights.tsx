import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface InsightEntry {
  id: string;
  source: string;
  date: string;
  sourceType: string;
  struggle: string;
  pattern: string;
  severity: string;
  notes: string;
  tags: string;
  createdAt: string;
}

const STORAGE_KEY = "untangle_stakeholder_insights";

const SEVERITY_OPTIONS = [
  { value: "uncertain", label: "Uncertain" },
  { value: "mild", label: "Mild — present but manageable" },
  { value: "moderate", label: "Moderate — affecting daily life" },
  { value: "significant", label: "Significant — hard to talk about" },
  { value: "acute", label: "Acute — causing real distress" },
];

const SOURCE_TYPE_OPTIONS = [
  "User in session",
  "User interview",
  "Reddit / online forum",
  "Therapist or clinician",
  "Personal conversation",
  "Article or research",
  "Podcast or media",
  "Anonymous feedback",
  "Other",
];

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadEntries(): InsightEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: InsightEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

const emptyForm = (): Omit<InsightEntry, "id" | "createdAt"> => ({
  source: "",
  date: format(new Date(), "yyyy-MM-dd"),
  sourceType: "",
  struggle: "",
  pattern: "",
  severity: "uncertain",
  notes: "",
  tags: "",
});

function SeverityDot({ severity }: { severity: string }) {
  const colorMap: Record<string, string> = {
    uncertain: "bg-muted-foreground/30",
    mild: "bg-sage-400/60",
    moderate: "bg-amber-400/70",
    significant: "bg-orange-400/80",
    acute: "bg-red-400/80",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${colorMap[severity] ?? "bg-muted-foreground/30"}`}
    />
  );
}

function EntryCard({
  entry,
  onDelete,
}: {
  entry: InsightEntry;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tags = entry.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="border border-border/50 rounded-xl overflow-hidden bg-card"
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-muted/30 transition-colors"
      >
        <SeverityDot severity={entry.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">
              {entry.source || "Unnamed source"}
            </span>
            {entry.sourceType && (
              <span className="text-xs text-muted-foreground/70 bg-muted/50 rounded-full px-2 py-0.5">
                {entry.sourceType}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{entry.date}</p>
          {entry.struggle && (
            <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2 leading-relaxed">
              {entry.struggle}
            </p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-muted-foreground/60 border border-border/40 rounded-full px-1.5 py-px"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-muted-foreground/40 text-xs mt-0.5 flex-shrink-0">
          {expanded ? "↑" : "↓"}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-border/30 pt-4">
              {entry.struggle && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">
                    Struggle described
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {entry.struggle}
                  </p>
                </div>
              )}
              {entry.pattern && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">
                    Pattern observed
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {entry.pattern}
                  </p>
                </div>
              )}
              {entry.severity && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">
                    How serious
                  </p>
                  <p className="text-sm text-foreground/80">
                    {SEVERITY_OPTIONS.find((s) => s.value === entry.severity)?.label ?? entry.severity}
                  </p>
                </div>
              )}
              {entry.notes && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {entry.notes}
                  </p>
                </div>
              )}
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => onDelete(entry.id)}
                  className="text-xs text-muted-foreground/40 hover:text-destructive/60 transition-colors"
                >
                  Remove entry
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function StakeholderInsights() {
  const [entries, setEntries] = useState<InsightEntry[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entry: InsightEntry = {
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveEntries(updated);
    setForm(emptyForm());
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleDelete(id: string) {
    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
  }

  function openForm() {
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

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
          <span className="text-sm text-muted-foreground">Research</span>
        </header>

        <div className="space-y-2 mb-8">
          <h1 className="text-2xl text-foreground font-medium">Stakeholder Insights</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Research notes on eating-related rumination, hidden struggles, and patterns people rarely say out loud.
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-muted-foreground/60">
            {entries.length === 0
              ? "No entries yet"
              : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
          </p>
          <button
            onClick={openForm}
            className="text-sm text-foreground/70 hover:text-foreground border border-border/60 hover:border-border rounded-lg px-3 py-1.5 transition-all"
          >
            + Add entry
          </button>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground text-center"
            >
              Entry saved.
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showForm && (
            <motion.div
              ref={formRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mb-8 border border-border/50 rounded-2xl bg-card p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-medium text-foreground">New entry</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground/70 tracking-wide">Source</label>
                    <input
                      name="source"
                      value={form.source}
                      onChange={handleChange}
                      placeholder="e.g. Session user, Reddit"
                      className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-border transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground/70 tracking-wide">Date</label>
                    <input
                      name="date"
                      type="date"
                      value={form.date}
                      onChange={handleChange}
                      className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-border transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground/70 tracking-wide">What kind of person or source</label>
                  <select
                    name="sourceType"
                    value={form.sourceType}
                    onChange={handleChange}
                    className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-border transition-colors appearance-none"
                  >
                    <option value="">Select…</option>
                    {SOURCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground/70 tracking-wide">Struggle or concern described</label>
                  <textarea
                    name="struggle"
                    value={form.struggle}
                    onChange={handleChange}
                    rows={3}
                    placeholder="What did they describe? What were they stuck on?"
                    className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-border transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground/70 tracking-wide">What pattern seems common here</label>
                  <textarea
                    name="pattern"
                    value={form.pattern}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Any recognizable loop, theme, or recurring structure?"
                    className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-border transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground/70 tracking-wide">How serious does this seem</label>
                  <select
                    name="severity"
                    value={form.severity}
                    onChange={handleChange}
                    className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-border transition-colors appearance-none"
                  >
                    {SEVERITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground/70 tracking-wide">Notes</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Anything else worth keeping"
                    className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-border transition-colors resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground/70 tracking-wide">Tags <span className="text-muted-foreground/40">(comma-separated)</span></label>
                  <input
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    placeholder="e.g. before eating, self-judgment, anticipatory"
                    className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-border transition-colors"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="text-sm text-foreground/80 hover:text-foreground bg-muted/40 hover:bg-muted/70 border border-border/40 rounded-lg px-5 py-2 transition-all"
                  >
                    Save entry
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border border-border/40 rounded-xl p-12 text-center space-y-2"
          >
            <p className="text-sm text-muted-foreground font-medium">Nothing recorded yet</p>
            <p className="text-xs text-muted-foreground/50 leading-relaxed">
              Add an entry when something comes up worth tracking.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence>
              {entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-16 pt-8 border-t border-border/20 text-center">
          <p className="text-xs text-muted-foreground/30">
            Stored locally. Not synced or shared.
          </p>
        </div>
      </main>
    </div>
  );
}
