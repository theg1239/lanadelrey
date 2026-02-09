"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { UploadStatus } from "@/lib/types";
interface StatusStepperProps {
    status: UploadStatus;
}
const steps = [
    { key: "uploading", label: "Upload" },
    { key: "transcribing", label: "Transcribe" },
    { key: "done", label: "Complete" },
] as const;
function stepIndex(status: UploadStatus): number {
    if (status === "uploading")
        return 0;
    if (status === "transcribing")
        return 1;
    if (status === "done")
        return 2;
    return -1;
}
export function StatusStepper({ status }: StatusStepperProps) {
    const current = stepIndex(status);
    if (current < 0)
        return null;
    return (<motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5">
      {steps.map((step, i) => {
            const isActive = i === current;
            const isDone = i < current;
            return (<div key={step.key} className="flex items-center gap-1.5">
            {i > 0 && (<div className={cn("h-px w-5 transition-colors duration-500", isDone ? "bg-primary" : "bg-border")}/>)}
            <div className="flex items-center gap-1.5">
              <div className={cn("h-1.5 w-1.5 rounded-full transition-all duration-500", isDone && "bg-primary", isActive && "bg-primary animate-pulse", !isDone && !isActive && "bg-border")}/>
              <span className={cn("text-[11px] font-medium tracking-wide transition-colors duration-300", isActive && "text-primary", isDone && "text-foreground", !isDone && !isActive && "text-muted-foreground/50")}>
                {step.label}
              </span>
            </div>
          </div>);
        })}
    </motion.div>);
}
