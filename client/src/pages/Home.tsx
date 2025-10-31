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
  MessageSquare,
  UserX,
  ClipboardList,
  Shuffle,
  Clock,
  UserCheck,
  Share2,
  Flag,
  Sparkles,
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 5, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-40 right-10 opacity-10"
        >
          <Flag className="w-24 h-24 text-brand-600" />
        </motion.div>
        <motion.div
          animate={{
            y: [0, 20, 0],
            x: [0, -10, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-[30%] left-20 opacity-10"
        >
          <Trophy className="w-20 h-20 text-brand-500" />
        </motion.div>
        <motion.div
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-40 right-32 opacity-10"
        >
          <Sparkles className="w-16 h-16 text-brand-400" />
        </motion.div>
      </div>
      
      <NavBar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 z-0">
          <motion.div
            animate={{
              background: [
                "linear-gradient(135deg, #14532d 0%, #15803d 50%, #ca8a04 100%)",
                "linear-gradient(135deg, #15803d 0%, #ca8a04 50%, #14532d 100%)",
                "linear-gradient(135deg, #ca8a04 0%, #14532d 50%, #15803d 100%)",
                "linear-gradient(135deg, #14532d 0%, #15803d 50%, #ca8a04 100%)",
              ],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            className="w-full h-full"
          />
          {/* Overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-900/40 to-transparent" />
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
                src="/attached_assets/generated_images/Golf_Day_OS_dashboard_mockup_b5bebc8b.png"
                alt="Golf Day OS dashboard showing groups, events, and RSVP management"
                className="rounded-lg shadow-2xl border-2 border-white/30 hover:shadow-brand-500/20 hover:scale-105 transition-all duration-300"
                loading="eager"
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0 }}
              className="p-6 bg-white dark:bg-card rounded-lg border border-border hover-elevate"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Endless DMs & polls</h3>
                  <p className="text-muted-foreground">Date/course decisions scattered across chats.</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 bg-white dark:bg-card rounded-lg border border-border hover-elevate"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <UserX className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Commitment roulette</h3>
                  <p className="text-muted-foreground">18 spots, 23 'I'm in' messages, 7 pay late.</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 bg-white dark:bg-card rounded-lg border border-border hover-elevate"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Manual waitlists</h3>
                  <p className="text-muted-foreground">Drops and replacements tracked in someone's Notes app.</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 bg-white dark:bg-card rounded-lg border border-border hover-elevate"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                  <Shuffle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Tee-sheet spaghetti</h3>
                  <p className="text-muted-foreground">Pairings change five times; nobody has the final version.</p>
                </div>
              </div>
            </motion.div>
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

          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
            
            <div className="grid md:grid-cols-3 gap-12 mb-12 relative">
              {[
                {
                  number: "01",
                  icon: Calendar,
                  title: "Create your event",
                  description: "Add capacity, candidate courses and dates.",
                },
                {
                  number: "02",
                  icon: Vote,
                  title: "Run the votes",
                  description: "Close polls; apply course & date with one click.",
                },
                {
                  number: "03",
                  icon: UserCheck,
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
                  className="text-center relative"
                  data-testid={`card-step-${index + 1}`}
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border-4 border-white dark:border-background relative z-10">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-10 h-10 bg-brand-500/10 rounded-full blur-xl -z-10" />
                  <span className="inline-block px-3 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 text-sm font-bold rounded-full mb-3">
                    STEP {step.number}
                  </span>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-center"
          >
            <img
              src="/attached_assets/generated_images/Golfers_planning_event_together_7eedba8d.png"
              alt="Golfers collaboratively planning their golf event"
              className="rounded-lg shadow-xl mx-auto max-w-2xl w-full border border-border"
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
                src="/attached_assets/generated_images/Golf_pairings_and_scorecard_ba9c5a21.png"
                alt="Golf pairings and tee sheet organization"
                className="rounded-lg shadow-xl border-2 border-white/20"
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
