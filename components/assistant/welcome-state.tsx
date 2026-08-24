export function WelcomeState() {
  return (
    <section className="relative flex flex-1 flex-col items-center justify-center px-4 pb-8 pt-4">
      {/* Glowing orb animation */}
      <div className="pointer-events-none relative mb-8">
        {/* Outer glow */}
        <div className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--synth-cyan)_12%,transparent),transparent_70%)] blur-2xl" />
        {/* Middle ring */}
        <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-synth-cyan/15 shadow-[0_0_60px_color-mix(in_srgb,var(--synth-cyan)_8%,transparent)]" />
        {/* Inner orb */}
        <div className="relative flex size-24 items-center justify-center rounded-full bg-[radial-gradient(circle_at_40%_40%,color-mix(in_srgb,var(--synth-cyan)_18%,transparent),color-mix(in_srgb,var(--synth-violet)_8%,transparent)_60%,transparent_80%)] shadow-[0_0_80px_color-mix(in_srgb,var(--synth-cyan)_10%,transparent),inset_0_0_40px_color-mix(in_srgb,var(--synth-cyan)_5%,transparent)]">
          <div className="size-16 rounded-full border border-synth-cyan/20 shadow-[0_0_30px_var(--synth-cyan)_20%]" />
        </div>
      </div>

      {/* Title */}
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        SYNTH Assistant
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
        Ask anything about your code, research, planning, and creativity.
      </p>
    </section>
  );
}
