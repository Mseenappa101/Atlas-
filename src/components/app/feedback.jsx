export function EmptyState({ title, children, action }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-app border border-dashed border-line bg-card px-6 py-10">
      <h3 className="text-t16 font-semibold text-fg">{title}</h3>
      {children && <div className="max-w-md text-t14 text-fg-2">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// Flat blocks, gently pulsing. Shapes match the content they stand in for.
function Block({ className }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-[4px] bg-line ${className}`} />;
}

export function FirmRowSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading firms">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-[72px] items-center gap-3 border-b border-line px-4 py-3">
          <Block className="h-10 w-10 rounded-app" />
          <div className="flex-1 space-y-2">
            <Block className="h-4 w-1/2" />
            <Block className="h-3 w-1/3" />
            <Block className="h-4 w-24 rounded-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FirmCardSkeleton({ count = 4 }) {
  return (
    <div role="status" aria-label="Loading" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="space-y-3 rounded-app border border-line bg-card p-4">
          <div className="flex items-center gap-3">
            <Block className="h-8 w-8 rounded-app" />
            <Block className="h-4 flex-1" />
          </div>
          <Block className="h-4 w-20 rounded-pill" />
        </div>
      ))}
    </div>
  );
}
