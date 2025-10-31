export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Golf Day OS</h3>
            <p className="text-white/70">
              The easiest way to organize your golf tournaments
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <nav className="flex flex-col gap-2">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-white/70 hover:text-white transition-colors text-left"
                data-testid="button-footer-home"
              >
                Home
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("features");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-white/70 hover:text-white transition-colors text-left"
                data-testid="button-footer-features"
              >
                Features
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("how-it-works");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-white/70 hover:text-white transition-colors text-left"
                data-testid="button-footer-how-it-works"
              >
                How it Works
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById("faq");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-white/70 hover:text-white transition-colors text-left"
                data-testid="button-footer-faq"
              >
                FAQ
              </button>
            </nav>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <a
              href="mailto:hello@golfdayos.app"
              className="text-white/70 hover:text-white transition-colors"
              data-testid="link-footer-contact"
            >
              hello@golfdayos.app
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 text-center text-white/60">
          <p>© {currentYear} Golf Day OS. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
