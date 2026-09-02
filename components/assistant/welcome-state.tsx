import { ThinkingOrb } from "thinking-orbs";

export function WelcomeState() {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center px-4 pb-6 pt-4 sm:pb-8">
      {/* Animated ThinkingOrb */}
      <div className="pointer-events-none relative mb-8">
        {/* Outer glow */}
        <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--synth-cyan)_12%,transparent),transparent_70%)] blur-2xl sm:size-48" />
        {/* The orb */}
        <div className="relative flex items-center justify-center">
          <ThinkingOrb state="listening" size={64} theme="dark" />
        </div>
      </div>

      {/* Title */}
      <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl md:text-3xl">
        SYNTH Assistant
      </h1>
      <p className="mt-2 max-w-md text-center text-xs text-muted-foreground sm:text-sm">
        Ask anything about your code, research, planning, and creativity.
      </p>
    </section>
  );
}
