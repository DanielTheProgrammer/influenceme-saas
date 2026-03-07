"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface Service {
    engagement_type: string;
    price: number;
    duration_days?: number;
}

interface Influencer {
    id: number;
    display_name: string;
    bio: string | null;
    profile_picture_url: string | null;
    instagram_handle?: string | null;
    tiktok_handle?: string | null;
    followers_count?: number | null;
    viral_video_url?: string | null;
    services: Service[];
}

const ENGAGEMENT_LABELS: Record<string, string> = {
    permanent_follow: "Follow",
    timed_follow: "Timed Follow",
    story_tag: "Story Tag",
    story_highlight: "Highlight",
    post_tag: "Post Tag",
    comment: "Comment",
};

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
    return String(n);
}

export default function InfluencerCard({ influencer }: { influencer: Influencer }) {
    const [videoFailed, setVideoFailed] = useState(false);
    const prices = influencer.services.map((s) => s.price);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const handle = influencer.instagram_handle || influencer.tiktok_handle;
    const hasVideo = !!influencer.viral_video_url && !videoFailed;

    if (hasVideo) {
        return (
            <Link href={`/influencers/${influencer.id}`} className="block group">
                <div className="relative rounded-2xl overflow-hidden h-72 bg-lk-surface shadow-lg hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 group-hover:scale-[1.02]">
                    {/* Video background */}
                    <video
                        src={influencer.viral_video_url!}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster={influencer.profile_picture_url || undefined}
                        onError={() => setVideoFailed(true)}
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Play indicator on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-11 h-11 rounded-full flex items-center justify-center border border-lk-amber/50 bg-lk-amber/10 backdrop-blur-sm">
                            <svg className="w-4 h-4 text-lk-amber ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>

                    {/* Profile badge — top left */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full border-2 border-lk-amber/50 overflow-hidden flex-shrink-0 bg-lk-surface">
                            {influencer.profile_picture_url ? (
                                <Image
                                    src={influencer.profile_picture_url}
                                    alt={influencer.display_name}
                                    width={36}
                                    height={36}
                                    className="object-cover w-full h-full"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full bg-lk-amber/20 flex items-center justify-center text-lk-amber text-xs font-bold">
                                    {influencer.display_name[0]}
                                </div>
                            )}
                        </div>
                        {handle && (
                            <span className="text-white text-xs font-medium bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                @{handle}
                            </span>
                        )}
                    </div>

                    {/* Bottom overlay — name, price */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-end justify-between">
                            <div className="flex-1 min-w-0">
                                <h2
                                    className="text-white font-bold text-base leading-tight truncate"
                                    style={{ fontFamily: "var(--font-syne)" }}
                                >
                                    {influencer.display_name}
                                </h2>
                                {influencer.followers_count && (
                                    <p className="text-white/60 text-xs mt-0.5">
                                        {formatFollowers(influencer.followers_count)} followers
                                    </p>
                                )}
                                {influencer.bio && (
                                    <p className="text-white/50 text-xs mt-1 line-clamp-1">{influencer.bio}</p>
                                )}
                            </div>
                            {minPrice !== null && (
                                <div className="ml-3 flex-shrink-0">
                                    <span className="bg-lk-amber text-lk-black text-xs font-bold px-3 py-1.5 rounded-lg">
                                        from ${minPrice.toFixed(0)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {influencer.services.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {influencer.services.slice(0, 3).map((s, i) => (
                                    <span key={i} className="text-xs bg-white/10 backdrop-blur-sm text-white/70 px-2 py-0.5 rounded-md border border-white/10">
                                        {ENGAGEMENT_LABELS[s.engagement_type] || s.engagement_type}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    // Standard dark card (no video)
    return (
        <Link href={`/influencers/${influencer.id}`} className="block group">
            <div className="bg-lk-surface rounded-2xl overflow-hidden border border-lk-border group-hover:border-lk-border-bright h-full flex flex-col transition-all duration-200 hover:shadow-xl hover:shadow-black/40">
                {/* Accent strip */}
                <div className="h-[2px] bg-gradient-to-r from-lk-amber via-lk-cyan to-transparent" />

                <div className="p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-shrink-0">
                            {influencer.profile_picture_url ? (
                                <Image
                                    src={influencer.profile_picture_url}
                                    alt={influencer.display_name}
                                    width={52}
                                    height={52}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-lk-border group-hover:border-lk-amber/40 transition-colors"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-lk-amber/10 border-2 border-lk-border flex items-center justify-center text-lk-amber font-bold text-xl">
                                    {influencer.display_name[0]}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2
                                className="text-base font-bold text-lk-white truncate leading-tight group-hover:text-lk-amber transition-colors"
                                style={{ fontFamily: "var(--font-syne)" }}
                            >
                                {influencer.display_name}
                            </h2>
                            {handle && (
                                <p className="text-lk-muted text-xs truncate mt-0.5">@{handle}</p>
                            )}
                            {influencer.followers_count && (
                                <p className="text-lk-muted text-xs mt-0.5">
                                    {formatFollowers(influencer.followers_count)} followers
                                </p>
                            )}
                        </div>
                        {minPrice !== null && (
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-lk-muted">from</p>
                                <p className="text-lk-amber font-bold text-sm">${minPrice.toFixed(0)}</p>
                            </div>
                        )}
                    </div>

                    {/* Bio */}
                    {influencer.bio && (
                        <p className="text-lk-muted text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
                            {influencer.bio}
                        </p>
                    )}

                    {/* Services */}
                    {influencer.services.length > 0 && (
                        <div className="border-t border-lk-border pt-3 mt-auto">
                            <div className="flex flex-wrap gap-1">
                                {influencer.services.slice(0, 3).map((service, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center px-2 py-1 text-xs rounded-lg font-medium bg-lk-black text-lk-muted-bright border border-lk-border"
                                    >
                                        {ENGAGEMENT_LABELS[service.engagement_type] || service.engagement_type}
                                    </span>
                                ))}
                                {influencer.services.length > 3 && (
                                    <span className="px-2 py-1 bg-lk-black text-lk-muted text-xs rounded-lg border border-lk-border">
                                        +{influencer.services.length - 3}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
