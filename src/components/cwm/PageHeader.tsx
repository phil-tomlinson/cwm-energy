/** The standard page opening: one big heading and a short plain-language intro. */
export default function PageHeader({ title, intro, children, width = "max-w-[1200px]" }: {
  title: string; intro?: React.ReactNode; children?: React.ReactNode; width?: string
}) {
  return (
    <header className={`mx-auto flex ${width} flex-col gap-3 px-4 pb-6 pt-10 sm:px-6 sm:pt-14`}>
      <h1 className="m-0 max-w-[820px] text-[32px] font-extrabold leading-[34px] tracking-[-0.01em] sm:text-[48px] sm:leading-[50px]">
        {title}
      </h1>
      {intro && <p className="m-0 max-w-[680px] text-scree">{intro}</p>}
      {children}
    </header>
  );
}
