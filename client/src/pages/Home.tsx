import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Accordion } from "@/components/ui/accordion";
import {
  Vote,
  Users,
  Calendar,
  MapPin,
  FileSpreadsheet,
  Trophy,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { PainPointCard } from "@/components/landing/PainPointCard";
import { TestimonialCard } from "@/components/landing/TestimonialCard";
import { FAQItem } from "@/components/landing/FAQItem";

export default function Home() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1559599101-bf3be8f9e4f6?q=80&w=1800&auto=format&fit=crop"
            alt="Friends golfing"
            className="w-full h-full object-cover"
            loading="eager"
          />
          {/* Dark overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-brand-600/60" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6" data-testid="heading-hero">
                Golf Day OS
              </h1>
              <p className="text-xl md:text-2xl text-white/90 mb-8" data-testid="text-hero-subhead">
                The easiest way to organize your spring & fall golf
                tournaments—poll dates, pick a course, cap RSVPs, manage a
                waitlist, and publish tee sheets in minutes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="bg-brand-600 hover:bg-brand-600/90 text-white text-lg px-8"
                    data-testid="button-hero-primary-cta"
                  >
                    Get Started
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToSection("how-it-works")}
                  className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 text-lg px-8"
                  data-testid="button-hero-secondary-cta"
                >
                  See How It Works
                </Button>
              </div>

              <div className="space-y-3">
                {[
                  "End the group-chat chaos",
                  "Lock your roster with caps & waitlists",
                  "Publish pairings & tee sheets fast",
                ].map((bullet, index) => (
                  <motion.div
                    key={bullet}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle2 className="w-5 h-5 text-brand-500 flex-shrink-0" />
                    <span className="text-white text-lg" data-testid={`text-hero-bullet-${index}`}>{bullet}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden md:block"
            >
              <img
                src="https://images.unsplash.com/photo-1581224463319-4f3a62f4f6a4?q=80&w=1400&auto=format&fit=crop"
                alt="Golf Day OS app mockup"
                className="rounded-md shadow-2xl border border-white/20"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-3 bg-white/50 rounded-full mt-2"
            />
          </div>
        </motion.div>
      </section>

      {/* Social Proof Strip */}
      <section className="bg-sand-100 dark:bg-card py-8 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-muted-foreground mb-6" data-testid="text-social-proof">
            Trusted by weekend captains and league organizers across Ontario.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8">
            {["Your League", "Weekend Wolves", "Front Nine Society"].map(
              (name) => (
                <div
                  key={name}
                  className="px-6 py-3 bg-white dark:bg-background rounded-md border border-border text-muted-foreground font-semibold"
                  data-testid={`badge-partner-${name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {name}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-24 bg-background" id="pain-points">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4" data-testid="heading-pain-points">
              Why every organizer burns out
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Running a golf tournament shouldn't feel like herding cats
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <PainPointCard
              title="Endless DMs & polls"
              description="Date/course decisions scattered across chats."
              delay={0}
            />
            <PainPointCard
              title="Commitment roulette"
              description="18 spots, 23 'I'm in' messages, 7 pay late."
              delay={0.1}
            />
            <PainPointCard
              title="Manual waitlists"
              description="Drops and replacements tracked in someone's Notes app."
              delay={0.2}
            />
            <PainPointCard
              title="Tee-sheet spaghetti"
              description="Pairings change five times; nobody has the final version."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 bg-sand-100 dark:bg-card" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4" data-testid="heading-solution">
              What Golf Day OS fixes
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to run smooth tournaments
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <FeatureCard
              icon={Vote}
              title="Smart Polling"
              description="Course & date polls with clear winners and organizer tie-breaks."
              delay={0}
            />
            <FeatureCard
              icon={Users}
              title="RSVP Caps & Waitlists"
              description="First-in join; auto-promote replacements with claim windows."
              delay={0.1}
            />
            <FeatureCard
              icon={FileSpreadsheet}
              title="Roster & Pairings"
              description="Drag-and-drop foursomes; tee times; printable tee sheet PDF."
              delay={0.2}
            />
            <FeatureCard
              icon={MapPin}
              title="Course Directory"
              description="Search local courses you actually play; shortlist in-app."
              delay={0.3}
            />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-brand-600 hover:bg-brand-600/90 text-white text-lg px-8"
                data-testid="button-solution-cta"
              >
                Start free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-background" id="how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4" data-testid="heading-how-it-works">
              How it Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to a perfectly organized event
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {[
              {
                number: "01",
                title: "Create your event",
                description: "Add capacity, candidate courses and dates.",
              },
              {
                number: "02",
                title: "Run the votes",
                description: "Close polls; apply course & date with one click.",
              },
              {
                number: "03",
                title: "Open RSVP",
                description:
                  "Cap fills automatically; waitlist claims open as spots free.",
              },
            ].map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                className="text-center"
                data-testid={`card-step-${index + 1}`}
              >
                <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-brand-600">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center"
          >
            <img
              src="https://images.unsplash.com/photo-1591311630200-1c1d59f8d7b6?q=80&w=1400&auto=format&fit=crop"
              alt="Event planning illustration"
              className="rounded-md shadow-lg mx-auto max-w-2xl w-full border border-border"
              loading="lazy"
            />
          </motion.div>
        </div>
      </section>

      {/* Live on Event Day Band */}
      <section className="py-16 bg-brand-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Trophy className="w-12 h-12 mb-4" />
              <h2 className="text-3xl font-bold mb-4" data-testid="heading-event-day">
                Live on Event Day
              </h2>
              <p className="text-white/90 text-lg">
                Check in players, finalize pairings, and export a clean tee
                sheet.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <img
                src="https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop"
                alt="Tee sheet screenshot"
                className="rounded-md shadow-lg border border-white/20"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-background" id="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4" data-testid="heading-testimonials">
              What organizers are saying
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <TestimonialCard
              quote="Our 20-player fall classic finally ran on time. No-shows were replaced automatically."
              author="Mike H."
              role="Captain"
              delay={0}
            />
            <TestimonialCard
              quote="I stopped chasing people. The app handled the waitlist and tee sheet."
              author="Aisha K."
              role="Organizer"
              delay={0.1}
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-sand-100 dark:bg-card" id="faq">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4" data-testid="heading-faq">
              Frequently Asked Questions
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              <FAQItem
                value="payments"
                question="Do you handle payments?"
                answer="V1 focuses on logistics (polls, caps, waitlists, tee sheets). Payments are coming soon."
              />
              <FAQItem
                value="booking"
                question="Can I book courses through the app?"
                answer="We centralize decision-making and logistics first. Direct booking with partner courses is planned."
              />
              <FAQItem
                value="scoring"
                question="Is there live scoring?"
                answer="Not yet. Priorities: commitment and logistics."
              />
              <FAQItem
                value="pricing"
                question="Is it free?"
                answer="Organize your first events free. Pro features coming soon."
              />
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="py-24 bg-brand-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6" data-testid="heading-final-cta">
              Ready to run your next tournament the easy way?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join organizers who've ditched the spreadsheets and group chats
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="bg-white text-brand-600 hover:bg-white/90 text-lg px-12"
                data-testid="button-final-cta"
              >
                Get Started
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
