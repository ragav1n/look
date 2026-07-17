export default function Placeholder({ title }: { title: string }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <p className="text-xs tracking-[0.3em] text-accent uppercase">Coming soon</p>
      <h1 className="font-display text-4xl text-black">{title}</h1>
    </main>
  );
}
