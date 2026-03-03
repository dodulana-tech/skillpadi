export default function Loading() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <img src="/logomark.svg" alt="SkillPadi" className="w-10 h-10 mx-auto mb-3 animate-pulse" />
        <p className="text-slate-400 text-xs">Loading...</p>
      </div>
    </div>
  );
}
