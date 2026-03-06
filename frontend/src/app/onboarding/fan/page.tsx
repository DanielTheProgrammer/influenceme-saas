"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const STEPS = [
    {
        title: "Welcome to InfluenceMe!",
        subtitle: "You're officially a fan. Here's how it works:",
        content: (
            <div className="space-y-4">
                {[
                    {
                        icon: "🔍",
                        title: "Browse",
                        desc: "Explore verified influencers and their engagement services.",
                    },
                    {
                        icon: "✨",
                        title: "Preview & Request",
                        desc: "Use our AI studio to preview exactly what your shoutout will look like, then submit your request.",
                    },
                    {
                        icon: "✅",
                        title: "Verify & Release",
                        desc: "Once the influencer fulfills your request, confirm it happened and funds are released from escrow.",
                    },
                ].map((item) => (
                    <div key={item.title} className="flex gap-4 items-start bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <span className="text-2xl flex-shrink-0">{item.icon}</span>
                        <div>
                            <h3 className="font-bold text-gray-900">{item.title}</h3>
                            <p className="text-gray-500 text-sm mt-0.5">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        ),
        cta: "Got it! Show me influencers →",
    },
    {
        title: "Featured Creators",
        subtitle: "Start with these popular influencers",
        content: null, // dynamically loaded
        cta: "Browse All Influencers →",
    },
];

export default function FanOnboardingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [featured, setFeatured] = useState<any[]>([]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
        }
    }, [status, router]);

    useEffect(() => {
        fetch(`${API_URL}/marketplace/influencers?limit=3`)
            .then((r) => r.json())
            .then((data) => setFeatured(data.filter((i: any) => i.profile_picture_url).slice(0, 3)))
            .catch(() => {});
    }, []);

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            router.push("/browse");
        }
    };

    if (status === "loading") return null;

    const current = STEPS[step];

    return (
        <div className="min-h-screen bg-gradient-to-br from-violet-50 to-white flex items-center justify-center px-4 py-12">
            <div className="max-w-lg w-full">
                {/* Progress dots */}
                <div className="flex justify-center gap-2 mb-8">
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                i === step ? "w-8 bg-violet-600" : i < step ? "w-2 bg-violet-300" : "w-2 bg-gray-200"
                            }`}
                        />
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{current.title}</h1>
                    <p className="text-gray-500 text-sm mb-6">{current.subtitle}</p>

                    {step === 0 && current.content}

                    {step === 1 && (
                        <div className="space-y-4">
                            {featured.length === 0 ? (
                                <p className="text-gray-400 text-center py-8">Loading featured influencers...</p>
                            ) : (
                                featured.map((inf) => (
                                    <Link
                                        key={inf.id}
                                        href={`/influencers/${inf.id}`}
                                        className="flex items-center gap-4 bg-gray-50 rounded-xl p-4 hover:bg-violet-50 transition-colors border border-transparent hover:border-violet-200"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={inf.profile_picture_url}
                                            alt={inf.display_name}
                                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{inf.display_name}</p>
                                            {inf.followers_count && (
                                                <p className="text-gray-400 text-xs">
                                                    {inf.followers_count >= 1000
                                                        ? `${Math.round(inf.followers_count / 1000)}K`
                                                        : inf.followers_count} followers
                                                </p>
                                            )}
                                        </div>
                                        {inf.services.length > 0 && (
                                            <span className="text-violet-600 font-bold text-sm flex-shrink-0">
                                                from ${Math.min(...inf.services.map((s: any) => s.price)).toFixed(0)}
                                            </span>
                                        )}
                                    </Link>
                                ))
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleNext}
                        className="mt-6 w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors"
                    >
                        {current.cta}
                    </button>

                    {step === 0 && (
                        <button
                            onClick={() => router.push("/browse")}
                            className="mt-3 w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Skip intro
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
