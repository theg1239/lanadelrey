import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
export function formatMs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}
export function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m === 0)
        return `${s}s`;
    return `${m}m ${s}s`;
}
export function formatFileSize(bytes: number): string {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export function confidenceColor(c: number): string {
    if (c >= 0.9)
        return "text-emerald-400";
    if (c >= 0.7)
        return "text-amber-400";
    return "text-red-400";
}
export function confidenceLabel(c: number): string {
    if (c >= 0.9)
        return "high";
    if (c >= 0.7)
        return "medium";
    return "low";
}
