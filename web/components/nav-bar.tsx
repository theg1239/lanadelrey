"use client";
import { AudioWaveform } from "lucide-react";
interface NavBarProps {
    showBackToHome?: boolean;
}
export function NavBar({ showBackToHome = true }: NavBarProps) {
    return (<header className="shrink-0 border-b border-border bg-card/30 backdrop-blur-sm sticky top-0 z-50">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
                <a href="/" className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                        <AudioWaveform className="h-3.5 w-3.5 text-primary-foreground"/>
                    </div>
                </a>

                <nav className="hidden sm:flex items-center gap-6">
                    {showBackToHome && (<a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Home
                        </a>)}
                    <a href="/get-started" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Get Started
                    </a>
                    <a href="/app" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Platform
                    </a>
                </nav>

                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500/60"/>
                    <span className="text-xs text-muted-foreground font-mono">
                        Online
                    </span>
                </div>
            </div>
        </header>);
}
