export function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-white/15 p-4 text-sm leading-6 text-white/45">
      {text}
    </div>
  );
}
