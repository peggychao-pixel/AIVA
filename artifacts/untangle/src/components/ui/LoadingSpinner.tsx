export function LoadingSpinner({ message = "Processing..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border border-primary/20" />
        <div className="absolute inset-0 rounded-full border border-transparent border-t-primary animate-spin" />
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">{message}</p>
    </div>
  );
}
