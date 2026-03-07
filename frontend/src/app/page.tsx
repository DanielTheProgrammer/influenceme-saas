"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
    return String(n);
}

interface FeaturedInfluencer {
    id: number;
    display_name: string;
    bio: string | null;
    profile_picture_url: string | null;
    instagram_handle: string | null;
    followers_count: number | null;
    services: { engagement_type: string; price: number }[];
}

const PROOF_TYPES = [
    { name: "Story Feature", desc: "Get featured in a story. Your network sees exactly who you're with.", price: "$50–$200", tag: "VISIBILITY BOOST", num: "01" },
    { name: "Comment Drop", desc: "A comment on your post from an attractive person. Visible to all your followers.", price: "$15–$50", tag: "QUICK VALIDATION", num: "02" },
    { name: "Post Shoutout", desc: "Be featured in a dedicated post. Maximum visibility to their entire audience.", price: "$100–$500", tag: "MAXIMUM IMPACT", num: "03" },
    { name: "Tag Feature", desc: "Get tagged in a story or post. Appears across their network.", price: "$25–$100", tag: "NETWORK EXPANSION", num: "04" },
    { name: "DM Validation", desc: "A personal message from an attractive person. Screenshot-worthy.", price: "$20–$75", tag: "PERSONAL CONFIDENCE", num: "05" },
    { name: "Collab Content", desc: "Co-created content. Both audiences see you together.", price: "$200–$1K+", tag: "ULTIMATE PROOF", num: "06" },
];

const TICKER_ITEMS = ["Story Feature", "Comment Drop", "Post Shoutout", "Tag Feature", "DM Validation", "Collab Content"];

const TESTIMONIALS = [
    {
        quote: "My ex started DMing me again within 48 hours. I just needed the right story features. Leaky delivered exactly that.",
        name: "Alex K.",
        role: "Post-breakup strategy",
        avatar: "https://i.pravatar.cc/64?u=alex_leaky",
    },
    {
        quote: "My Hinge likes literally tripled after getting tagged in a few photos with actual attractive people. This is just strategy.",
        name: "Priya M.",
        role: "Dating profile optimization",
        avatar: "https://i.pravatar.cc/64?u=priya_leaky",
    },
    {
        quote: "I used Leaky to break into the NY fitness scene. Got featured by three local influencers. Client list doubled in 6 weeks.",
        name: "Derek R.",
        role: "Personal trainer, New York",
        avatar: "https://i.pravatar.cc/64?u=derek_leaky",
    },
];

const HOW_IT_WORKS = [
    {
        num: "01",
        title: "Pick your creator",
        desc: "Browse verified creators. Filter by proof type, price, and audience size. Find exactly the right person for your narrative.",
    },
    {
        num: "02",
        title: "Submit your request",
        desc: "Tell them what you need. Use our AI studio to preview the outcome. Pay securely — funds held in escrow until delivery.",
    },
    {
        num: "03",
        title: "Verify and release",
        desc: "The creator delivers proof. You confirm. Funds release. Your story is now in the world. Simple, protected, effective.",
    },
];

