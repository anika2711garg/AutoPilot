import { Plane } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-150 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-100 h-100 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10 z-10 group">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
          <Plane className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-white">Autopilot</span>
      </Link>

      <div className="z-10 w-full flex justify-center">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl shadow-black/20">
          <p className="text-sm uppercase tracking-[0.24em] text-white/45">Mock access</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Sign up disabled for local mock mode</h1>
          <p className="mt-3 text-sm leading-7 text-white/60">
            The rest of the app is available now. Add real Clerk keys later to restore account creation.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/plan" className="inline-flex h-11 items-center justify-center rounded-full bg-white text-sm font-medium text-black transition hover:bg-white/90">
              Continue
            </Link>
            <Link href="/sign-in" className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10">
              See sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
