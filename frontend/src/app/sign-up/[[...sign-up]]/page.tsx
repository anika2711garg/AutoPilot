import { SignUp } from "@clerk/nextjs";
import { Plane } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-10 z-10 group">
        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:bg-indigo-500/30 transition-colors">
          <Plane className="w-4 h-4 text-indigo-400" />
        </div>
        <span className="font-semibold text-lg tracking-tight text-white">Autopilot</span>
      </Link>

      {/* Clerk Sign Up Component */}
      <div className="z-10 w-full flex justify-center">
        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "w-full",
            },
          }}
        />
      </div>
    </div>
  );
}
