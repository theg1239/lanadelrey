"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

const useCases = [
    {
        id: "transcription",
        title: "Call Transcription",
        desc: "Transcribe and analyze customer support, onboarding, and verification calls.",
    },
    {
        id: "kyc",
        title: "KYC Verification",
        desc: "Process tele-KYC calls with identity verification and compliance checks.",
    },
    {
        id: "collections",
        title: "Collections Analysis",
        desc: "Track payment promises, commitments, and customer intent from collections calls.",
    },
    {
        id: "compliance",
        title: "Compliance Audit",
        desc: "Scan calls for regulatory phrases, consent statements, and compliance gaps.",
    },
];

const pipelineOptions = [
    {
        id: "noise",
        label: "Noise Detection",
        desc: "Flag low-quality audio and background noise",
        default: true,
    },
    {
        id: "diarization",
        label: "Speaker Diarization",
        desc: "Separate agent vs. customer speakers",
        default: true,
    },
    {
        id: "pii",
        label: "PII Redaction",
        desc: "Auto-mask sensitive personal information",
        default: false,
    },
    {
        id: "confidence",
        label: "Confidence Scoring",
        desc: "Per-word transcription confidence ratings",
        default: true,
    },
    {
        id: "entities",
        label: "Entity Extraction",
        desc: "Pull amounts, dates, and named entities",
        default: true,
    },
    {
        id: "obligations",
        label: "Obligation Detection",
        desc: "Detect promises and commitments",
        default: false,
    },
];

const TOTAL_STEPS = 4;

export function OnboardingFlow() {
    const [step, setStep] = useState(0);
    const [selectedUseCase, setSelectedUseCase] = useState<string | null>(null);
    const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(pipelineOptions.map((o) => [o.id, o.default]))
    );

    const handleToggle = useCallback((id: string, checked: boolean) => {
        setToggles((prev) => ({ ...prev, [id]: checked }));
    }, []);

    const canProceed =
        step === 0 || step === 2 || step === 3 || (step === 1 && selectedUseCase);

    return (
        <div className="min-h-[100dvh] flex flex-col bg-background">
            <header className="shrink-0 border-b border-border bg-card/30 backdrop-blur-sm">
                <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
                    <a href="/" className="text-sm font-semibold tracking-tight text-foreground">
                        Delrey
                    </a>

                    <div className="flex items-center gap-2">
                        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === step
                                        ? "w-6 bg-primary"
                                        : i < step
                                            ? "w-1.5 bg-primary/50"
                                            : "w-1.5 bg-border"
                                    }`}
                            />
                        ))}
                    </div>

                    <span className="text-xs font-mono text-muted-foreground">
                        Step {step + 1}/{TOTAL_STEPS}
                    </span>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center px-6 py-12">
                <div className="w-full max-w-2xl">
                    <AnimatePresence mode="wait">
                        {/* Step 0: Welcome */}
                        {step === 0 && (
                            <motion.div
                                key="welcome"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="text-center space-y-6"
                            >
                                <div className="space-y-2">
                                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                        Welcome to Delrey
                                    </h1>
                                    <p className="text-muted-foreground font-serif max-w-md mx-auto leading-relaxed">
                                        Let&apos;s set up your audio intelligence pipeline. This takes
                                        about 30 seconds and will personalize your experience.
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                    {["Transcription", "Entity Extraction", "Intent Analysis", "Compliance"].map(
                                        (tag) => (
                                            <Badge
                                                key={tag}
                                                variant="secondary"
                                                className="text-xs font-mono px-2 py-0.5"
                                            >
                                                {tag}
                                            </Badge>
                                        )
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 1: Use Case */}
                        {step === 1 && (
                            <motion.div
                                key="usecase"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                        What are you analyzing?
                                    </h2>
                                    <p className="text-sm text-muted-foreground font-serif">
                                        Select your primary use case to customize the pipeline.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {useCases.map((uc) => {
                                        const isSelected = selectedUseCase === uc.id;
                                        return (
                                            <Card
                                                key={uc.id}
                                                onClick={() => setSelectedUseCase(uc.id)}
                                                className={`relative cursor-pointer p-4 transition-all duration-200 ${isSelected
                                                        ? "border-primary bg-primary/[0.05] ring-1 ring-primary/30"
                                                        : "border-border hover:border-muted-foreground/30 bg-card/30"
                                                    }`}
                                            >
                                                <div>
                                                    <h3 className="text-sm font-semibold text-foreground">
                                                        {uc.title}
                                                    </h3>
                                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                        {uc.desc}
                                                    </p>
                                                </div>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="absolute top-3 right-3"
                                                    >
                                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                                    </motion.div>
                                                )}
                                            </Card>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Configure Pipeline */}
                        {step === 2 && (
                            <motion.div
                                key="configure"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                        Configure your pipeline
                                    </h2>
                                    <p className="text-sm text-muted-foreground font-serif">
                                        Toggle the features you need. You can change these later.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {pipelineOptions.map((opt) => (
                                        <Card
                                            key={opt.id}
                                            className="flex items-center justify-between p-4 bg-card/30 border-border"
                                        >
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-medium text-foreground">
                                                    {opt.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {opt.desc}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={toggles[opt.id]}
                                                onCheckedChange={(checked) =>
                                                    handleToggle(opt.id, checked)
                                                }
                                            />
                                        </Card>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Ready */}
                        {step === 3 && (
                            <motion.div
                                key="ready"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="text-center space-y-6"
                            >
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                        You&apos;re all set
                                    </h2>
                                    <p className="text-sm text-muted-foreground font-serif max-w-md mx-auto">
                                        Your pipeline is configured and ready. Upload your first
                                        audio file to begin.
                                    </p>
                                </div>

                                <Card className="max-w-sm mx-auto p-4 bg-card/30 border-border text-left space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                                            Use Case
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                            {useCases.find((u) => u.id === selectedUseCase)?.title ||
                                                "General"}
                                        </Badge>
                                    </div>
                                    <div className="border-t border-border pt-3 space-y-1.5">
                                        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                                            Active Features
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {pipelineOptions
                                                .filter((o) => toggles[o.id])
                                                .map((o) => (
                                                    <Badge
                                                        key={o.id}
                                                        variant="secondary"
                                                        className="text-[10px] font-mono"
                                                    >
                                                        {o.label}
                                                    </Badge>
                                                ))}
                                        </div>
                                    </div>
                                </Card>

                                <a
                                    href="/app"
                                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
                                >
                                    Launch Platform →
                                </a>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <footer className="shrink-0 border-t border-border bg-card/30">
                <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step === 0}
                        className="gap-1.5"
                    >
                        ← Back
                    </Button>

                    {step < TOTAL_STEPS - 1 ? (
                        <Button
                            size="sm"
                            onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
                            disabled={!canProceed}
                            className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            Continue →
                        </Button>
                    ) : (
                        <a href="/app">
                            <Button
                                size="sm"
                                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                Launch Platform →
                            </Button>
                        </a>
                    )}
                </div>
            </footer>
        </div>
    );
}
