import { Brain, FileCode, GitGraph, Globe, Layers, ShieldCheck, Bot, Wand2 } from "lucide-react";
import daBoiAvatar from "../client/static/da-boi.webp";
import { BlogUrl, DocsUrl } from "../shared/common";
import type { GridFeature } from "./components/FeaturesGrid";

export const features: GridFeature[] = [
  {
    name: "Cognitive SAST Engine",
    description: "Beyond regex. AI detects logic flaws & architectural risks.",
    icon: <Brain className="w-6 h-6" />,
    href: DocsUrl,
    size: "large",
  },
  {
    name: "Context-Aware Analysis",
    description: "Understands frameworks & libraries to reduce false positives.",
    icon: <Layers className="w-6 h-6" />,
    href: DocsUrl,
    size: "small",
  },
  {
    name: "Deep Code Vision",
    description: "Analyzes surrounding code context for human-like precision.",
    icon: <FileCode className="w-6 h-6" />,
    href: DocsUrl,
    size: "small",
  },
  {
    name: "Architectural Flow",
    description: "Tracks data paths across files (Controller -> DB).",
    icon: <GitGraph className="w-6 h-6" />,
    href: DocsUrl,
    size: "medium",
  },
  {
    name: "Automated Research Pipeline",
    description: "Proactive zero-day detection via global intelligence.",
    icon: <Globe className="w-6 h-6" />,
    href: DocsUrl,
    size: "medium",
  },
  {
    name: "Tenant Isolation",
    description: "Non-root containers & AES-256 encryption for your IP.",
    icon: <ShieldCheck className="w-6 h-6" />,
    href: DocsUrl,
    size: "small",
  },
  {
    name: "AI Double Check",
    description: "Second opinion from world-class models to validate critical findings.",
    icon: <Bot className="w-6 h-6" />,
    href: DocsUrl,
    size: "large",
  },
  {
    name: "Generative Custom Rules",
    description: "Create bespoke SAST rules based on your specific tech stack.",
    icon: <Wand2 className="w-6 h-6" />,
    href: DocsUrl,
    size: "medium",
  },
];

export const testimonials = [
  {
    name: "Alex_S",
    role: "sec_ops@enterprise",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote: "The 'AI Double Check' feature eliminated 90% of our triage time. Real findings only.",
  },
  {
    name: "Sarah_K",
    role: "cto@fintech_startup",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote: "Finally, a scanner that understands our complex middleware flows instead of just flagging syntax.",
  },
  {
    name: "Mike_R",
    role: "devops@saas_platform",
    avatarSrc: daBoiAvatar,
    socialUrl: "#",
    quote: "Integration was trivial. One curl command to the API and we had results in JSON.",
  },
];

export const faqs = [
  {
    id: 1,
    question: "How secure is my code?",
    answer: "We use tenant isolation, ephemeral non-root containers, and AES-256 encryption to ensure your code is never exposed or persisted longer than necessary.",
    href: DocsUrl,
  },
  {
    id: 2,
    question: "How do I integrate this?",
    answer: "Simple REST API (POST /codeaudit/upload). CI/CD ready for GitHub Actions, GitLab CI, and Jenkins.",
    href: DocsUrl,
  },
  {
    id: 3,
    question: "What is 'AI Double Check'?",
    answer: "An optional second opinion from world-class models to validate critical findings and reduce false positives.",
    href: DocsUrl,
  },
];

export const footerNavigation = {
  app: [
    { name: "API Docs", href: DocsUrl },
    { name: "System Status", href: "#" },
    { name: "Dashboard", href: "#" },
  ],
  company: [
    { name: "Security Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Contact Support", href: "#" },
  ],
};

export const examples = []; // Empty as requested to remove

