import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-6xl font-bold text-brand-600 mb-4">404</h1>
        <p className="text-slate-500 mb-6">This page does not exist.</p>
        <Link href="/" className="btn-primary">Go home</Link>
      </div>
    </div>
  );
}