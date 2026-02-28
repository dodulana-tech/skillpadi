'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 20 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>SkillPadi — Something went wrong</h2>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
            We&apos;re having technical difficulties. Please try again.
          </p>
          <button onClick={reset} style={{ background: '#0F766E', color: 'white', padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
