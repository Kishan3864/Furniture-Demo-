import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <p className="text-5xl font-extrabold text-wood-300">404</p>
        <p className="mt-2 text-lg font-bold text-wood-950">Page not found</p>
        <Link href="/" className="mt-4 inline-block rounded-xl bg-wood-700 px-4 py-2 text-sm font-medium text-white">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
