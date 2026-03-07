"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GenAIStudio from "@/components/GenAIStudio";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENGAGEMENT_LABELS: Record<string, string> = {
    permanent_follow: "Permanent Follow",
    timed_follow: "Timed Follow",
    story_tag: "Story Tag",
    story_highlight: "Story Highlight",
    post_tag: "Post Tag",
    comment: "Comment",
};

interface Service {
    id: number;
    engagement_type: string;
    price: number;
    description: string | null;
    duration_days: number | null;
}

interface Influencer {
    id: number;
    display_name: string;
    bio: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    profile_picture_url: string | null;
    followers_count: number | null;
    recent_post_urls: string[] | null;
    instagram_verification_status: string;
    tiktok_verification_status: string;
    services: Service[];
}

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

export default function InfluencerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { data: session } = useSession();
    const router = useRouter();

    const [influencer, setInfluencer] = useState<Influencer | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);

    useEffect(() => {
        fetch(`${API_URL}/marketplace/influencers/${id}`)
            .then((res) => {
                if (!res.ok) throw new Error("Influencer not found.");
                return res.json();
            })
            .then((data) => { setInfluencer(data); setLoading(false); })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, [id]);

    const handleServiceSelect = (service: Service) => {
        if (!session) {
            router.push(`/login?redirect=/influencers/${id}`);
            return;
        }
        setSelectedService(service);
    };

    const handleSubmitRequest = (_previewUrl: string) => {
        setSelectedService(null);
        router.push("/fan/requests");
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 pt-24 pb-16 animate-pulse">
                <div className="h-48 bg-lk-surface rounded-2xl mb-0 border border-lk-border" />
                <div className="bg-lk-surface rounded-2xl border border-lk-border px-8 pb-8 mb-6">
                    <div className="flex items-end gap-6 -mt-12 mb-6">
                        <div className="w-28 h-28 rounded-full bg-lk-border border-4 border-lk-black flex-shrink-0" />
                        <div className="pb-2 space-y-2 flex-1">
                            <div className="h-6 bg-lk-border rounded w-1/3" />
                            <div className="h-4 bg-lk-border rounded w-1/4" />
                        </div>
                    </div>
                    <div className="h-4 bg-lk-border rounded mb-2" />
                    <div className="h-4 bg-lk-border rounded w-4/5" />
                </div>
            </div>
        );
    }

    if (error || !influencer) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center pt-24">
                <p className="text-5xl mb-4">😔</p>
                <h2
                    className="text-2xl font-bold text-lk-white mb-2"
                    style={{ fontFamily: "var(--font-syne)" }}
                >
                    Creator not found
                </h2>
                <p className="text-lk-muted mb-6">{error || "This profile doesn't exist or has been removed."}</p>
                <button
                    onClick={() => router.push("/browse")}
                    className="px-6 py-3 bg-lk-amber text-lk-black font-bold rounded-full hover:brightness-110 transition-all"
                >
                    Browse Creators
                </button>
            </div>
        );
    }

    const isVerified =
        influencer.instagram_verification_status === "verified" ||
        influencer.tiktok_verification_status === "verified";

    const minPrice = influencer.services.length ? Math.min(...influencer.services.map((s) => s.price)) : null;
    const posts = influencer.recent_post_urls?.filter(Boolean) ?? [];

    return (
        <div className="max-w-4xl mx-auto px-4 pb-16 pt-24">

            {/* Hero Banner */}
            <div
                className="h-48 rounded-2xl mb-0 relative overflow-hidden bg-lk-surface border border-lk-border"
                style={influencer.profile_picture_url ? {
                    backgroundImage: `linear-gradient(to bottom right, rgba(7,7,15,0.8), rgba(14,14,26,0.7)), url(${influencer.profile_picture_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                } : {}}
            >
                {/* Amber glow */}
                <div className="absolute inset-0 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at bottom right, rgba(240,165,0,0.08) 0%, transparent 60%)" }} />
            </div>

            {/* Profile Card */}
            <div className="bg-lk-surface rounded-2xl border border-lk-border px-6 md:px-10 pb-8 mb-6">
                <div className="h-[2px] bg-gradient-to-r from-lk-amber via-lk-cyan to-transparent" />

                {/* Avatar + Name Row */}
                <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-14 pt-2 mb-6">
                    <div className="relative flex-shrink-0">
                        <Image
                            src={influencer.profile_picture_url || `https://i.pravatar.cc/200?u=${influencer.id}`}
                            alt={influencer.display_name}
                            width={112}
                            height={112}
                            className="w-28 h-28 rounded-full border-4 border-lk-black shadow-xl object-cover"
                            unoptimized
                        />
                        {isVerified && (
                            <div className="absolute bottom-1 right-1 w-7 h-7 bg-lk-cyan rounded-full flex items-center justify-center border-2 border-lk-black shadow" title="Verified">
                                <svg className="w-4 h-4 text-lk-black" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 md:pb-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1
                                className="text-2xl md:text-3xl font-extrabold text-lk-white"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                {influencer.display_name}
                            </h1>
                            {isVerified && (
                                <span className="px-2 py-0.5 bg-lk-cyan/15 text-lk-cyan text-xs font-bold rounded-full border border-lk-cyan/20">
                                    Verified
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                            {influencer.instagram_handle && (
                                <a
                                    href={`https://www.instagram.com/${influencer.instagram_handle}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-lk-muted hover:text-lk-white transition-colors"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                        <circle cx="12" cy="12" r="4" />
                                        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                                    </svg>
                                    @{influencer.instagram_handle}
                                </a>
                            )}
                            {influencer.tiktok_handle && (
                                <a
                                    href={`https://www.tiktok.com/@${influencer.tiktok_handle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-lk-muted hover:text-lk-white transition-colors"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.83 1.56V6.79a4.85 4.85 0 01-1.06-.1z" />
                                    </svg>
                                    @{influencer.tiktok_handle}
                                </a>
                            )}
                        </div>
                    </div>

                    {influencer.services.length > 0 && (
                        <div className="md:pb-2 flex-shrink-0">
                            <button
                                onClick={() => {
                                    document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="px-6 py-2.5 bg-lk-amber text-lk-black font-bold rounded-full hover:brightness-110 transition-all text-sm tracking-wide"
                            >
                                Get Social Proof →
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Bar */}
                <div className="flex flex-wrap gap-8 mb-6 py-4 border-y border-lk-border">
                    {influencer.followers_count != null && (
                        <div>
                            <p
                                className="text-xl font-extrabold text-lk-white"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                {formatFollowers(influencer.followers_count)}
                            </p>
                            <p className="text-[10px] text-lk-muted font-semibold uppercase tracking-widest mt-0.5">Followers</p>
                        </div>
                    )}
                    <div>
                        <p className="text-xl font-extrabold text-lk-white" style={{ fontFamily: "var(--font-syne)" }}>
                            {influencer.services.length}
                        </p>
                        <p className="text-[10px] text-lk-muted font-semibold uppercase tracking-widest mt-0.5">Services</p>
                    </div>
                    {minPrice != null && (
                        <div>
                            <p className="text-xl font-extrabold text-lk-amber" style={{ fontFamily: "var(--font-syne)" }}>
                                from ${minPrice.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-lk-muted font-semibold uppercase tracking-widest mt-0.5">Starting Price</p>
                        </div>
                    )}
                    {posts.length > 0 && (
                        <div>
                            <p className="text-xl font-extrabold text-lk-white" style={{ fontFamily: "var(--font-syne)" }}>{posts.length}</p>
                            <p className="text-[10px] text-lk-muted font-semibold uppercase tracking-widest mt-0.5">Recent Posts</p>
                        </div>
                    )}
                </div>

                {influencer.bio && (
                    <p className="text-lk-muted-bright leading-relaxed text-sm">{influencer.bio}</p>
                )}
            </div>

            {/* Recent Posts */}
            {posts.length > 0 && (
                <div className="bg-lk-surface rounded-2xl border border-lk-border p-6 mb-6">
                    <h2
                        className="text-lg font-bold text-lk-white mb-4"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        Recent Posts
                    </h2>
                    <div className="grid grid-cols-3 gap-2">
                        {posts.map((url, i) => (
                            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-lk-border group relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={url}
                                    alt={`Post ${i + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${influencer.id + i}/400/400`;
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Services */}
            <div id="services">
                <div className="flex items-center justify-between mb-5">
                    <h2
                        className="text-xl font-bold text-lk-white"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        Available Proof Types
                    </h2>
                    {!session && (
                        <p className="text-sm text-lk-muted">Sign in to book</p>
                    )}
                </div>

                {influencer.services.length === 0 ? (
                    <div className="bg-lk-surface rounded-2xl border border-lk-border p-10 text-center">
                        <p className="text-lk-muted">No services listed yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {influencer.services.map((service) => (
                            <div
                                key={service.id}
                                onClick={() => handleServiceSelect(service)}
                                className="bg-lk-surface border border-lk-border rounded-2xl overflow-hidden hover:border-lk-amber/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                            >
                                <div className="h-[2px] bg-gradient-to-r from-lk-amber via-lk-cyan to-transparent" />
                                <div className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3
                                                className="font-bold text-lk-white capitalize leading-tight group-hover:text-lk-amber transition-colors"
                                                style={{ fontFamily: "var(--font-syne)" }}
                                            >
                                                {ENGAGEMENT_LABELS[service.engagement_type] || service.engagement_type.replace(/_/g, " ")}
                                            </h3>
                                            {service.duration_days && (
                                                <p className="text-xs text-lk-muted mt-0.5">{service.duration_days}-day engagement</p>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p
                                                className="text-2xl font-extrabold text-lk-amber"
                                                style={{ fontFamily: "var(--font-syne)" }}
                                            >
                                                ${service.price.toFixed(0)}
                                            </p>
                                            <p className="text-xs text-lk-muted">per request</p>
                                        </div>
                                    </div>

                                    {service.description && (
                                        <p className="text-sm text-lk-muted mb-4 leading-relaxed">{service.description}</p>
                                    )}

                                    <div className="w-full py-2.5 rounded-full text-sm font-bold text-center bg-lk-amber/10 text-lk-amber border border-lk-amber/20 group-hover:bg-lk-amber group-hover:text-lk-black transition-all">
                                        {session ? "Select & Customize with AI ✨" : "Sign in to Book"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Trust strip */}
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs text-lk-muted">
                <span className="flex items-center gap-1.5">🔒 Secure escrow</span>
                <span className="flex items-center gap-1.5">✨ AI-powered preview</span>
                <span className="flex items-center gap-1.5">✅ Proof verified</span>
            </div>

            {selectedService && (
                <GenAIStudio
                    influencerId={influencer.id}
                    influencerName={influencer.display_name}
                    serviceId={selectedService.id}
                    serviceName={selectedService.engagement_type.replace(/_/g, " ")}
                    price={selectedService.price}
                    onClose={() => setSelectedService(null)}
                    onSubmitRequest={handleSubmitRequest}
                />
            )}
        </div>
    );
}
