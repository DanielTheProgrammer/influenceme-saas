"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import GenAIStudio from "@/components/GenAIStudio";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENGAGEMENT_ICONS: Record<string, string> = {
    permanent_follow: "👥",
    timed_follow: "⏱️",
    story_tag: "🏷️",
    story_highlight: "🌟",
    post_tag: "📌",
    comment: "💬",
};

const ENGAGEMENT_COLORS: Record<string, string> = {
    permanent_follow: "from-blue-500 to-blue-600",
    timed_follow: "from-cyan-500 to-blue-500",
    story_tag: "from-pink-500 to-rose-500",
    story_highlight: "from-yellow-400 to-orange-500",
    post_tag: "from-indigo-500 to-purple-600",
    comment: "from-green-500 to-teal-500",
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
            <div className="max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-52 bg-gray-200 rounded-2xl mb-0" />
                    <div className="bg-white rounded-2xl shadow-sm px-8 pb-8 mb-6">
                        <div className="flex items-end gap-6 -mt-12 mb-6">
                            <div className="w-28 h-28 rounded-full bg-gray-300 border-4 border-white flex-shrink-0" />
                            <div className="pb-2 space-y-2 flex-1">
                                <div className="h-6 bg-gray-200 rounded w-1/3" />
                                <div className="h-4 bg-gray-200 rounded w-1/4" />
                            </div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-4/5" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !influencer) {
        return (
            <div className="max-w-4xl mx-auto py-20 text-center">
                <p className="text-5xl mb-4">😔</p>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Influencer not found</h2>
                <p className="text-gray-500 mb-6">{error || "This profile doesn't exist or has been removed."}</p>
                <button onClick={() => router.push("/browse")} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
                    Browse Influencers
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
        <div className="max-w-4xl mx-auto pb-16">

            {/* Hero Banner */}
            <div
                className="h-52 rounded-2xl mb-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden"
                style={influencer.profile_picture_url ? {
                    backgroundImage: `linear-gradient(to bottom right, rgba(99,102,241,0.85), rgba(168,85,247,0.85)), url(${influencer.profile_picture_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                } : {}}
            >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm px-6 md:px-10 pb-8 mb-6">
                {/* Avatar + Name Row */}
                <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-14 mb-6">
                    <div className="relative flex-shrink-0">
                        <img
                            src={influencer.profile_picture_url || `https://i.pravatar.cc/200?u=${influencer.id}`}
                            alt={influencer.display_name}
                            className="w-28 h-28 rounded-full border-4 border-white shadow-lg object-cover"
                        />
                        {isVerified && (
                            <div className="absolute bottom-1 right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow" title="Verified">
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 md:pb-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">{influencer.display_name}</h1>
                            {isVerified && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100">
                                    Verified
                                </span>
                            )}
                        </div>

                        {/* Social Handles */}
                        <div className="flex flex-wrap gap-3 text-sm">
                            {influencer.instagram_handle && (
                                <a
                                    href={`https://instagram.com/${influencer.instagram_handle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-gray-500 hover:text-pink-600 transition-colors"
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
                                    href={`https://tiktok.com/@${influencer.tiktok_handle}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-gray-500 hover:text-black transition-colors"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.83 1.56V6.79a4.85 4.85 0 01-1.06-.1z" />
                                    </svg>
                                    @{influencer.tiktok_handle}
                                </a>
                            )}
                        </div>
                    </div>

                    {/* CTA */}
                    {influencer.services.length > 0 && (
                        <div className="md:pb-2 flex-shrink-0">
                            <button
                                onClick={() => {
                                    const el = document.getElementById("services");
                                    el?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-md text-sm"
                            >
                                Book Engagement →
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Bar */}
                <div className="flex flex-wrap gap-6 mb-6 py-4 border-y border-gray-100">
                    {influencer.followers_count != null && (
                        <div className="text-center">
                            <p className="text-xl font-extrabold text-gray-900">{formatFollowers(influencer.followers_count)}</p>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Followers</p>
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-xl font-extrabold text-gray-900">{influencer.services.length}</p>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Services</p>
                    </div>
                    {minPrice != null && (
                        <div className="text-center">
                            <p className="text-xl font-extrabold text-gray-900">from ${minPrice.toFixed(0)}</p>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Starting Price</p>
                        </div>
                    )}
                    {posts.length > 0 && (
                        <div className="text-center">
                            <p className="text-xl font-extrabold text-gray-900">{posts.length}</p>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Recent Posts</p>
                        </div>
                    )}
                </div>

                {/* Bio */}
                {influencer.bio && (
                    <p className="text-gray-600 leading-relaxed">{influencer.bio}</p>
                )}
            </div>

            {/* Recent Posts */}
            {posts.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Posts</h2>
                    <div className="grid grid-cols-3 gap-2">
                        {posts.map((url, i) => (
                            <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 group relative">
                                <img
                                    src={url}
                                    alt={`Post ${i + 1}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${influencer.id + i}/400/400`;
                                    }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-xl" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Services */}
            <div id="services">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Available Engagements</h2>
                    {!session && (
                        <p className="text-sm text-gray-400">Sign in to book</p>
                    )}
                </div>

                {influencer.services.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                        <p className="text-gray-400">No services listed yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {influencer.services.map((service) => {
                            const gradient = ENGAGEMENT_COLORS[service.engagement_type] || "from-gray-400 to-gray-500";
                            const icon = ENGAGEMENT_ICONS[service.engagement_type] || "⭐";
                            return (
                                <div
                                    key={service.id}
                                    onClick={() => handleServiceSelect(service)}
                                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                                >
                                    {/* Color header strip */}
                                    <div className={`h-2 w-full bg-gradient-to-r ${gradient}`} />

                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{icon}</span>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 capitalize leading-tight">
                                                        {service.engagement_type.replace(/_/g, " ")}
                                                    </h3>
                                                    {service.duration_days && (
                                                        <p className="text-xs text-gray-400 mt-0.5">{service.duration_days}-day engagement</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-2xl font-extrabold text-gray-900">${service.price.toFixed(0)}</p>
                                                <p className="text-xs text-gray-400">per request</p>
                                            </div>
                                        </div>

                                        {service.description && (
                                            <p className="text-sm text-gray-500 mb-4 leading-relaxed">{service.description}</p>
                                        )}

                                        <div className={`w-full py-2.5 rounded-xl text-sm font-bold text-center bg-gradient-to-r ${gradient} text-white opacity-90 group-hover:opacity-100 transition-opacity`}>
                                            {session ? "Select & Customize with AI ✨" : "Sign in to Book"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Trust footer */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">🔒 Secure escrow payments</span>
                <span className="flex items-center gap-1.5">✨ AI-powered preview</span>
                <span className="flex items-center gap-1.5">✅ Fulfillment verified</span>
            </div>

            {/* GenAI Studio Modal */}
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
