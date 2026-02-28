import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-primary to-teal-light flex items-center justify-center text-white text-sm font-extrabold mx-auto mb-4">
          SP
        </div>
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
