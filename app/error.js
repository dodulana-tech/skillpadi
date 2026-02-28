'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    console.error('[SkillPadi] Page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-500 text-xl mx-auto mb-4">
          !
        </div>
        <h2 className="font-serif text-xl mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-4">
          We hit an unexpected error. This has been logged and we&apos;ll look into it.
        </p>
        <div className="flex gap-2 justify-center">
          <button onClick={reset} className="btn-primary">
            Try Again
          </button>
          <a href="/" className="btn-outline">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
