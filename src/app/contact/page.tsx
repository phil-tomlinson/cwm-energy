export default function ContactPage() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Get in touch</h1>
        <p className="text-gray-500 mb-8 text-sm">
          Questions, feedback, or want to explore a partnership? We&apos;d love to hear from you.
        </p>

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="What's on your mind?"
            />
          </div>
          <p className="text-xs text-gray-400">
            Form submission coming soon — for now, email us directly at{" "}
            <a href="mailto:info@cwmenergy.ca" className="text-emerald-600 hover:underline">
              info@cwmenergy.ca
            </a>
          </p>
          <button
            type="submit"
            disabled
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed"
          >
            Send message
          </button>
        </form>
      </div>
    </section>
  );
}
