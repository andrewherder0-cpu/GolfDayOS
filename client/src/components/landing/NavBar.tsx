import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <span
              className={`text-xl font-bold transition-colors cursor-pointer ${
                isScrolled ? "text-brand-600" : "text-white"
              }`}
              data-testid="link-home"
            >
              Golf Day OS
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className={`transition-colors hover:text-brand-500 ${
                isScrolled ? "text-foreground" : "text-white"
              }`}
              data-testid="button-nav-features"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className={`transition-colors hover:text-brand-500 ${
                isScrolled ? "text-foreground" : "text-white"
              }`}
              data-testid="button-nav-how-it-works"
            >
              How it Works
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className={`transition-colors hover:text-brand-500 ${
                isScrolled ? "text-foreground" : "text-white"
              }`}
              data-testid="button-nav-faq"
            >
              FAQ
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button
                variant="ghost"
                className={
                  isScrolled
                    ? "text-foreground"
                    : "text-white hover:bg-white/10"
                }
                data-testid="button-nav-login"
              >
                Log In
              </Button>
            </Link>
            <Link href="/signup">
              <Button
                variant={isScrolled ? "default" : "outline"}
                className={
                  isScrolled
                    ? "bg-brand-600 hover:bg-brand-600/90 text-white"
                    : "bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20"
                }
                data-testid="button-nav-signup"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
