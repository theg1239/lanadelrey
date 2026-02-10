"use client";
import { useMemo, type ReactNode } from "react";
import { defineCatalog } from "@json-render/core";
import { JSONUIProvider, defineRegistry, Renderer, schema } from "@json-render/react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JsonRenderSpec } from "@/lib/types";

type RendererComponentProps<T> = {
    props: T;
    children?: ReactNode;
};

type StatItem = {
    label: string;
    value: string;
    tone?: string;
};

type EntityRow = {
    type: string;
    value: string;
    currency?: string;
    confidence?: number;
};

type ObligationRow = {
    text: string;
    speaker?: string;
    due_date?: string;
    confidence?: number;
};

type ReviewQueueRow = {
    field: string;
    current_value: string;
    suggested_value: string;
    rationale: string;
};

const catalog = defineCatalog(schema, {
    components: {
        InsightsLayout: {
            props: z.object({
                title: z.string(),
                subtitle: z.string().optional(),
            }),
            description: "Page layout for insights",
        },
        Section: {
            props: z.object({
                title: z.string(),
                description: z.string().optional(),
            }),
            description: "Section wrapper",
        },
        SummaryCard: {
            props: z.object({
                title: z.string(),
                text: z.string(),
            }),
            description: "Summary text card",
        },
        StatGrid: {
            props: z.object({
                items: z.array(
                    z.object({
                        label: z.string(),
                        value: z.string(),
                        tone: z.string().optional(),
                    })
                ),
            }),
            description: "Grid of KPI stats",
        },
        EntityTable: {
            props: z.object({
                title: z.string(),
                rows: z.array(
                    z.object({
                        type: z.string(),
                        value: z.string(),
                        currency: z.string().optional(),
                        confidence: z.number().optional(),
                    })
                ),
            }),
            description: "Entity table",
        },
        ObligationList: {
            props: z.object({
                title: z.string(),
                items: z.array(
                    z.object({
                        text: z.string(),
                        speaker: z.string().optional(),
                        due_date: z.string().optional(),
                        confidence: z.number().optional(),
                    })
                ),
            }),
            description: "Obligations list",
        },
        TagList: {
            props: z.object({
                title: z.string(),
                tags: z.array(z.string()),
            }),
            description: "List of tags",
        },
        ActionList: {
            props: z.object({
                title: z.string(),
                items: z.array(z.string()),
            }),
            description: "Action items list",
        },
        ConfidenceMeter: {
            props: z.object({
                label: z.string(),
                value: z.number(),
            }),
            description: "Confidence meter",
        },
        ReviewQueue: {
            props: z.object({
                title: z.string(),
                items: z.array(
                    z.object({
                        field: z.string(),
                        current_value: z.string(),
                        suggested_value: z.string(),
                        rationale: z.string(),
                    })
                ),
            }),
            description: "Review and correction queue",
        },
    },
    actions: {},
});

