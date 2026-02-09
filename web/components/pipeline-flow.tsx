"use client";

import { motion } from "motion/react";
import { Mic, AudioWaveform, Brain, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

const stages = [
    {
        icon: Mic,
        number: "01",
        title: "Audio Ingestion",
        description: "Accept any audio/video format and normalize for analysis.",
        bullets: [
            "Multi-format audio/video support",
            "Noise & language detection",
            "Speaker diarization",
            "Call quality scoring",
            "Tamper & replay detection",
        ],
    },
    {
        icon: AudioWaveform,
        number: "02",
        title: "Financial Transcription",
        description:
            "Fintech-aware ASR with domain vocabulary and confidence scoring.",
        bullets: [
            "Domain vocabulary injection",
            "Confidence scoring per word",
            "Multi-lingual switching",
            "Profanity & PII detection",
            "Time-aligned transcripts",
        ],
    },
    {
        icon: Brain,
        number: "03",
        title: "Speech Understanding",
        description:
            "Extract structured intelligence from every financial conversation.",
        bullets: [
            "Intent classification",
            "Financial entity extraction",
            "Obligation & promise detection",
            "Emotion & stress markers",
            "Regulatory phrase detection",
        ],
    },
];

export function PipelineFlow() {
    return (
        <section id="pipeline" className="py-24 sm:py-32 px-6">
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
                        The Pipeline
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                        Three stages. Zero noise.
                    </h2>
                    <p className="text-muted-foreground max-w-lg mx-auto font-serif">
                        From raw audio to structured financial intelligence in seconds.
                    </p>
                </motion.div>

                {/* Pipeline stages */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    {stages.map((stage, i) => {
                        const Icon = stage.icon;
                        return (
                            <motion.div
                                key={stage.title}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.5, delay: i * 0.15 }}
                            >
                                <Card className="relative h-full p-6 bg-card/50 border-border hover:border-primary/30 transition-all duration-300 group">
                                    {/* Stage number */}
                                    <span className="absolute top-4 right-4 text-xs font-mono text-muted-foreground/30 tracking-widest">
                                        {stage.number}
                                    </span>

                                    {/* Icon */}
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                        <Icon className="w-5 h-5 text-primary" />
                                    </div>

                                    {/* Title & description */}
                                    <h3 className="text-lg font-semibold text-foreground mb-1.5">
                                        {stage.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                                        {stage.description}
                                    </p>

                                    {/* Bullets */}
                                    <ul className="space-y-1.5">
                                        {stage.bullets.map((bullet) => (
                                            <li
                                                key={bullet}
                                                className="flex items-start gap-2 text-xs text-muted-foreground/80"
                                            >
                                                <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                                                {bullet}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Arrow connector (not on last) */}
                                    {i < stages.length - 1 && (
                                        <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 items-center justify-center w-8 h-8 rounded-full bg-background border border-border">
                                            <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
