export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen px-12 py-12">
      <div className="w-full max-w-6xl mx-auto">
        {children}
      </div>
    </div>
  );
}