"use client";
import { motion } from "motion/react";
import { LandingHero } from "@/components/landing-hero";
function FeatureSection({ badge, title, description, children, reverse = false, }: {
    badge: string;
    title: string;
    description: string;
    children: React.ReactNode;
    reverse?: boolean;
}) {
    return (<section className="py-20 sm:py-28 px-6">
      <div className={`max-w-6xl mx-auto flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-16`}>
        
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6 }} className="flex-1 space-y-4 text-center lg:text-left">
          <span className="inline-block font-mono text-[10px] tracking-[0.2em] uppercase text-primary border border-border rounded-full px-3 py-1 bg-card/30">
            {badge}
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
            {title}
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto lg:mx-0 font-serif leading-relaxed">
            {description}
          </p>
        </motion.div>

        
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.6, delay: 0.15 }} className="flex-1 w-full">
          {children}
        </motion.div>
      </div>
    </section>);
}
function FormatGrid() {
    const formats = [
        { ext: "WAV", color: "bg-primary/20 text-primary border-primary/30" },
        { ext: "MP3", color: "bg-secondary/20 text-secondary border-secondary/30" },
        { ext: "OGG", color: "bg-accent/30 text-accent-foreground border-accent/50" },
        { ext: "FLAC", color: "bg-primary/20 text-primary border-primary/30" },
        { ext: "WebM", color: "bg-secondary/20 text-secondary border-secondary/30" },
        { ext: "MP4", color: "bg-accent/30 text-accent-foreground border-accent/50" },
        { ext: "M4A", color: "bg-primary/20 text-primary border-primary/30" },
        { ext: "AAC", color: "bg-secondary/20 text-secondary border-secondary/30" },
        { ext: "OPUS", color: "bg-accent/30 text-accent-foreground border-accent/50" },
        { ext: "AMR", color: "bg-primary/20 text-primary border-primary/30" },
        { ext: "WMA", color: "bg-secondary/20 text-secondary border-secondary/30" },
        { ext: "AIFF", color: "bg-accent/30 text-accent-foreground border-accent/50" },
    ];
    return (<div className="rounded-xl border-2 border-border bg-card p-6 shadow-md">
      <div className="grid grid-cols-4 gap-2">
        {formats.map((f, i) => (<motion.div key={f.ext} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05, duration: 0.3 }} className={`font-mono text-xs font-semibold text-center py-3 rounded-lg border-2 ${f.color} neo-card cursor-default`}>
            .{f.ext.toLowerCase()}
          </motion.div>))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[10px] text-muted-foreground/50">50+ formats supported</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"/>
          <span className="font-mono text-[10px] text-muted-foreground/50">auto-detect</span>
        </div>
      </div>
    </div>);
}
function TranscriptVisual() {
    const lines = [
        { speaker: "A", time: "00:01", text: "Good morning, I'm calling about account ending 4782.", conf: 0.96 },
        { speaker: "B", time: "00:05", text: "Of course, let me pull that up. Can you verify your date of birth?", conf: 0.94 },
        { speaker: "A", time: "00:11", text: "January fifteenth, nineteen eighty-three.", conf: 0.98 },
        { speaker: "B", time: "00:15", text: "Thank you. I see a balance of forty-two thousand three hundred.", conf: 0.91 },
        { speaker: "A", time: "00:21", text: "I'd like to set up an EMI plan for that amount.", conf: 0.93 },
    ];
    return (<div className="rounded-xl border-2 border-border bg-card overflow-hidden shadow-md">
      <div className="h-8 flex items-center px-4 border-b border-border/30 bg-muted/20">
        <span className="font-mono text-[9px] tracking-wider uppercase text-primary font-medium">live transcript</span>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse"/>
          <span className="font-mono text-[9px] text-muted-foreground/50">recording</span>
        </div>
      </div>
      <div className="p-3 space-y-1">
        {lines.map((line, i) => (<motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.4 }} className="flex items-start gap-2 px-2 py-1.5 rounded group hover:bg-muted/20 transition-colors">
            <span className={`font-mono text-[10px] font-bold shrink-0 pt-0.5 ${line.speaker === "A" ? "text-primary" : "text-secondary"}`}>
              {line.speaker}
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/40 tabular-nums pt-0.5 shrink-0">
              {line.time}
            </span>
            <span className="text-[12px] leading-[1.5] text-card-foreground/75 font-serif flex-1">
              {line.text}
            </span>
            <div className="shrink-0 pt-1 flex items-center gap-1">
              <div className="w-7 h-[3px] rounded-full bg-border/30 overflow-hidden">
                <div className="h-full rounded-full bg-secondary" style={{ width: `${line.conf * 100}%` }}/>
              </div>
              <span className="font-mono text-[8px] text-muted-foreground/30">{(line.conf * 100).toFixed(0)}</span>
            </div>
          </motion.div>))}
      </div>
      
      <div className="px-5 pb-3 flex items-center gap-1">
        <span className="font-mono text-[10px] text-muted-foreground/30">▎</span>
        <span className="w-[2px] h-3 bg-primary/50 animate-cursor-blink"/>
      </div>
    </div>);
}
function IntelligenceVisual() {
    const extractions = [
        { label: "intent", value: "emi_setup_request", color: "text-primary" },
        { label: "amount", value: "₹42,300", color: "text-secondary" },
        { label: "account", value: "****4782", color: "text-accent-foreground" },
        { label: "dob", value: "1983-01-15", color: "text-secondary" },
    ];
    return (<div className="rounded-xl border-2 border-border bg-card overflow-hidden shadow-md">
      <div className="h-8 flex items-center px-4 border-b border-border/30 bg-muted/20">
        <span className="font-mono text-[9px] tracking-wider uppercase text-primary font-medium">extracted intelligence</span>
      </div>
      <div className="p-4 space-y-4">
        
        <div className="grid grid-cols-2 gap-2">
          {extractions.map((ext, i) => (<motion.div key={ext.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.3 }} className="border-2 border-border rounded-lg p-3 bg-background/50 neo-card">
              <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-muted-foreground/40 block">{ext.label}</span>
              <span className={`font-mono text-sm font-semibold ${ext.color} mt-1 block`}>{ext.value}</span>
            </motion.div>))}
        </div>

        
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="border-2 border-border rounded-lg p-3 bg-background/50">
          <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-muted-foreground/40 block mb-1">detected obligation</span>
          <p className="text-[12px] leading-[1.5] text-card-foreground/70 font-serif italic border-l-2 border-primary/40 pl-2">
            &ldquo;Customer requests EMI plan setup for outstanding balance of ₹42,300 on account ending 4782&rdquo;
          </p>
        </motion.div>

        
        <div className="flex items-center justify-between pt-1">
          <span className="font-mono text-[9px] text-muted-foreground/40">overall confidence</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-border/40 overflow-hidden">
              <motion.div initial={{ width: 0 }} whileInView={{ width: "94%" }} viewport={{ once: true }} transition={{ delay: 0.6, duration: 0.8 }} className="h-full rounded-full bg-secondary"/>
            </div>
            <span className="font-mono text-[10px] text-secondary font-medium">94%</span>
          </div>
        </div>
      </div>
    </div>);
}
function StatsStrip() {
    const stats = [
        { value: "50+", label: "Audio Formats" },
        { value: "<2s", label: "Processing" },
        { value: "12", label: "Languages" },
        { value: "99.1%", label: "Accuracy" },
    ];
    return (<section className="py-16 px-6 border-y border-border bg-card/30">
      <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
        {stats.map((stat, i) => (<motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.4 }} className="text-center">
            <p className="text-3xl sm:text-4xl font-bold text-primary font-mono">{stat.value}</p>
            <p className="text-xs text-muted-foreground/60 font-mono tracking-wider uppercase mt-1">{stat.label}</p>
          </motion.div>))}
      </div>
    </section>);
}
export default function LandingPage() {
    return (<div className="flex flex-col min-h-dvh bg-background">
      
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <a href="/" className="text-lg font-bold tracking-tight text-foreground">
            Delrey
          </a>

          <nav className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="/app" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Platform
            </a>
          </nav>

          <a href="/app" className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-sm">
            Launch App
          </a>
        </div>
      </header>

      
      <LandingHero />

      
      <StatsStrip />

      
      <div id="features">
        <FeatureSection badge="01 · Ingest" title="Accept any audio format" description="Drop WAV, MP3, OGG, FLAC, WebM, or any of 50+ audio and video formats. Automatic codec detection, noise profiling, and call quality scoring.">
          <FormatGrid />
        </FeatureSection>
      </div>

      
      <div className="max-w-6xl mx-auto w-full border-t border-border/40"/>

      
      <FeatureSection badge="02 · Transcribe" title="Fintech-aware transcription" description="Domain-vocabulary-injected ASR tuned for financial terms, amounts, dates, and account numbers. Per-word confidence scoring with speaker diarization." reverse>
        <TranscriptVisual />
      </FeatureSection>

      
      <div className="max-w-6xl mx-auto w-full border-t border-border/40"/>

      
      <FeatureSection badge="03 · Understand" title="Extract intelligence from every call" description="Automatically classify intents, extract financial entities, detect obligations and commitments, and flag regulatory-sensitive language.">
        <IntelligenceVisual />
      </FeatureSection>

      
      <section className="py-24 px-6 border-t border-border">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Ready to understand your audio?
          </h2>
          <p className="text-muted-foreground font-serif max-w-md mx-auto">
            Try the platform now. No sign-up required.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="/app" className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-md neo-card">
              Launch Platform
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </a>
            <a href="/get-started" className="inline-flex items-center gap-2 px-7 py-3 rounded-lg border-2 border-border text-foreground text-sm font-medium hover:bg-card/50 transition-colors">
              Documentation
            </a>
          </div>
        </motion.div>
      </section>

      
      <footer className="border-t border-border py-8 px-6 bg-card/20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
            <span className="font-semibold text-foreground/60">Delrey</span>
            <span className="font-mono tracking-widest uppercase text-[10px]">
              Audio Intelligence
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              Security
            </a>
          </div>
        </div>
      </footer>
    </div>);
}
