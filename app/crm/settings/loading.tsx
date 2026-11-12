export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/40 space-y-5">
        <div className="space-y-2 border-b border-outline-variant/30 pb-4">
          <div className="h-6 w-52 rounded-md bg-surface-container-high" />
          <div className="h-3.5 w-80 max-w-full rounded bg-surface-container" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-3 w-28 rounded bg-surface-container" />
              <div className="h-10 w-full rounded-lg bg-surface-container-low border border-outline-variant/30" />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <div className="h-9 w-36 rounded-lg bg-surface-container-high" />
        </div>
      </div>
    </div>
  );
}