export default function HomePage() {
    const [featured, setFeatured] = useState<FeaturedInfluencer[]>([]);

    useEffect(() => {
        fetch(`${API_URL}/marketplace/influencers`)
            .then((r) => r.json())
            .then((data: FeaturedInfluencer[]) => {
                setFeatured(data.filter((i) => i.profile_picture_url).slice(0, 6));
            })
            .catch(() => {});
    }, []);

    return (
        <div className="bg-lk-black min-h-screen">

            {/* ── HERO ─────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16">
                {/* Ambient glow blobs */}
                <div className="absolute -top-32 -left-32 w-[700px] h-[700px] rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(240,165,0,0.06) 0%, transparent 70%)" }} />
                <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(0,205,180,0.05) 0%, transparent 70%)" }} />

                {/* Giant watermark LEAKY */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span
                        className="text-[22vw] font-black leading-none tracking-[-0.05em] text-outline-amber"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        LEAKY
                    </span>
                </div>

                <div className="relative max-w-6xl mx-auto px-5 pt-20 pb-24 text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 border border-lk-border-bright bg-lk-surface/70 backdrop-blur-sm rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-lk-muted-bright uppercase mb-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-lk-cyan animate-pulse" />
                        Social Proof Marketplace
                    </div>

                    {/* Headline */}
                    <h1
                        className="font-black leading-[0.88] tracking-[-0.04em] mb-8"
                        style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(3rem, 10vw, 7rem)" }}
                    >
                        <span className="text-lk-white block">Buy the story.</span>
                        <span className="text-lk-amber block">Own the narrative.</span>
                    </h1>

                    {/* Sub */}
                    <p className="text-lk-muted-bright text-xl md:text-2xl mb-3 max-w-xl mx-auto">
                        Make them wonder who you&apos;re with.
                    </p>
                    <p className="text-lk-muted text-sm md:text-base mb-12 max-w-2xl mx-auto leading-relaxed">
                        Get tagged, featured, and validated by attractive, successful people.
                        Engineered social proof. Real results. Your network will notice.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center mb-20">
                        <Link
                            href="/browse"
                            className="px-8 py-4 bg-lk-amber text-lk-black font-bold rounded-full text-base tracking-wide hover:brightness-110 transition-all shadow-lg hover:shadow-lk-amber/20 hover:-translate-y-0.5"
                        >
                            Explore Creators →
                        </Link>
                        <Link
                            href="/register"
                            className="px-8 py-4 border border-lk-border-bright text-lk-white font-semibold rounded-full text-base tracking-wide hover:border-lk-muted-bright hover:bg-lk-surface transition-all"
                        >
                            Earn as a Model
                        </Link>
                    </div>

                    {/* Stats */}
                    <div className="inline-flex flex-wrap gap-8 md:gap-14 justify-center border border-lk-border rounded-2xl bg-lk-surface/50 backdrop-blur-sm px-8 py-5">
                        {[
                            { v: "250K+", l: "Models & Influencers" },
                            { v: "4.8M+", l: "Proof Moments Delivered" },
                            { v: "96%", l: "Satisfaction Rate" },
                        ].map((s) => (
                            <div key={s.l} className="text-center">
                                <div
                                    className="text-2xl md:text-3xl font-extrabold text-lk-white"
                                    style={{ fontFamily: "var(--font-syne)" }}
                                >
                                    {s.v}
                                </div>
                                <div className="text-[11px] text-lk-muted mt-1 tracking-wide uppercase">{s.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SCROLLING TICKER ────────────────────────────────── */}
            <div className="border-y border-lk-border bg-lk-surface overflow-hidden py-3.5">
                <div className="flex animate-marquee whitespace-nowrap">
                    {[...Array(4)].map((_, i) => (
                        <span key={i} className="flex items-center">
                            {TICKER_ITEMS.map((t) => (
                                <span key={t} className="inline-flex items-center gap-3 mx-8 text-[11px] font-semibold tracking-[0.2em] text-lk-muted-bright uppercase">
                                    <span className="text-lk-amber text-base">✦</span>
                                    {t}
                                </span>
                            ))}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── PROOF TYPES ─────────────────────────────────────── */}
            <section className="py-28 px-5 bg-lk-black">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-16">
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-5">The Proof Types</p>
                        <h2
                            className="font-black leading-tight tracking-[-0.03em]"
                            style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
                        >
                            <span className="text-lk-white">Six ways to</span><br />
                            <span className="text-lk-cyan">engineer your story.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {PROOF_TYPES.map((pt) => (
                            <div
                                key={pt.name}
                                className="bg-lk-surface border border-lk-border rounded-2xl p-6 hover:border-lk-border-bright hover:bg-lk-surface-2 transition-all group cursor-default"
                            >
                                <div className="flex items-start justify-between mb-5">
                                    <span className="text-[10px] font-bold tracking-[0.18em] text-lk-muted uppercase">{pt.tag}</span>
                                    <span
                                        className="text-3xl font-black text-lk-border-bright group-hover:text-lk-amber transition-colors"
                                        style={{ fontFamily: "var(--font-syne)" }}
                                    >
                                        {pt.num}
                                    </span>
                                </div>
                                <h3
                                    className="font-bold text-lg text-lk-white mb-2"
                                    style={{ fontFamily: "var(--font-syne)" }}
                                >
                                    {pt.name}
                                </h3>
                                <p className="text-sm text-lk-muted leading-relaxed mb-4">{pt.desc}</p>
                                <p className="text-lk-amber font-semibold text-sm tracking-wide">{pt.price}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ────────────────────────────────────── */}
            <section className="py-28 px-5 border-y border-lk-border bg-lk-surface/30">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-16">
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-5">The Play</p>
                        <h2
                            className="font-black leading-tight tracking-[-0.03em]"
                            style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
                        >
                            <span className="text-lk-white">Three steps.</span><br />
                            <span className="text-lk-muted-bright">Zero guesswork.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {HOW_IT_WORKS.map((step, i) => (
                            <div key={step.num} className="relative">
                                {/* Connector line (desktop) */}
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-8 left-[calc(100%+1rem)] w-8 h-px bg-lk-border-bright" />
                                )}
                                <div
                                    className="text-6xl font-black text-lk-border mb-5 leading-none"
                                    style={{ fontFamily: "var(--font-syne)" }}
                                >
                                    {step.num}
                                </div>
                                <h3
                                    className="font-bold text-xl text-lk-white mb-3"
                                    style={{ fontFamily: "var(--font-syne)" }}
                                >
                                    {step.title}
                                </h3>
                                <p className="text-lk-muted text-sm leading-relaxed">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FEATURED CREATORS ───────────────────────────────── */}
            {featured.length > 0 && (
                <section className="py-28 px-5 bg-lk-black">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-end justify-between mb-14">
                            <div>
                                <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-5">On Leaky Now</p>
                                <h2
                                    className="font-black text-lk-white leading-tight tracking-[-0.03em]"
                                    style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
                                >
                                    Meet the creators.
                                </h2>
                            </div>
                            <Link
                                href="/browse"
                                className="hidden md:inline-flex items-center gap-1.5 text-sm font-semibold text-lk-muted-bright hover:text-lk-amber transition-colors tracking-wide"
                            >
                                View all <span className="text-lk-amber">→</span>
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {featured.map((inf) => {
                                const minPrice = inf.services.length ? Math.min(...inf.services.map((s) => s.price)) : null;
                                return (
                                    <Link
                                        key={inf.id}
                                        href={`/influencers/${inf.id}`}
                                        className="group bg-lk-surface border border-lk-border hover:border-lk-amber/40 rounded-2xl p-4 text-center transition-all duration-200"
                                    >
                                        <div className="relative mx-auto w-14 h-14 mb-3">
                                            <Image
                                                src={inf.profile_picture_url!}
                                                alt={inf.display_name}
                                                width={56}
                                                height={56}
                                                className="w-14 h-14 rounded-full object-cover border-2 border-lk-border group-hover:border-lk-amber/50 transition-colors"
                                                unoptimized
                                            />
                                        </div>
                                        <p
                                            className="font-bold text-xs text-lk-white truncate leading-tight group-hover:text-lk-amber transition-colors"
                                            style={{ fontFamily: "var(--font-syne)" }}
                                        >
                                            {inf.display_name}
                                        </p>
                                        {inf.followers_count && (
                                            <p className="text-[10px] text-lk-muted mt-0.5">{formatFollowers(inf.followers_count)}</p>
                                        )}
                                        {minPrice !== null && (
                                            <p className="text-[11px] font-bold text-lk-amber mt-1">from ${minPrice}</p>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="text-center mt-8 md:hidden">
                            <Link href="/browse" className="text-sm font-semibold text-lk-muted-bright hover:text-lk-amber transition-colors">
                                View all creators →
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ── TESTIMONIALS ────────────────────────────────────── */}
            <section className="py-28 px-5 border-t border-lk-border bg-lk-surface/20">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-14">
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-5">Real Results</p>
                        <h2
                            className="font-black text-lk-white leading-tight tracking-[-0.03em]"
                            style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
                        >
                            They won their narrative.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {TESTIMONIALS.map((t) => (
                            <div key={t.name} className="bg-lk-surface border border-lk-border rounded-2xl p-7 hover:border-lk-border-bright transition-all">
                                <div
                                    className="text-5xl font-black text-lk-amber/20 leading-none mb-4 select-none"
                                    style={{ fontFamily: "var(--font-syne)" }}
                                >
                                    &ldquo;
                                </div>
                                <p className="text-lk-white/80 text-sm leading-relaxed mb-6 italic">{t.quote}</p>
                                <div className="flex items-center gap-3">
                                    <Image src={t.avatar} alt={t.name} width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-lk-border" unoptimized />
                                    <div>
                                        <p className="text-sm font-bold text-lk-white" style={{ fontFamily: "var(--font-syne)" }}>{t.name}</p>
                                        <p className="text-xs text-lk-muted">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRICING ─────────────────────────────────────────── */}
            <section className="py-28 px-5 bg-lk-black border-t border-lk-border">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-5">Pricing</p>
                        <h2
                            className="font-black text-lk-white leading-tight tracking-[-0.03em]"
                            style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
                        >
                            Affordable proof.<br />
                            <span className="text-lk-muted-bright">Real results.</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* Fan */}
                        <div className="bg-lk-surface border border-lk-border rounded-2xl p-7">
                            <p className="text-[10px] font-bold text-lk-muted uppercase tracking-[0.18em] mb-6">For Everyone</p>
                            <div
                                className="text-4xl font-black text-lk-white mb-1"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                Free
                            </div>
                            <p className="text-lk-muted text-sm mb-7">Always, forever</p>
                            <ul className="space-y-3 text-sm text-lk-muted-bright mb-8">
                                {["Browse all creators", "AI preview generation", "Secure escrow payments", "Request tracking"].map((item) => (
                                    <li key={item} className="flex items-center gap-2.5">
                                        <span className="text-lk-cyan text-base">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="block w-full py-3 border border-lk-border-bright text-lk-white text-sm font-bold rounded-full text-center hover:border-lk-muted-bright hover:bg-lk-surface-2 transition-all">
                                Get Started
                            </Link>
                        </div>

                        {/* Creator Basic */}
                        <div className="bg-lk-surface border border-lk-border rounded-2xl p-7">
                            <p className="text-[10px] font-bold text-lk-muted uppercase tracking-[0.18em] mb-6">For Creators</p>
                            <div
                                className="text-4xl font-black text-lk-white mb-1"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                Free
                            </div>
                            <p className="text-lk-muted text-sm mb-7">20% platform fee</p>
                            <ul className="space-y-3 text-sm text-lk-muted-bright mb-8">
                                {["List up to 3 services", "Accept & counter-offer", "Proof-based escrow", "Earnings dashboard"].map((item) => (
                                    <li key={item} className="flex items-center gap-2.5">
                                        <span className="text-lk-cyan text-base">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="block w-full py-3 border border-lk-border-bright text-lk-white text-sm font-bold rounded-full text-center hover:border-lk-muted-bright hover:bg-lk-surface-2 transition-all">
                                Join as Creator
                            </Link>
                        </div>

                        {/* Creator Pro */}
                        <div className="bg-lk-surface rounded-2xl p-7 relative border border-lk-amber/30" style={{ boxShadow: "0 0 40px rgba(240,165,0,0.06)" }}>
                            <div className="absolute -top-3 left-6 bg-lk-amber text-lk-black text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">
                                Most Popular
                            </div>
                            <p className="text-[10px] font-bold text-lk-amber uppercase tracking-[0.18em] mb-6">Pro Creator</p>
                            <div
                                className="text-4xl font-black text-lk-white mb-1"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                $29
                            </div>
                            <p className="text-lk-muted text-sm mb-7">per month · 10% fee</p>
                            <ul className="space-y-3 text-sm text-lk-white/70 mb-8">
                                {["Unlimited services", "Reduced 10% fee", "Priority placement", "Advanced analytics", "Stripe Connect payouts"].map((item) => (
                                    <li key={item} className="flex items-center gap-2.5">
                                        <span className="text-lk-amber text-base">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="block w-full py-3 bg-lk-amber text-lk-black text-sm font-bold rounded-full text-center hover:brightness-110 transition-all">
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ───────────────────────────────────────── */}
            <section className="py-32 px-5 border-t border-lk-border relative overflow-hidden">
                {/* Glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[600px] h-[300px] rounded-full"
                        style={{ background: "radial-gradient(ellipse, rgba(240,165,0,0.07) 0%, transparent 70%)" }} />
                </div>

                <div className="relative max-w-3xl mx-auto text-center">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-lk-amber uppercase mb-8">Your Move</p>
                    <h2
                        className="font-black text-lk-white leading-[0.9] tracking-[-0.04em] mb-8"
                        style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(3rem, 8vw, 5.5rem)" }}
                    >
                        Your moment<br />
                        <span className="text-lk-amber">is waiting.</span>
                    </h2>
                    <p className="text-lk-muted text-base md:text-lg mb-12 max-w-xl mx-auto leading-relaxed">
                        Is it engineered? Yes. Is it effective? Absolutely.
                        Your network doesn&apos;t know the difference.
                        That&apos;s the point.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/browse"
                            className="px-10 py-4 bg-lk-amber text-lk-black font-bold rounded-full text-base tracking-wide hover:brightness-110 transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-lk-amber/20"
                        >
                            Get Social Proof →
                        </Link>
                        <Link
                            href="/register"
                            className="px-10 py-4 border border-lk-border-bright text-lk-white font-semibold rounded-full text-base hover:border-lk-muted-bright hover:bg-lk-surface transition-all"
                        >
                            Become a Model
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
