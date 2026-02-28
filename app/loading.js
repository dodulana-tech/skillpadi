export default function Loading() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-primary to-teal-light flex items-center justify-center text-white text-sm font-extrabold mx-auto mb-3 animate-pulse">
          SP
        </div>
        <p className="text-slate-400 text-xs">Loading...</p>
      </div>
    </div>
  );
}
