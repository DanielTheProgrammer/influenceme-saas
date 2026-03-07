"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function FanOnboardingPage() {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login");
    }, [status, router]);

    if (status === "loading") return null;

    return (
        <div className="min-h-screen bg-lk-black flex items-center justify-center px-4 py-16 relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(240,165,0,0.06) 0%, transparent 70%)" }} />
            <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(0,205,180,0.05) 0%, transparent 70%)" }} />

            <div className="relative max-w-lg w-full">
                {/* Badge */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex items-center gap-2 border border-lk-border-bright bg-lk-surface/70 backdrop-blur-sm rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-lk-muted-bright uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-lk-cyan animate-pulse" />
                        You&apos;re in
                    </div>
                </div>

                {/* Card */}
                <div className="bg-lk-surface border border-lk-border rounded-2xl p-8">
                    <h1
                        className="font-black text-lk-white leading-tight tracking-[-0.03em] mb-2"
                        style={{ fontFamily: "var(--font-syne)", fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}
                    >
                        Welcome to <span className="text-lk-amber">Leaky.</span>
                    </h1>
                    <p className="text-lk-muted text-sm mb-8">
                        Here&apos;s how to engineer your story in three moves.
                    </p>

                    <div className="space-y-4 mb-8">
                        {[
                            {
                                num: "01",
                                title: "Browse creators",
                                desc: "Explore verified creators. Filter by proof type, price, and audience. Find exactly the right person for your narrative.",
                                color: "text-lk-amber",
                            },
                            {
                                num: "02",
                                title: "Preview & request",
                                desc: "Use the AI studio to preview your shoutout. Pay securely — funds held in escrow until delivery.",
                                color: "text-lk-cyan",
                            },
                            {
                                num: "03",
                                title: "Verify & release",
                                desc: "Confirm the influencer delivered. Funds release. Your story is now in the world.",
                                color: "text-lk-amber",
                            },
                        ].map((item) => (
                            <div key={item.num} className="flex gap-5 items-start bg-lk-black border border-lk-border rounded-xl p-4 hover:border-lk-border-bright transition-colors">
                                <span
                                    className={`text-2xl font-black leading-none flex-shrink-0 mt-0.5 ${item.color}`}
                                    style={{ fontFamily: "var(--font-syne)" }}
                                >
                                    {item.num}
                                </span>
                                <div>
                                    <h3
                                        className="font-bold text-lk-white text-sm mb-0.5"
                                        style={{ fontFamily: "var(--font-syne)" }}
                                    >
                                        {item.title}
                                    </h3>
                                    <p className="text-lk-muted text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Link
                        href="/browse"
                        className="block w-full py-3.5 bg-lk-amber text-lk-black font-bold rounded-full text-center text-sm tracking-wide hover:brightness-110 transition-all shadow-lg hover:shadow-lk-amber/20"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        Explore Creators →
                    </Link>

                    <Link
                        href="/browse"
                        className="block mt-3 w-full py-2 text-xs text-lk-muted hover:text-lk-muted-bright transition-colors text-center"
                    >
                        Skip intro
                    </Link>
                </div>
            </div>
        </div>
    );
}
