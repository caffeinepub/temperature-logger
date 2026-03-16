import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertCircle,
  CheckCircle2,
  Flame,
  Loader2,
  Plus,
  Thermometer,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "./hooks/useActor";
import {
  useAddTemperature,
  useDeleteTemperature,
  useDeleteTemperatures,
  useGetTemperatures,
} from "./hooks/useQueries";

function getTempColor(temp: number): string {
  if (temp <= 0) return "oklch(0.65 0.15 220)";
  if (temp <= 20) return "oklch(0.72 0.12 160)";
  if (temp <= 35) return "oklch(0.78 0.15 90)";
  if (temp <= 50) return "oklch(0.72 0.17 55)";
  return "oklch(0.65 0.22 25)";
}

function getTempLabel(temp: number): string {
  if (temp <= 0) return "Freezing";
  if (temp <= 10) return "Cold";
  if (temp <= 20) return "Cool";
  if (temp <= 30) return "Warm";
  if (temp <= 40) return "Hot";
  return "Extreme";
}

function formatTimestamp(ns: bigint): string {
  const ms = ns / 1_000_000n;
  return new Date(Number(ms)).toLocaleString();
}

export default function App() {
  const [inputValue, setInputValue] = useState("");
  const [urlSubmitStatus, setUrlSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [urlTemp, setUrlTemp] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const hasProcessedUrl = useRef(false);
  const pendingUrlTemp = useRef<number | null>(null);

  const { actor } = useActor();
  const { data: temperatures, isLoading: tempLoading } = useGetTemperatures();
  const addMutation = useAddTemperature();
  const deleteMutation = useDeleteTemperature();
  const deleteMultiMutation = useDeleteTemperatures();
  const mutateRef = useRef(addMutation.mutate);
  mutateRef.current = addMutation.mutate;

  // Effect 1: Parse URL param on mount and show loading banner
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tempParam = params.get("temp");
    if (tempParam !== null) {
      const parsed = Number.parseInt(tempParam, 10);
      if (!Number.isNaN(parsed)) {
        pendingUrlTemp.current = parsed;
        setUrlTemp(parsed);
        setUrlSubmitStatus("loading");
      }
    }
  }, []);

  // Effect 2: Fire mutation once actor is ready
  useEffect(() => {
    if (!actor) return;
    if (hasProcessedUrl.current) return;
    if (pendingUrlTemp.current === null) return;

    const parsed = pendingUrlTemp.current;
    hasProcessedUrl.current = true;

    mutateRef.current(parsed, {
      onSuccess: () => {
        setUrlSubmitStatus("success");
        toast.success(`Temperature ${parsed}°C logged via URL`);
        history.replaceState({}, "", window.location.pathname);
      },
      onError: () => {
        setUrlSubmitStatus("error");
        toast.error("Failed to log temperature from URL");
      },
    });
  }, [actor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number.parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) {
      toast.error("Please enter a valid integer");
      return;
    }
    addMutation.mutate(parsed, {
      onSuccess: () => {
        toast.success(`${parsed}°C recorded`);
        setInputValue("");
      },
      onError: () => {
        toast.error("Failed to record temperature");
      },
    });
  };

  const sorted = temperatures ? [...temperatures].reverse() : [];
  const totalCount = sorted.length;

  const handleSingleDelete = (originalIndex: number) => {
    setDeletingIndex(originalIndex);
    deleteMutation.mutate(originalIndex, {
      onSuccess: () => {
        setDeletingIndex(null);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(originalIndex);
          return next;
        });
        toast.success("Entry deleted");
      },
      onError: () => {
        setDeletingIndex(null);
        toast.error("Failed to delete entry");
      },
    });
  };

  const handleDeleteSelected = () => {
    const indices = Array.from(selected);
    deleteMultiMutation.mutate(indices, {
      onSuccess: () => {
        setSelected(new Set());
        toast.success(
          `${indices.length} entr${indices.length !== 1 ? "ies" : "y"} deleted`,
        );
      },
      onError: () => {
        toast.error("Failed to delete selected entries");
      },
    });
  };

  const toggleSelect = (originalIndex: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(originalIndex);
      else next.delete(originalIndex);
      return next;
    });
  };

  const allSelected = totalCount > 0 && selected.size === totalCount;
  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(sorted.map((_, i) => totalCount - 1 - i)));
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="relative">
            <Flame className="w-7 h-7 text-primary animate-pulse-glow" />
          </div>
          <div>
            <h1 className="font-display text-xl font-700 tracking-tight text-foreground">
              ThermoLog
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Temperature Data Logger
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded-sm bg-muted text-muted-foreground border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow inline-block" />
              LIVE
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 space-y-8">
        {/* URL Submit Status Banner */}
        <AnimatePresence>
          {urlSubmitStatus === "loading" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 rounded-md bg-muted border border-border"
              data-ocid="temp.loading_state"
            >
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-mono">
                Logging <span className="text-primary">{urlTemp}°C</span> from
                URL…
              </span>
            </motion.div>
          )}
          {urlSubmitStatus === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 rounded-md bg-muted border border-border"
              data-ocid="temp.success_state"
            >
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-mono">
                URL parameter <span className="text-primary">{urlTemp}°C</span>{" "}
                logged successfully
              </span>
            </motion.div>
          )}
          {urlSubmitStatus === "error" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 px-4 py-3 rounded-md border border-destructive/40 bg-destructive/10"
              data-ocid="temp.error_state"
            >
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-mono">
                Failed to log{" "}
                <span className="text-destructive">{urlTemp}°C</span> from URL
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form */}
        <section>
          <div className="mb-4">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Record Reading
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-ocid="temp.input"
                type="number"
                placeholder="Enter temperature…"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="pl-9 font-mono bg-muted border-border focus-visible:ring-primary/50 placeholder:text-muted-foreground/50"
              />
            </div>
            <Button
              data-ocid="temp.submit_button"
              type="submit"
              disabled={addMutation.isPending || inputValue === ""}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-5 shadow-glow transition-shadow"
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span className="ml-1">
                {addMutation.isPending ? "Adding…" : "Add"}
              </span>
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            Tip: You can also POST via URL:{" "}
            <span className="text-foreground">?temp=25</span>
          </p>
        </section>

        {/* Temperature List */}
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Recorded Temperatures
            </h2>
            <div className="flex items-center gap-3 ml-auto">
              {totalCount > 0 && (
                <button
                  type="button"
                  data-ocid="temp.select_all_toggle"
                  onClick={handleSelectAll}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              )}
              {totalCount > 0 && (
                <span className="text-xs font-mono text-muted-foreground">
                  {totalCount} reading{totalCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Bulk delete bar */}
          <AnimatePresence>
            {selected.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden mb-3"
              >
                <div className="flex items-center justify-between px-4 py-2.5 rounded-md bg-destructive/10 border border-destructive/30">
                  <span className="text-xs font-mono text-destructive">
                    {selected.size} selected
                  </span>
                  <Button
                    data-ocid="temp.delete_selected_button"
                    size="sm"
                    variant="destructive"
                    disabled={deleteMultiMutation.isPending}
                    onClick={handleDeleteSelected}
                    className="h-7 text-xs gap-1.5"
                  >
                    {deleteMultiMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                    Delete selected
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {tempLoading ? (
            <div className="space-y-2" data-ocid="temp.loading_state">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-md bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="temp.empty_state"
            >
              <Thermometer className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-mono">
                No readings yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Add a temperature above or use{" "}
                <span className="text-foreground/60">?temp=25</span>
              </p>
            </motion.div>
          ) : (
            <motion.ul
              className="space-y-2"
              data-ocid="temp.list"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            >
              {sorted.map((entry, index) => {
                const value = Number(entry.value);
                const color = getTempColor(value);
                const label = getTempLabel(value);
                const markerIndex = index + 1;
                const originalIndex = totalCount - 1 - index;
                const isChecked = selected.has(originalIndex);
                const isDeleting = deletingIndex === originalIndex;
                const itemKey = `temp-${index}-${value}`;
                return (
                  <motion.li
                    key={itemKey}
                    data-ocid={`temp.item.${markerIndex}`}
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    className="relative flex items-center gap-3 px-4 py-3 rounded-md bg-card border border-border hover:border-primary/30 transition-colors group scanlines overflow-hidden"
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md"
                      style={{ backgroundColor: color }}
                    />

                    {/* Checkbox */}
                    <Checkbox
                      data-ocid={`temp.checkbox.${markerIndex}`}
                      checked={isChecked}
                      onCheckedChange={(checked) =>
                        toggleSelect(originalIndex, checked === true)
                      }
                      className="flex-shrink-0 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />

                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: `0 0 8px ${color}`,
                      }}
                    />
                    <div className="flex flex-col gap-0.5">
                      <span
                        className="temp-readout text-2xl font-bold tabular-nums tracking-tight"
                        style={{ color }}
                      >
                        {value > 0 ? "+" : ""}
                        {value}°C
                      </span>
                      <span className="text-xs font-mono text-muted-foreground/50">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                      {label}
                    </span>
                    <span className="ml-auto text-xs font-mono text-muted-foreground/40 mr-2">
                      #{totalCount - index}
                    </span>

                    {/* Single delete button */}
                    <button
                      type="button"
                      data-ocid={`temp.delete_button.${markerIndex}`}
                      disabled={isDeleting || deleteMultiMutation.isPending}
                      onClick={() => handleSingleDelete(originalIndex)}
                      className="flex-shrink-0 p-1.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Delete entry"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="max-w-2xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs font-mono text-muted-foreground/50">
            © {new Date().getFullYear()} ThermoLog
          </span>
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Built with ♥ using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
