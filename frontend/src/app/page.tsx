"use client";

import Link from "next/link";
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

const TESTIMONIALS = [
    {
        quote: "Got a story tag from my favorite travel influencer in 24 hours. Absolutely worth it — my account blew up!",
        name: "Jordan M.",
        role: "Fan",
        avatar: "https://i.pravatar.cc/64?u=jordan",
    },
    {
        quote: "I've been on Cameo and other platforms. InfluenceMe is the cleanest experience and the escrow model actually protects both sides.",
        name: "Aisha T.",
        role: "Fan",
        avatar: "https://i.pravatar.cc/64?u=aisha",
    },
    {
        quote: "As an influencer, I love that I can counter-offer and negotiate. I control my pricing and commitments.",
        name: "Marco R.",
        role: "Influencer",
        avatar: "https://i.pravatar.cc/64?u=marco",
    },
];

export default function HomePage() {
    const [featured, setFeatured] = useState<FeaturedInfluencer[]>([]);

    useEffect(() => {
        fetch(`${API_URL}/marketplace/influencers`)
            .then((r) => r.json())
            .then((data: FeaturedInfluencer[]) => {
                // Pick up to 6 influencers that have profile pics
                const withPics = data.filter((i) => i.profile_picture_url);
                setFeatured(withPics.slice(0, 6));
            })
            .catch(() => {});
    }, []);

    return (
        <div className="min-h-screen">
            {/* ── Hero ── */}
            <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-blue-700 to-indigo-800 text-white">
                {/* Background decoration */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-20 -left-20 w-96 h-96 bg-pink-400 rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-cyan-400 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-28 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        Live marketplace — real influencers, real engagement
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
                        Real engagement from<br />
                        <span className="bg-gradient-to-r from-pink-300 via-yellow-200 to-cyan-300 bg-clip-text text-transparent">
                            influencers you love
                        </span>
                    </h1>

                    <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Story tags, shoutouts, follows — purchased directly from verified influencers.
                        Secure escrow. AI previews. Counter-offer negotiation.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                        <Link
                            href="/browse"
                            className="px-8 py-4 bg-white text-violet-700 font-bold rounded-xl text-lg hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:scale-105"
                        >
                            Browse Influencers
                        </Link>
                        <Link
                            href="/register"
                            className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl text-lg hover:bg-white/20 transition-all"
                        >
                            Join as Influencer
                        </Link>
                    </div>

                    {/* Social proof stats */}
                    <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                        {[
                            { value: "10+", label: "Influencers" },
                            { value: "530K+", label: "Combined reach" },
                            { value: "100%", label: "Secure escrow" },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <div className="text-3xl font-extrabold">{stat.value}</div>
                                <div className="text-blue-200 text-sm mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Featured Influencers ── */}
            {featured.length > 0 && (
                <section className="py-20 px-4 bg-gray-50">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-end justify-between mb-10">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900">Featured Influencers</h2>
                                <p className="text-gray-500 mt-1">Book real engagement from these creators today</p>
                            </div>
                            <Link
                                href="/browse"
                                className="hidden md:inline-flex items-center gap-1 text-blue-600 font-medium hover:underline text-sm"
                            >
                                View all &rarr;
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {featured.map((inf) => {
                                const minPrice = inf.services.length
                                    ? Math.min(...inf.services.map((s) => s.price))
                                    : null;
                                return (
                                    <Link
                                        key={inf.id}
                                        href={`/influencers/${inf.id}`}
                                        className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 text-center border border-transparent hover:border-violet-200"
                                    >
                                        <div className="relative mx-auto w-16 h-16 mb-3">
                                            <img
                                                src={inf.profile_picture_url!}
                                                alt={inf.display_name}
                                                className="w-16 h-16 rounded-full object-cover border-2 border-violet-100 group-hover:border-violet-400 transition-colors"
                                            />
                                        </div>
                                        <p className="font-bold text-sm text-gray-900 truncate leading-tight">{inf.display_name}</p>
                                        {inf.followers_count && (
                                            <p className="text-xs text-gray-400 mt-0.5">{formatFollowers(inf.followers_count)} followers</p>
                                        )}
                                        {minPrice !== null && (
                                            <p className="text-xs font-semibold text-violet-600 mt-1">from ${minPrice}</p>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="text-center mt-8 md:hidden">
                            <Link href="/browse" className="text-blue-600 font-medium hover:underline text-sm">
                                View all influencers &rarr;
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* ── How It Works ── */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">How It Works</h2>
                    <p className="text-center text-gray-500 mb-14">From browse to fulfilled in 3 simple steps</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
                        {/* Connector line */}
                        <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-violet-200 to-blue-200" />

                        {[
                            {
                                step: "01",
                                title: "Browse & Choose",
                                desc: "Explore verified influencers. Filter by engagement type, price, and follower count. See recent posts and services.",
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                ),
                                color: "bg-violet-100 text-violet-600",
                            },
                            {
                                step: "02",
                                title: "Preview & Request",
                                desc: "Use our AI studio to generate a preview of exactly what your shoutout will look like. Submit and pay securely.",
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                ),
                                color: "bg-blue-100 text-blue-600",
                            },
                            {
                                step: "03",
                                title: "Verify & Release",
                                desc: "The influencer fulfills your request. You verify it happened, then funds are released from escrow. Simple.",
                                icon: (
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ),
                                color: "bg-green-100 text-green-600",
                            },
                        ].map((item) => (
                            <div key={item.step} className="text-center relative">
                                <div className={`w-20 h-20 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-5 relative`}>
                                    {item.icon}
                                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                        {item.step}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-gray-900">{item.title}</h3>
                                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">Why InfluenceMe?</h2>
                    <p className="text-center text-gray-500 mb-14">Everything you need, nothing you don&apos;t</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            {
                                title: "Secure Escrow Payments",
                                desc: "Funds are held safely until you confirm fulfillment. No risk of being ghosted — your money is always protected.",
                                gradient: "from-violet-500 to-purple-600",
                                icon: (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                ),
                            },
                            {
                                title: "AI-Powered Previews",
                                desc: "Generate a realistic preview of your shoutout before committing. See exactly what your story tag will look like.",
                                gradient: "from-blue-500 to-cyan-600",
                                icon: (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                ),
                            },
                            {
                                title: "Verified Influencers",
                                desc: "Every creator links their real Instagram or TikTok handles. DM-based verification confirms authenticity.",
                                gradient: "from-green-500 to-emerald-600",
                                icon: (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                ),
                            },
                            {
                                title: "Counter-Offer Negotiation",
                                desc: "Influencers can propose alternative pricing or terms. Accept, reject, or counter back — full negotiation control.",
                                gradient: "from-orange-500 to-pink-600",
                                icon: (
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                ),
                            },
                        ].map((f) => (
                            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex gap-5 hover:shadow-md transition-shadow">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center flex-shrink-0`}>
                                    {f.icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold mb-1 text-gray-900">{f.title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="py-20 px-4 bg-white">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">What people are saying</h2>
                    <p className="text-center text-gray-500 mb-14">Fans and creators love the platform</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TESTIMONIALS.map((t) => (
                            <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                                <div className="flex gap-0.5 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    ))}
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
                                <div className="flex items-center gap-3">
                                    <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full object-cover" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{t.name}</p>
                                        <p className="text-xs text-gray-400">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Pricing ── */}
            <section className="py-20 px-4 bg-gray-50">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-center mb-3 text-gray-900">Simple, transparent pricing</h2>
                    <p className="text-center text-gray-500 mb-14">Fans always browse and buy for free. Influencers pay only for pro features.</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Fan */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-1">Fan</h3>
                            <div className="text-4xl font-extrabold text-gray-900 mb-1">Free</div>
                            <p className="text-gray-400 text-sm mb-6">Always free</p>
                            <ul className="text-sm text-gray-600 space-y-3 mb-8 text-left">
                                {["Browse all influencers", "AI preview generation", "Secure escrow payments", "Request tracking dashboard"].map((item) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                                Get Started
                            </Link>
                        </div>

                        {/* Influencer Basic */}
                        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
                            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-1">Influencer Basic</h3>
                            <div className="text-4xl font-extrabold text-gray-900 mb-1">Free</div>
                            <p className="text-gray-400 text-sm mb-6">20% platform fee</p>
                            <ul className="text-sm text-gray-600 space-y-3 mb-8 text-left">
                                {["List up to 3 services", "Accept / reject requests", "Counter-offer capability", "Earnings dashboard"].map((item) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="block w-full py-3 border-2 border-violet-600 text-violet-600 font-bold rounded-xl hover:bg-violet-50 transition-colors">
                                Join as Influencer
                            </Link>
                        </div>

                        {/* Influencer Pro */}
                        <div className="bg-gradient-to-b from-violet-600 to-indigo-700 rounded-2xl p-8 text-center relative shadow-xl shadow-violet-200">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                                MOST POPULAR
                            </div>
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold mb-1 text-white">Influencer Pro</h3>
                            <div className="text-4xl font-extrabold text-white mb-1">$29</div>
                            <p className="text-violet-200 text-sm mb-6">per month &middot; 10% platform fee</p>
                            <ul className="text-sm text-violet-100 space-y-3 mb-8 text-left">
                                {["Unlimited services", "Reduced 10% platform fee", "Priority listing in browse", "Advanced analytics", "Stripe Connect payouts"].map((item) => (
                                    <li key={item} className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link href="/register" className="block w-full py-3 bg-white text-violet-700 font-bold rounded-xl hover:bg-violet-50 transition-colors">
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Final CTA ── */}
            <section className="py-24 px-4 bg-gradient-to-br from-violet-700 via-blue-700 to-indigo-800 text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-10 left-1/4 w-64 h-64 bg-pink-400 rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-cyan-400 rounded-full blur-3xl" />
                </div>
                <div className="relative max-w-2xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                        Ready to connect with<br />your favorite creators?
                    </h2>
                    <p className="text-blue-100 text-lg mb-10 leading-relaxed">
                        Join the marketplace where authentic fan-influencer connections happen.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/browse"
                            className="inline-block px-10 py-4 bg-white text-violet-700 font-bold rounded-xl text-lg hover:bg-blue-50 transition-all shadow-xl hover:scale-105"
                        >
                            Browse Influencers
                        </Link>
                        <Link
                            href="/register"
                            className="inline-block px-10 py-4 bg-white/10 backdrop-blur-sm border border-white/30 text-white font-bold rounded-xl text-lg hover:bg-white/20 transition-all"
                        >
                            Create Free Account
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
