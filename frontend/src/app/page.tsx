import Link from "next/link";
import { Stethoscope, Calendar, FileText, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-teal-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-xl text-slate-900">SoloDoc</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-secondary text-sm">Sign in</Link>
          <Link href="/auth/register" className="btn-primary text-sm">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          Now accepting patients
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold text-slate-900 leading-tight mb-6">
          Healthcare at your
          <span className="text-brand-600"> fingertips</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10">
          Book appointments, consult online, and manage your health records
          all in one secure platform.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/auth/register?role=PATIENT" className="btn-primary text-base px-8 py-3">
            Book a consultation
          </Link>
          <Link href="/auth/register?role=DOCTOR" className="btn-secondary text-base px-8 py-3">
            Join as a doctor
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: Calendar, title: "Easy scheduling", desc: "Book appointments in seconds. Choose your preferred time slot from available doctors." },
          { icon: FileText, title: "Digital prescriptions", desc: "Receive electronic prescriptions directly to your phone after every consultation." },
          { icon: Shield, title: "Private & secure", desc: "Your health data is encrypted and protected. HIPAA-compliant infrastructure." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
              <Icon className="w-5 h-5 text-brand-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}