import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center px-4">
        <img src="/logomark.svg" alt="SkillPadi" className="w-12 h-12 mx-auto mb-4" />
        <h1 className="font-serif text-3xl mb-2">Page Not Found</h1>
        <p className="text-slate-500 text-sm mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="btn-primary">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