const { registry } = defineRegistry(catalog, {
    components: {
        InsightsLayout: ({ props, children }: RendererComponentProps<{ title: string; subtitle?: string }>) => (<div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
                    {props.subtitle && (<p className="text-xs text-muted-foreground">{props.subtitle}</p>)}
                </div>
                {children}
            </div>),
        Section: ({ props, children }: RendererComponentProps<{ title: string; description?: string }>) => (<Card className="p-4 bg-card/20 border-border/60">
                <div className="space-y-2">
                    <div>
                        <h4 className="text-xs font-mono tracking-wider uppercase text-muted-foreground/70">
                            {props.title}
                        </h4>
                        {props.description && (<p className="text-xs text-muted-foreground/60 mt-1">
                                {props.description}
                            </p>)}
                    </div>
                    {children}
                </div>
            </Card>),
        SummaryCard: ({ props }: RendererComponentProps<{ title: string; text: string }>) => (<Card className="p-4 bg-card/30 border-border/60">
                <h4 className="text-xs font-mono tracking-wider uppercase text-muted-foreground/70">
                    {props.title}
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed mt-2 font-serif">
                    {props.text}
                </p>
            </Card>),
        StatGrid: ({ props }: RendererComponentProps<{ items: StatItem[] }>) => (<div className="grid grid-cols-2 gap-2">
                {(Array.isArray(props.items) ? props.items : []).map((item: StatItem, idx: number) => (<div key={`${item.label}-${idx}`} className={cn("rounded-lg border border-border/60 bg-background/40 p-3", item.tone === "primary" && "border-primary/30")}>
                        <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/60">
                            {item.label}
                        </p>
                        <p className="text-sm font-semibold text-foreground mt-1">{item.value}</p>
                    </div>))}
            </div>),
        EntityTable: ({ props }: RendererComponentProps<{ title: string; rows: EntityRow[] }>) => (<div className="space-y-2">
                <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/60">
                    {props.title}
                </p>
                <div className="space-y-1">
                    {(Array.isArray(props.rows) ? props.rows : []).map((row: EntityRow, idx: number) => (<div key={`${row.type}-${idx}`} className="flex items-center justify-between rounded-md border border-border/60 bg-background/40 px-2.5 py-2">
                            <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
                                {row.type}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-foreground/80">
                                    {row.currency ? `${row.currency} ` : ""}{row.value}
                                </span>
                                {typeof row.confidence === "number" && (<Badge variant="outline" className="text-[9px]">
                                        {(row.confidence * 100).toFixed(0)}%
                                    </Badge>)}
                            </div>
                        </div>))}
                </div>
            </div>),
        ObligationList: ({ props }: RendererComponentProps<{ title: string; items: ObligationRow[] }>) => (<div className="space-y-2">
                <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/60">
                    {props.title}
                </p>
                <div className="space-y-2">
                    {(Array.isArray(props.items) ? props.items : []).map((item: ObligationRow, idx: number) => (<div key={`${item.text}-${idx}`} className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
                            <p className="text-xs text-foreground/80 font-serif leading-relaxed">
                                {item.text}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground/60 font-mono">
                                {item.speaker && <span>speaker {item.speaker}</span>}
                                {item.due_date && <span>due {item.due_date}</span>}
                                {typeof item.confidence === "number" && (
                                    <span>{(item.confidence * 100).toFixed(0)}% conf</span>
                                )}
                            </div>
                        </div>))}
                </div>
            </div>),
        TagList: ({ props }: RendererComponentProps<{ title: string; tags: string[] }>) => (<div className="space-y-2">
                <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/60">
                    {props.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {(Array.isArray(props.tags) ? props.tags : []).map((tag: string, idx: number) => (<Badge key={`${tag}-${idx}`} variant="secondary" className="text-[9px] font-mono uppercase tracking-widest">
                            {tag}
                        </Badge>))}
                </div>
            </div>),
        ActionList: ({ props }: RendererComponentProps<{ title: string; items: string[] }>) => (<div className="space-y-2">
                <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/60">
                    {props.title}
                </p>
                <ul className="space-y-1">
                    {(Array.isArray(props.items) ? props.items : []).map((item: string, idx: number) => (<li key={`${item}-${idx}`} className="text-xs text-foreground/70 flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/60 shrink-0"/>
                            {item}
                        </li>))}
                </ul>
            </div>),
        ConfidenceMeter: ({ props }: RendererComponentProps<{ label: string; value: number }>) => (<div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/60">
                        {props.label}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/60">
                        {(props.value * 100).toFixed(0)}%
                    </p>
                </div>
                <div className="h-2 rounded-full bg-border/50 overflow-hidden">
                    <div className="h-full bg-primary/70" style={{ width: `${Math.max(0, Math.min(1, props.value)) * 100}%` }}/>
                </div>
            </div>),
        ReviewQueue: ({ props }: RendererComponentProps<{ title: string; items: ReviewQueueRow[] }>) => (<div className="space-y-2">
                <p className="text-[10px] font-mono tracking-wider uppercase text-muted-foreground/60">
                    {props.title}
                </p>
                <div className="space-y-2">
                    {(Array.isArray(props.items) ? props.items : []).map((item: ReviewQueueRow, idx: number) => (<Card key={`${item.field}-${idx}`} className="p-3 bg-background/40 border-border/60">
                            <div className="space-y-1.5">
                                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/60">
                                    {item.field}
                                </p>
                                <p className="text-xs text-foreground/70">
                                    current: {item.current_value}
                                </p>
                                <p className="text-xs text-primary">
                                    suggested: {item.suggested_value}
                                </p>
                                <p className="text-[11px] text-muted-foreground/70">
                                    {item.rationale}
                                </p>
                            </div>
                        </Card>))}
                </div>
            </div>),
    },
});

type JsonRenderTreeNode = {
    type: string;
    props?: Record<string, unknown> | null;
    children?: JsonRenderTreeNode[] | null;
    visible?: unknown;
    on?: Record<string, unknown>;
    repeat?: {
        path?: string;
        key?: string;
    } | null;
};

type JsonRenderFlatElement = {
    type: string;
    props: Record<string, unknown>;
    children: string[];
    visible?: unknown;
    on?: Record<string, unknown>;
    repeat?: {
        path: string;
        key?: string;
    };
};

type JsonRenderFlatSpec = {
    root: string;
    elements: Record<string, JsonRenderFlatElement>;
    state?: Record<string, unknown>;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeFlatSpec = (raw: Record<string, unknown>): JsonRenderFlatSpec | null => {
    const root = raw.root;
    const elements = raw.elements;
    if (typeof root !== "string" || !isObjectRecord(elements)) {
        return null;
    }

    const normalizedElements: Record<string, JsonRenderFlatElement> = {};
    for (const [key, elementValue] of Object.entries(elements)) {
        if (!isObjectRecord(elementValue)) continue;
        const type = typeof elementValue.type === "string" ? elementValue.type : "";
        if (!type) continue;

        const props = isObjectRecord(elementValue.props) ? elementValue.props : {};
        const children = Array.isArray(elementValue.children)
            ? elementValue.children.filter((child): child is string => typeof child === "string")
            : [];

        const normalizedElement: JsonRenderFlatElement = {
            type,
            props,
            children,
        };

        if ("visible" in elementValue) {
            normalizedElement.visible = elementValue.visible;
        }
        if (isObjectRecord(elementValue.on)) {
            normalizedElement.on = elementValue.on;
        }
        if (isObjectRecord(elementValue.repeat) && typeof elementValue.repeat.path === "string") {
            normalizedElement.repeat = {
                path: elementValue.repeat.path,
                ...(typeof elementValue.repeat.key === "string"
                    ? { key: elementValue.repeat.key }
                    : {}),
            };
        }

        normalizedElements[key] = normalizedElement;
    }

    if (!normalizedElements[root]) {
        return null;
    }

    const normalizedSpec: JsonRenderFlatSpec = {
        root,
        elements: normalizedElements,
    };

    if (isObjectRecord(raw.state)) {
        normalizedSpec.state = raw.state;
    }

    return normalizedSpec;
};

const treeToFlatSpec = (rootNode: JsonRenderTreeNode): JsonRenderFlatSpec | null => {
    const elements: Record<string, JsonRenderFlatElement> = {};
    let counter = 0;

    const visit = (node: JsonRenderTreeNode): string | null => {
        if (!node || typeof node.type !== "string" || node.type.length === 0) {
            return null;
        }

        const key = `node_${counter++}`;
        const children: string[] = [];
        const nodeChildren = Array.isArray(node.children) ? node.children : [];
        for (const child of nodeChildren) {
            const childKey = visit(child);
            if (childKey) children.push(childKey);
        }

        const element: JsonRenderFlatElement = {
            type: node.type,
            props: isObjectRecord(node.props) ? node.props : {},
            children,
        };

        if (node.visible !== undefined) {
            element.visible = node.visible;
        }
        if (isObjectRecord(node.on)) {
            element.on = node.on;
        }
        if (isObjectRecord(node.repeat) && typeof node.repeat.path === "string") {
            element.repeat = {
                path: node.repeat.path,
                ...(typeof node.repeat.key === "string" ? { key: node.repeat.key } : {}),
            };
        }

        elements[key] = element;
        return key;
    };

    const root = visit(rootNode);
    if (!root) return null;

    return {
        root,
        elements,
    };
};

const normalizeSpec = (spec: JsonRenderSpec): JsonRenderFlatSpec | null => {
    if (!isObjectRecord(spec)) {
        return null;
    }

    const maybeFlat = normalizeFlatSpec(spec);
    if (maybeFlat) {
        return maybeFlat;
    }

    if (isObjectRecord(spec.root)) {
        return treeToFlatSpec(spec.root as JsonRenderTreeNode);
    }

    return null;
};

export function InsightsRenderer({ spec }: { spec: JsonRenderSpec }) {
    const normalizedSpec = useMemo(() => normalizeSpec(spec), [spec]);
    if (!normalizedSpec) {
        return (<InsightsFallback>
                Invalid insights UI spec returned by backend.
            </InsightsFallback>);
    }
    return (<JSONUIProvider registry={registry} initialState={normalizedSpec.state}>
            <Renderer spec={normalizedSpec as Parameters<typeof Renderer>[0]["spec"]} registry={registry} />
        </JSONUIProvider>);
}

export function InsightsFallback({ children }: { children?: ReactNode }) {
    return (<Card className="p-4 bg-card/20 border-border/60">
            <p className="text-xs text-muted-foreground">
                {children ?? "No insights spec available yet."}
            </p>
        </Card>);
}
