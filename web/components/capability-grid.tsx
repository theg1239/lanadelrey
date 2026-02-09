"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import {
    FileAudio,
    Volume2,
    Languages,
    Users,
    ShieldCheck,
    Target,
    Landmark,
    Scale,
    AlertTriangle,
} from "lucide-react";

const capabilities = [
    {
        icon: FileAudio,
        title: "Multi-Format Support",
        desc: "Ingest WAV, MP3, OGG, FLAC, WebM, MP4, and 50+ other audio/video formats.",
    },
    {
        icon: Volume2,
        title: "Noise Detection",
        desc: "Automatically detect and flag background noise, call quality issues, and tampering.",
    },
    {
        icon: Users,
        title: "Speaker Diarization",
        desc: "Identify who spoke when — separate agent from customer with per-speaker timestamps.",
    },
    {
        icon: Languages,
        title: "Fintech-Aware ASR",
        desc: "Domain-vocabulary-injected transcription tuned for financial terms, amounts, and dates.",
    },
    {
        icon: ShieldCheck,
        title: "Confidence Scoring",
        desc: "Per-word confidence ratings so you know exactly how reliable each transcription segment is.",
    },
    {
        icon: Target,
        title: "Intent Classification",
        desc: "Classify whether the speaker is agreeing, refusing, requesting time, or escalating.",
    },
    {
        icon: Landmark,
        title: "Entity Extraction",
        desc: "Pull EMI amounts, dates, account numbers, and named entities automatically.",
    },
    {
        icon: Scale,
        title: "Obligation Detection",
        desc: "Detect promises, commitments, and legal obligations in every conversation.",
    },
    {
        icon: AlertTriangle,
        title: "Regulatory Phrases",
        desc: "Flag regulatory-sensitive language including consent statements and compliance phrases.",
    },
];

export function CapabilityGrid() {
    return (
        <section className="py-24 sm:py-32 px-6 border-t border-border">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-16 space-y-3"
                >
                    <span className="text-xs font-mono tracking-[0.2em] uppercase text-primary">
                        Capabilities
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Everything you need to understand voice data
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto font-serif">
                        Nine core capabilities purpose-built for financial services audio.
                    </p>
                </motion.div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {capabilities.map((cap, i) => {
                        const Icon = cap.icon;
                        return (
                            <motion.div
                                key={cap.title}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-30px" }}
                                transition={{ duration: 0.4, delay: (i % 3) * 0.1 }}
                            >
                                <Card className="group p-5 h-full bg-card/30 border-border hover:border-primary/20 hover:bg-card/60 transition-all duration-300">
                                    <div className="flex items-start gap-4">
                                        <div className="w-9 h-9 rounded-md bg-primary/[0.07] border border-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                                            <Icon className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-semibold text-foreground">
                                                {cap.title}
                                            </h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {cap.desc}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
