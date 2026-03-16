import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import {
  AlertCircle,
  CheckCircle2,
  CpuIcon,
  ExternalLink,
  Flame,
  Loader2,
  Pencil,
  Plus,
  Thermometer,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useActor } from "./hooks/useActor";
import {
  useAddDevice,
  useAddTemperature,
  useDeleteDevice,
  useDeleteTemperature,
  useDeleteTemperatures,
  useGetDevices,
  useGetTemperatures,
  useRenameDevice,
} from "./hooks/useQueries";

type TimeRange = "8H" | "24H" | "3D" | "7D" | "1M";

const TIME_RANGE_MS: Record<TimeRange, number> = {
  "8H": 8 * 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "3D": 3 * 24 * 60 * 60 * 1000,
  "7D": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
};

const TIME_RANGE_LABELS: TimeRange[] = ["8H", "24H", "3D", "7D", "1M"];

function formatTickMs(ms: number, rangeMs: number): string {
  const d = new Date(ms);
  if (rangeMs <= TIME_RANGE_MS["24H"]) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (rangeMs <= TIME_RANGE_MS["7D"]) {
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

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
  // Device state
  const [selectedDeviceId, setSelectedDeviceId] = useState<bigint | null>(null);
  const [addingDevice, setAddingDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [renamingDeviceId, setRenamingDeviceId] = useState<bigint | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Temperature state
  const [inputValue, setInputValue] = useState("");
  const [urlSubmitStatus, setUrlSubmitStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [urlTemp, setUrlTemp] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("24H");

  const hasProcessedUrl = useRef(false);
  const pendingUrlTemp = useRef<number | null>(null);

  const { actor } = useActor();
  const { data: devices, isLoading: devicesLoading } = useGetDevices();
  const addDeviceMutation = useAddDevice();
  const renameDeviceMutation = useRenameDevice();
  const deleteDeviceMutation = useDeleteDevice();

  const { data: temperatures, isLoading: tempLoading } =
    useGetTemperatures(selectedDeviceId);
  const addMutation = useAddTemperature();
  const deleteMutation = useDeleteTemperature();
  const deleteMultiMutation = useDeleteTemperatures();

  const mutateRef = useRef(addMutation.mutate);
  mutateRef.current = addMutation.mutate;

  // Auto-select first device when devices load
  useEffect(() => {
    if (devices && devices.length > 0 && selectedDeviceId === null) {
      setSelectedDeviceId(devices[0].id);
    }
    // If selected device was deleted, clear selection
    if (devices && selectedDeviceId !== null) {
      const stillExists = devices.some((d) => d.id === selectedDeviceId);
      if (!stillExists) {
        setSelectedDeviceId(devices.length > 0 ? devices[0].id : null);
      }
    }
  }, [devices, selectedDeviceId]);

  // Reset selected temps when switching device
  const prevDeviceIdRef = useRef<bigint | null>(null);
  if (prevDeviceIdRef.current !== selectedDeviceId) {
    prevDeviceIdRef.current = selectedDeviceId;
    setSelected(new Set());
  }

  // URL param: parse on mount
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

  // URL param: fire mutation once actor + first device available
  useEffect(() => {
    if (!actor) return;
    if (hasProcessedUrl.current) return;
    if (pendingUrlTemp.current === null) return;
    if (!devices || devices.length === 0) return;

    const parsed = pendingUrlTemp.current;
    const deviceId = devices[0].id;
    hasProcessedUrl.current = true;

    mutateRef.current(
      { deviceId, value: parsed },
      {
        onSuccess: () => {
          setUrlSubmitStatus("success");
          toast.success(`Temperature ${parsed}°C logged via URL`);
          history.replaceState({}, "", window.location.pathname);
        },
        onError: () => {
          setUrlSubmitStatus("error");
          toast.error("Failed to log temperature from URL");
        },
      },
    );
  }, [actor, devices]);

  const handleAddDevice = () => {
    const name = newDeviceName.trim();
    if (!name) return;
    addDeviceMutation.mutate(name, {
      onSuccess: (id) => {
        toast.success(`Device "${name}" added`);
        setNewDeviceName("");
        setAddingDevice(false);
        setSelectedDeviceId(id);
      },
      onError: () => toast.error("Failed to add device"),
    });
  };

  const handleRenameDevice = (id: bigint) => {
    const name = renameValue.trim();
    if (!name) return;
    renameDeviceMutation.mutate(
      { id, name },
      {
        onSuccess: () => {
          toast.success("Device renamed");
          setRenamingDeviceId(null);
          setRenameValue("");
        },
        onError: () => toast.error("Failed to rename device"),
      },
    );
  };

  const handleDeleteDevice = (id: bigint, name: string) => {
    deleteDeviceMutation.mutate(id, {
      onSuccess: () => toast.success(`"${name}" deleted`),
      onError: () => toast.error("Failed to delete device"),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId) return;
    const parsed = Number.parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) {
      toast.error("Please enter a valid integer");
      return;
    }
    addMutation.mutate(
      { deviceId: selectedDeviceId, value: parsed },
      {
        onSuccess: () => {
          toast.success(`${parsed}°C recorded`);
          setInputValue("");
        },
        onError: () => toast.error("Failed to record temperature"),
      },
    );
  };

  const sorted = temperatures ? [...temperatures].reverse() : [];
  const totalCount = sorted.length;

  const nowMs = Date.now();
  const rangeMs = TIME_RANGE_MS[timeRange];
  const cutoffMs = nowMs - rangeMs;

  const allChartEntries = temperatures ? [...temperatures] : [];
  const chartEntries = allChartEntries.filter((e) => {
    const ms = Number(e.timestamp) / 1_000_000;
    return ms >= cutoffMs;
  });

  const chartPoints = chartEntries.map((e) => ({
    x: Number(e.timestamp) / 1_000_000,
    y: Number(e.value),
  }));

  const rechartsData = chartPoints.map((p) => ({
    x: p.x,
    y: p.y,
    label: formatTickMs(p.x, rangeMs),
  }));

  const handleSingleDelete = (originalIndex: number) => {
    if (!selectedDeviceId) return;
    setDeletingIndex(originalIndex);
    deleteMutation.mutate(
      { deviceId: selectedDeviceId, index: originalIndex },
      {
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
      },
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedDeviceId) return;
    const indices = Array.from(selected);
    deleteMultiMutation.mutate(
      { deviceId: selectedDeviceId, indices },
      {
        onSuccess: () => {
          setSelected(new Set());
          toast.success(
            `${indices.length} entr${indices.length !== 1 ? "ies" : "y"} deleted`,
          );
        },
        onError: () => toast.error("Failed to delete selected entries"),
      },
    );
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

  const selectedDevice = devices?.find((d) => d.id === selectedDeviceId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <header className="border-b border-border flex-shrink-0">
        <div className="px-6 py-4 flex items-center gap-3">
          <div className="relative">
            <Flame className="w-7 h-7 text-primary animate-pulse-glow" />
          </div>
          <div>
            <h1 className="font-display text-xl font-700 tracking-tight text-foreground">
              ThermoLog
            </h1>
            <p className="text-xs text-muted-foreground font-mono">
              Multi-Device Temperature Logger
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

      {/* Body: sidebar + main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Device Sidebar */}
        <aside className="w-full md:w-60 flex-shrink-0 border-b md:border-b-0 md:border-r border-border bg-sidebar flex flex-col">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Devices
            </span>
            <button
              type="button"
              data-ocid="device.add_button"
              onClick={() => {
                setAddingDevice(true);
                setNewDeviceName("");
              }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Add device"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-2 pb-4 space-y-0.5">
              {devicesLoading && (
                <div
                  className="space-y-1.5 px-2 py-2"
                  data-ocid="device.loading_state"
                >
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-8 rounded bg-muted animate-pulse"
                    />
                  ))}
                </div>
              )}

              {!devicesLoading && (!devices || devices.length === 0) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-2 px-2 py-8 text-center"
                  data-ocid="device.empty_state"
                >
                  <CpuIcon className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground font-mono">
                    No devices yet
                  </p>
                  <p className="text-xs text-muted-foreground/50">
                    Add one below
                  </p>
                </motion.div>
              )}

              <AnimatePresence>
                {devices?.map((device, idx) => {
                  const isSelected = device.id === selectedDeviceId;
                  const isRenaming = renamingDeviceId === device.id;
                  const markerIdx = idx + 1;
                  return (
                    <motion.div
                      key={device.id.toString()}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      data-ocid={`device.item.${markerIdx}`}
                      className={[
                        "group relative flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors",
                        isSelected
                          ? "bg-primary/15 text-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      ].join(" ")}
                      onClick={() => {
                        if (!isRenaming) setSelectedDeviceId(device.id);
                      }}
                    >
                      {/* Active indicator */}
                      {isSelected && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                      )}

                      <CpuIcon
                        className={`w-3.5 h-3.5 flex-shrink-0 ml-1 ${
                          isSelected ? "text-primary" : ""
                        }`}
                      />

                      {isRenaming ? (
                        <form
                          className="flex items-center gap-1 flex-1 min-w-0"
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleRenameDevice(device.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-6 text-xs px-1.5 bg-input border-border flex-1 min-w-0"
                          />
                          <button
                            type="submit"
                            className="p-0.5 text-primary hover:text-primary/80"
                            disabled={renameDeviceMutation.isPending}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="p-0.5 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingDeviceId(null);
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <span className="flex-1 text-sm font-medium truncate min-w-0">
                          {device.name}
                        </span>
                      )}

                      {!isRenaming && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            data-ocid={`device.rename_button.${markerIdx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRenamingDeviceId(device.id);
                              setRenameValue(device.name);
                            }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Rename device"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            data-ocid={`device.delete_button.${markerIdx}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDevice(device.id, device.name);
                            }}
                            className="p-1 rounded hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="Delete device"
                            disabled={deleteDeviceMutation.isPending}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Add device inline form */}
              <AnimatePresence>
                {addingDevice && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <form
                      className="flex items-center gap-1.5 px-2 py-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAddDevice();
                      }}
                    >
                      <Input
                        data-ocid="device.input"
                        autoFocus
                        placeholder="Device name…"
                        value={newDeviceName}
                        onChange={(e) => setNewDeviceName(e.target.value)}
                        className="h-7 text-xs px-2 bg-input border-border flex-1 min-w-0"
                      />
                      <button
                        type="submit"
                        disabled={
                          addDeviceMutation.isPending || !newDeviceName.trim()
                        }
                        className="p-1 rounded text-primary hover:text-primary/80 disabled:opacity-50"
                      >
                        {addDeviceMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingDevice(false)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add device button (when not adding) */}
              {!addingDevice && (
                <button
                  type="button"
                  data-ocid="device.add_button"
                  onClick={() => {
                    setAddingDevice(true);
                    setNewDeviceName("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-dashed border-border mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Device
                </button>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
            {/* No devices empty state */}
            {!devicesLoading && (!devices || devices.length === 0) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
                data-ocid="device.empty_state"
              >
                <div className="w-16 h-16 rounded-full bg-muted/50 border border-border flex items-center justify-center mb-4">
                  <CpuIcon className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">
                  No devices yet
                </h2>
                <p className="text-sm text-muted-foreground font-mono mb-6">
                  Add a device from the sidebar to start logging temperatures
                </p>
                <Button
                  data-ocid="device.add_button"
                  onClick={() => {
                    setAddingDevice(true);
                    setNewDeviceName("");
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Device
                </Button>
              </motion.div>
            )}

            {/* Device selected — show content */}
            {selectedDevice && (
              <>
                {/* Device heading */}
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary shadow-glow" />
                  <h2 className="font-display text-base font-semibold text-foreground">
                    {selectedDevice.name}
                  </h2>
                  <span className="text-xs font-mono text-muted-foreground">
                    ID #{selectedDevice.id.toString()}
                  </span>
                </div>

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
                        Logging{" "}
                        <span className="text-primary">{urlTemp}°C</span> from
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
                        URL parameter{" "}
                        <span className="text-primary">{urlTemp}°C</span> logged
                        successfully
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
                        <span className="text-destructive">{urlTemp}°C</span>{" "}
                        from URL
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Record Reading Form */}
                <section>
                  <div className="mb-4">
                    <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      Record Reading
                    </h3>
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

                {/* Chart */}
                <section>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      Temperature History
                    </h3>
                    <div className="flex items-center gap-1">
                      {TIME_RANGE_LABELS.map((range) => (
                        <button
                          key={range}
                          type="button"
                          data-ocid={`chart.${range.toLowerCase()}_filter.tab`}
                          onClick={() => setTimeRange(range)}
                          className={[
                            "px-2.5 py-1 rounded text-xs font-mono transition-colors",
                            timeRange === range
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border",
                          ].join(" ")}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div
                    className="rounded-md bg-card border border-border p-4 h-64"
                    data-ocid="temp.chart_point"
                  >
                    {tempLoading ? (
                      <div
                        className="w-full h-full flex items-end gap-1 px-2"
                        data-ocid="temp.loading_state"
                      >
                        {[40, 65, 45, 80, 55, 70, 50, 75, 60, 85].map((h) => (
                          <div
                            key={h}
                            className="flex-1 rounded-sm bg-muted animate-pulse"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    ) : chartPoints.length === 0 ? (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center gap-2"
                        data-ocid="temp.empty_state"
                      >
                        <svg
                          width="40"
                          height="24"
                          viewBox="0 0 40 24"
                          fill="none"
                          role="img"
                          aria-label="No data chart"
                          className="text-muted-foreground/20"
                        >
                          <polyline
                            points="0,20 8,14 16,18 24,8 32,12 40,4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <p className="text-xs font-mono text-muted-foreground/50">
                          No data in the last {timeRange} — try a wider range
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={rechartsData}
                          margin={{ top: 4, right: 4, bottom: 4, left: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="tempGradient"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#f97316"
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor="#f97316"
                                stopOpacity={0.02}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.04)"
                          />
                          <XAxis
                            dataKey="x"
                            type="number"
                            domain={[cutoffMs, nowMs]}
                            scale="time"
                            tickFormatter={(v) => formatTickMs(v, rangeMs)}
                            tick={{
                              fill: "rgba(150,150,170,0.7)",
                              fontSize: 10,
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            minTickGap={40}
                          />
                          <YAxis
                            tickFormatter={(v) => `${v}°`}
                            tick={{
                              fill: "rgba(150,150,170,0.7)",
                              fontSize: 10,
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                            tickLine={false}
                            width={36}
                          />
                          <ReTooltip
                            contentStyle={{
                              background: "rgba(20,20,30,0.95)",
                              border: "1px solid rgba(249,115,22,0.4)",
                              borderRadius: "6px",
                              fontFamily: "JetBrains Mono, monospace",
                              fontSize: "12px",
                            }}
                            labelStyle={{ color: "rgba(249,115,22,1)" }}
                            itemStyle={{ color: "rgba(200,200,220,0.9)" }}
                            labelFormatter={(v) => new Date(v).toLocaleString()}
                            formatter={(v: any) => [`${v}°C`, "Temp"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="y"
                            stroke="#f97316"
                            strokeWidth={2}
                            fill="url(#tempGradient)"
                            dot={{ fill: "#f97316", r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>

                {/* Temperature List */}
                <section>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                      Recorded Temperatures
                    </h3>
                    <div className="flex items-center gap-3 ml-auto">
                      {totalCount > 0 && (
                        <button
                          type="button"
                          data-ocid="temp.toggle"
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
                            data-ocid="temp.delete_button"
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
                      variants={{
                        visible: { transition: { staggerChildren: 0.04 } },
                      }}
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
                            <div
                              className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md"
                              style={{ backgroundColor: color }}
                            />
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
                            <button
                              type="button"
                              data-ocid={`temp.delete_button.${markerIndex}`}
                              disabled={
                                isDeleting || deleteMultiMutation.isPending
                              }
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

                {/* JSON Feed Link */}
                <section className="pt-2 pb-2">
                  <a
                    href="/temperatures"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ocid="temp.link"
                    className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors px-3 py-2 rounded-md border border-border hover:border-primary/40 bg-muted/50 hover:bg-muted"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>GET /temperatures</span>
                    <span className="text-muted-foreground/40">
                      — JSON feed
                    </span>
                  </a>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-4 flex-shrink-0">
        <div className="px-6 flex items-center justify-between">
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
