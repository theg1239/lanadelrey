"use client";
import { motion } from "motion/react";
import { useMemo } from "react";
function seededRandom(seed: number) {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
}
function PlatformPreview() {
    const bars = useMemo(() => Array.from({ length: 28 }, (_, i) => Math.round(4 + seededRandom(i) * 20)), []);
    const fakeSegments = [
        { time: "00:01", text: "I'd like to discuss the payment terms for the outstanding balance.", conf: 0.94 },
        { time: "00:08", text: "The current EMI is set at twelve thousand five hundred.", conf: 0.97 },
        { time: "00:14", text: "I can commit to making the payment by Friday.", conf: 0.89 },
        { time: "00:19", text: "Please note this will be processed as a one-time settlement.", conf: 0.92 },
    ];
    return (<div className="relative w-full max-w-4xl mx-auto">
            
            <div className="absolute -inset-8 bg-primary/[0.06] rounded-3xl blur-[60px] pointer-events-none"/>

            <div className="relative border-2 border-border bg-card overflow-hidden shadow-lg neo-card">
                
                <div className="h-9 flex items-center justify-between px-4 border-b border-border/50 bg-background/50">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-destructive/60"/>
                        <div className="w-3 h-3 rounded-full bg-accent/80"/>
                        <div className="w-3 h-3 rounded-full bg-secondary/80"/>
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground/60">delrey — platform</span>
                    <div className="w-16"/>
                </div>

                
                <div className="flex h-[280px] sm:h-[320px]">
                    
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="h-7 flex items-center px-3 border-b border-border/30 bg-muted/20">
                            <span className="font-mono text-[9px] tracking-wider uppercase text-primary font-medium">transcript</span>
                        </div>
                        <div className="flex-1 overflow-hidden p-2 space-y-0.5">
                            {fakeSegments.map((seg, i) => (<motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 + i * 0.3, duration: 0.4 }} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-muted/30 transition-colors group">
                                    <span className="font-mono text-[9px] text-secondary tabular-nums pt-0.5 shrink-0">
                                        {seg.time}
                                    </span>
                                    <span className="text-[11px] leading-[1.5] text-card-foreground/70 flex-1">
                                        {seg.text}
                                    </span>
                                    <div className="shrink-0 flex items-center gap-1 pt-0.5">
                                        <div className="w-6 h-[3px] rounded-full bg-border/40 overflow-hidden">
                                            <div className="h-full rounded-full bg-secondary" style={{ width: `${seg.conf * 100}%` }}/>
                                        </div>
                                    </div>
                                </motion.div>))}
                        </div>
                    </div>

                    
                    <div className="w-48 sm:w-56 border-l border-border/30 flex flex-col">
                        <div className="h-7 flex items-center px-3 border-b border-border/30 bg-muted/20">
                            <span className="font-mono text-[9px] tracking-wider uppercase text-muted-foreground/60">insights</span>
                        </div>
                        <div className="flex-1 p-3 space-y-3">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4 }} className="space-y-1">
                                <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-muted-foreground/40">intent</span>
                                <p className="font-mono text-[11px] text-primary font-medium">payment_negotiation</p>
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.7 }} className="space-y-1">
                                <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-muted-foreground/40">entities</span>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="font-mono text-muted-foreground/50">amount</span>
                                        <span className="font-mono text-card-foreground/70">INR 12,500</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className="font-mono text-muted-foreground/50">date</span>
                                        <span className="font-mono text-card-foreground/70">Friday</span>
                                    </div>
                                </div>
                            </motion.div>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.0 }} className="space-y-1">
                                <span className="font-mono text-[8px] tracking-[0.2em] uppercase text-muted-foreground/40">obligation</span>
                                <p className="text-[10px] leading-[1.5] text-card-foreground/50 italic border-l-2 border-primary/30 pl-2">
                                    Commit to payment by Friday
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </div>

                
                <div className="h-6 flex items-center justify-between px-3 border-t border-border/30 bg-muted/10">
                    <span className="font-mono text-[8px] text-muted-foreground/30">4 segments · 23.4s · EN</span>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary/60"/>
                        <span className="font-mono text-[8px] text-muted-foreground/30">ready</span>
                    </div>
                </div>
            </div>
        </div>);
}
function HeroWaveform() {
    const bars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
        height: 15 + seededRandom(i) * 50,
        delay: seededRandom(i + 60) * 2.5,
        duration: 2.5 + seededRandom(i + 120) * 2,
    })), []);
    return (<div className="absolute inset-0 flex items-end justify-center gap-[2px] pb-[35%] opacity-[0.04] pointer-events-none">
            {bars.map((bar, i) => (<div key={i} className="hero-wave-bar w-[2px] rounded-full bg-primary" style={{
                height: `${bar.height}%`,
                animationDelay: `${bar.delay.toFixed(2)}s`,
                animationDuration: `${bar.duration.toFixed(2)}s`,
            }}/>))}
        </div>);
}
export function LandingHero() {
    return (<section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden px-6 pt-20 pb-12">
            <HeroWaveform />

            
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-[100px] pointer-events-none"/>
            <div className="absolute top-2/3 left-1/3 w-[400px] h-[400px] bg-secondary/[0.04] rounded-full blur-[80px] pointer-events-none"/>

            
            <div className="relative z-10 w-full max-w-5xl space-y-10">
                
                <div className="text-center space-y-5">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
                    </motion.div>

                    <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-foreground text-balance">
                        Hear what data{" "}
                        <span className="text-gradient-primary">can&apos;t show you</span>
                    </motion.h1>

                    <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }} className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
                        Drop any audio file. Get transcripts, entities, intents, and obligations
                        in seconds. Enterprise-grade speech understanding built for financial services.
                    </motion.p>

                    
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <a href="/app" className="inline-flex items-center gap-2 px-7 py-3 bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-md neo-card">
                            Try the Platform
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                            </svg>
                        </a>
                        <a href="/get-started" className="inline-flex items-center gap-2 px-7 py-3 border-2 border-border text-foreground text-sm font-medium hover:bg-card/50 transition-colors">
                            Get Started
                        </a>
                    </motion.div>
                </div>

                
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7, ease: [0.22, 1, 0.36, 1] }} className="animate-float" style={{ animationDelay: "1s" }}>
                    <PlatformPreview />
                </motion.div>
            </div>
        </section>);
}
