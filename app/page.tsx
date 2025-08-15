'use client';

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Users, Shield, Brain, Landmark, BookOpen, Palette } from "lucide-react";

const TOPICS = [
  { id: "mental-health", title: "AI & Mental Health", icon: Brain,
    neutralCopy: "Explore AI’s impact on wellbeing, therapy, and mental health services.",
    nudgedCopy: "Discover surprising ways AI is transforming wellbeing—from therapy chatbots to mood tracking and support systems." },
  { id: "defenses", title: "AI Defenses", icon: Shield,
    neutralCopy: "Learn strategies to protect against harmful or malicious AI use.",
    nudgedCopy: "How do we defend against misuse? A practical tour of threat models, guardrails, and red-teaming." },
  { id: "personal-info", title: "Personal Information & AI", icon: Users,
    neutralCopy: "Understand how AI collects, uses, and safeguards personal data.",
    nudgedCopy: "What do models know about you? Tracking, profiling, and ways to reduce exposure." },
  { id: "politics", title: "AI & Politics", icon: Landmark,
    neutralCopy: "Examine AI’s role in elections, governance, and public opinion shaping.",
    nudgedCopy: "Campaigns, policy, and persuasion: AI’s growing influence in democratic processes." },
  { id: "education", title: "AI in Education", icon: BookOpen,
    neutralCopy: "Discuss AI as a tutor, grader, and student tool.",
    nudgedCopy: "From automated feedback to study companions: where AI helps and where it harms." },
  { id: "creativity", title: "AI & Creativity", icon: Palette,
    neutralCopy: "Discover how AI is used in art, music, and storytelling.",
    nudgedCopy: "Art, music, and writing with models—new workflows and the debate over authorship." }
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
  // Default to nudged in canvas preview; allow URL override via ?v=neutral or ?v=nudged
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
      const rows = [["variant", "choice", "timestamp", "userAgent"], ...prev.map((r: any) => [r.variant, r.choice, r.ts, r.userAgent])];
      const csv = rows.map((row) => row.map((c) => JSON.stringify(c ?? "")).join(",")).join("\n");
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
          {/* Intentionally not showing the variant name to students */}
        </header>

        {!submitted ? (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map((t) => (
                <Card key={t.id} className={variant === "nudged" && t.id === targetId ? "relative border-2 border-emerald-400 shadow-lg scale-[1.03]" : ""}>
                  <CardHeader className="flex flex-row items-center gap-3">
                    <div className={variant === "nudged" && t.id === targetId ? "p-2 rounded-xl bg-emerald-50" : "p-2 rounded-xl bg-gray-100"}>
                      <t.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base md:text-lg flex items-center gap-2">
                        {t.title}
                        {variant === "nudged" && t.id === targetId && (
                          <Badge variant="secondary" className="text-xs">Guest lecture: Emily Wall</Badge>
                        )}
                      </CardTitle>
                    </div>
                    <div>
                      <input type="radio" name="topic" value={t.id} className="w-5 h-5" checked={choice === t.id} onChange={() => setChoice(t.id)} disabled={variant === "nudged" && t.id !== targetId && !expanded[t.id]} aria-describedby={`${t.id}-desc`} />
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
                              <Button type="button" onClick={() => handleExpand(t.id)} variant="outline" className="text-xs">Read more</Button>
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
            {/* Intentionally not showing the variant to students on the thank-you screen */}
            {downloadUrl && <a href={downloadUrl} download={`autonomy-demo.csv`} className="inline-block mt-4 text-sm underline">Download local CSV backup</a>}
          </Card>
        )}

        {debug && (
          <div className="mt-4 text-center">
            <div className="inline-flex gap-2">
              <Button size="sm" variant={variant === "neutral" ? "default" : "outline"} onClick={() => setVariant("neutral")}>Preview Neutral</Button>
              <Button size="sm" variant={variant === "nudged" ? "default" : "outline"} onClick={() => setVariant("nudged")}>Preview Nudged</Button>
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
