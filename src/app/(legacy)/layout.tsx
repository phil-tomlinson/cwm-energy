// Pages from the original site keep their own look inside this wrapper until
// each one is restyled. Their URLs are unchanged.
export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return <div className="legacy min-h-full">{children}</div>;
}
