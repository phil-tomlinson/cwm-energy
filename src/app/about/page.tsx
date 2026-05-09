export default function AboutPage() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">About CWM Energy</h1>

        <p className="text-gray-600 leading-relaxed mb-4">
          CWM Energy was founded on a simple idea: the tools and strategies used to optimize
          industrial energy systems can be just as powerful in your home.
        </p>

        <p className="text-gray-600 leading-relaxed mb-4">
          We&apos;re passionate about energy efficiency — not as an abstract environmental goal, but
          as a concrete, measurable path to lower bills and a smaller footprint. Every calculator on
          this site uses established Canadian methodology (NRCan, NBCC) to give you numbers you can
          trust, not rough guesses.
        </p>

        <p className="text-gray-600 leading-relaxed mb-8">
          Sustainability doesn&apos;t mean doing less. It means doing better.
        </p>

        <div className="border-t border-gray-100 pt-6">
          <h2 className="font-semibold text-gray-900 mb-1">Get in touch</h2>
          <p className="text-sm text-gray-500">
            Questions, feedback, or partnership inquiries:{" "}
            <a href="mailto:info@cwmenergy.ca" className="text-emerald-600 hover:underline">
              info@cwmenergy.ca
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
