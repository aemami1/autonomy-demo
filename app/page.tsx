'use client';

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Users, Shield, Brain, Landmark, BookOpen, Palette } from "lucide-react";

/**
 * NOTE: This version removes shadcn/ui imports so it builds on a fresh Next.js app
 * with only Tailwind and lucide-react installed. The small UI primitives below
 * (Card, Button, Badge, etc.) are minimal Tailwind-styled components.
 */

// --- Minimal UI primitives (no external UI lib) -------------------------------
function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={classNames("rounded-2xl border bg-white", className)}>{children}</div>;
}
function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={classNames("px-4 py-3 border-b flex items-center", className)}>{children}</div>;
}
function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={classNames("px-4 py-4", className)}>{children}</div>;
}
function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={classNames("font-semibold", className)}>{children}</div>;
}
function Button({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={classNames(
        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium border",
        "bg-gray-50 hover:bg-gray-100 active:bg-gray-200",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={classNames("inline-flex items-center rounded-lg border px-2 py-0.5 text-xs bg-gray-50", className)}>
      {children}
    </span>
  );
}

// --- Topics master list -------------------------------------------------------
const TOPICS = [
  {
    id: "mental-health",
    title: "AI & Mental Health",
    icon: Brain,
    neutralCopy: "Explore AI’s impact on wellbeing, therapy, and mental health services.",
    nudgedCopy:
      "Discover surprising ways AI is transforming wellbeing—from therapy chatbots to mood tracking and support systems.",
  },
  {
    id: "defenses",
    title: "AI Defenses",
    icon: Shield,
    neutralCopy: "Learn strategies to protect against harmful or malicious AI use.",
    nudgedCopy:
      "How do we defend against misuse? A practical tour of threat models, guardrails, and red-teaming.",
  },
  {
    id: "personal-info",
    title: "Personal Information & AI",
    icon: Users,
    neutralCopy: "Understand how AI collects, uses, and safeguards personal data.",
    nudgedCopy:
      "What do models know about you? Tracking, profiling, and ways to reduce exposure.",
  },
  {
    id: "politics",
    title: "AI & Politics",
    icon: Landmark,
    neutralCopy: "Examine AI’s role in elections, governance, and public opinion shaping.",
    nudgedCopy: "Campaigns, policy, and persuasion: AI’s growing influence in democratic processes.",
  },
  {
    id: "education",
    title: "AI in Education",
    icon: BookOpen,
    neutralCopy: "Discuss AI as a tutor, grader, and student tool.",
    nudgedCopy: "From automated feedback to study companions: where AI helps and where it harms.",
  },
  {
    id: "creativity",
    title: "AI & Creativity",
    icon: Palette,
    neutralCopy: "Discover how AI is used in art, music, and storytelling.",
    nudgedCopy: "Art, music, and writing with models—new workflows and the debate over authorship.",
  },
] as const;

type Topic = typeof TOPICS[number];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getQueryParam(name: string) {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  return p.get(name);
}

export default function AutonomyDemo() {
  // Default to nudged in preview; override via ?v=neutral or ?v=nudged
  const [variant, setVariant] = useState<"neutral" | "nudged">("nudged");
  const debug = getQueryParam("debug") === "1";
  const targetId = "mental-health";

  useEffect(() => {
    const v = (getQueryParam("v") || "").toLowerCase();
    if (v === "neutral" || v === "nudged") setVariant(v as any);
  }, []);

  const topics = useMemo(() => {
    if (variant === "neutral") {
      return shuffle([...TOPICS]);
    } else {
      const target = TOPICS.find((t) => t.id === targetId)!;
      const rest = TOPICS.filter((t) => t.id !== targetId);
      return [target, ...rest];
    }
  }, [variant]);

  const [choice, setChoice] = useState<string | null>("mental-health");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    setChoice(variant === "nudged" ? targetId : null);
    setExpanded({});
  }, [variant]);

  const handleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!choice) return;

    const payload = { variant, choice, ts: new Date().toISOString(), userAgent: navigator.userAgent };
    try {
      const key = `autonomy-demo-local-${variant}`;
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      prev.push(payload);
      localStorage.setItem(key, JSON.stringify(prev));
      const rows: string[][] = [["variant", "choice", "timestamp", "userAgent"],
        ...prev.map((r: any) => [String(r.variant), String(r.choice), String(r.ts), String(r.userAgent)])];
      const csv = rows
        .map((row: string[]) => row.map((c: string) => JSON.stringify(c ?? "")).join(","))
        .join("");
      const blob = new Blob([csv], { type: "text/csv" });
      setDownloadUrl(URL.createObjectURL(blob));
    } catch {}

    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <header className="mb-6 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Vote for our special topics lecture</h1>
        </header>

        {!submitted ? (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((t) => (
                <Card key={t.id} className={variant === "nudged" && t.id === targetId ? "relative border-2 border-emerald-400 shadow-lg scale-[1.03]" : ""}>
                  <CardHeader className="gap-3">
                    <div className={variant === "nudged" && t.id === targetId ? "p-2 rounded-xl bg-emerald-50 mr-3" : "p-2 rounded-xl bg-gray-100 mr-3"}>
                      <t.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        {t.title}
                        {variant === "nudged" && t.id === targetId && (
                          <Badge className="text-xs">Guest lecture: Emily Wall</Badge>
                        )}
                      </CardTitle>
                    </div>
                    <div className="ml-auto">
                      <input
                        type="radio"
                        name="topic"
                        value={t.id}
                        className="w-5 h-5"
                        checked={choice === t.id}
                        onChange={() => setChoice(t.id)}
                        disabled={variant === "nudged" && t.id !== targetId && !expanded[t.id]}
                        aria-describedby={`${t.id}-desc`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {variant === "neutral" ? (
                      <p id={`${t.id}-desc`} className="text-sm text-gray-700">{t.neutralCopy}</p>
                    ) : (
                      <div>
                        {t.id === targetId ? (
                          <p id={`${t.id}-desc`} className="text-sm text-gray-700">{t.nudgedCopy}</p>
                        ) : (
                          <div>
                            {!expanded[t.id] ? (
                              <Button type="button" onClick={() => handleExpand(t.id)} className="text-xs">Read more</Button>
                            ) : (
                              <p id={`${t.id}-desc`} className="text-sm text-gray-700">{t.neutralCopy}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {variant === "nudged" && t.id === targetId && (
                      <div className="mt-3 flex items-center gap-2 text-emerald-700 text-xs">
                        <CheckCircle className="w-4 h-4" /> My favorite
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">Your response is anonymous. Submitting records choice and timestamp.</p>
              <Button type="submit" disabled={!choice}>Submit</Button>
            </div>
          </form>
        ) : (
          <Card className="p-6 text-center">
            <h2 className="text-xl font-semibold">Thanks for voting!</h2>
            <p className="text-sm text-gray-600 mt-2">You chose: <span className="font-medium">{prettyTitle(choice!, TOPICS)}</span></p>
            {downloadUrl && (
              <a href={downloadUrl} download={`autonomy-demo.csv`} className="inline-block mt-4 text-sm underline">
                Download local CSV backup
              </a>
            )}
          </Card>
        )}

        {debug && (
          <div className="mt-4 text-center">
            <div className="inline-flex gap-2">
              <Button className={variant === "neutral" ? "bg-gray-200" : ""} onClick={() => setVariant("neutral")}>Preview Neutral</Button>
              <Button className={variant === "nudged" ? "bg-gray-200" : ""} onClick={() => setVariant("nudged")}>Preview Nudged</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function prettyTitle(id: string, topics: readonly Topic[]) {
  const topic = topics.find((t) => t.id === id);
  return topic ? topic.title : id;
}
