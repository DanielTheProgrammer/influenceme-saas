import Link from "next/link";
import Image from "next/image";

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

const ENGAGEMENT_ICONS: Record<string, string> = {
    permanent_follow: "👥",
    timed_follow: "⏱️",
    story_tag: "🏷️",
    story_highlight: "⭐",
    post_tag: "📌",
    comment: "💬",
};

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
    return String(n);
}

export default function InfluencerCard({ influencer }: { influencer: Influencer }) {
    const prices = influencer.services.map((s) => s.price);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const handle = influencer.instagram_handle || influencer.tiktok_handle;
    const hasVideo = !!influencer.viral_video_url;

    if (hasVideo) {
        return (
            <Link href={`/influencers/${influencer.id}`} className="block group">
                <div className="relative rounded-2xl overflow-hidden h-72 bg-gray-900 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                    {/* Video background */}
                    <video
                        src={influencer.viral_video_url!}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                    />

                    {/* Dark overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Play indicator on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        </div>
                    </div>

                    {/* Profile pic — top-left badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden flex-shrink-0 bg-gray-700">
                            {influencer.profile_picture_url ? (
                                <Image
                                    src={influencer.profile_picture_url}
                                    alt={influencer.display_name}
                                    width={40}
                                    height={40}
                                    className="object-cover w-full h-full"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">
                                    {influencer.display_name[0]}
                                </div>
                            )}
                        </div>
                        {handle && (
                            <span className="text-white text-xs font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                @{handle}
                            </span>
                        )}
                    </div>

                    {/* Bottom overlay — name, bio, price */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-end justify-between">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-white font-bold text-base leading-tight truncate">
                                    {influencer.display_name}
                                </h2>
                                {influencer.followers_count && (
                                    <p className="text-gray-300 text-xs mt-0.5">
                                        {formatFollowers(influencer.followers_count)} followers
                                    </p>
                                )}
                                {influencer.bio && (
                                    <p className="text-gray-300 text-xs mt-1 line-clamp-1">{influencer.bio}</p>
                                )}
                            </div>
                            {minPrice !== null && (
                                <div className="ml-3 flex-shrink-0 text-right">
                                    <span className="bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                                        from ${minPrice.toFixed(0)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Service type pills */}
                        {influencer.services.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {influencer.services.slice(0, 3).map((s, i) => (
                                    <span key={i} className="text-xs bg-white/15 backdrop-blur-sm text-white px-2 py-0.5 rounded-md">
                                        {ENGAGEMENT_ICONS[s.engagement_type] || "▶️"} {s.engagement_type.replace(/_/g, " ")}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    // Standard card (no video)
    return (
        <Link href={`/influencers/${influencer.id}`} className="block group">
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 group-hover:border-violet-200 h-full flex flex-col">
                {/* Top gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-violet-500 via-rose-500 to-pink-500" />

                <div className="p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-shrink-0">
                            {influencer.profile_picture_url ? (
                                <Image
                                    src={influencer.profile_picture_url}
                                    alt={influencer.display_name}
                                    width={56}
                                    height={56}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-violet-100 group-hover:border-violet-300 transition-colors"
                                    unoptimized
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-violet-100 border-2 border-violet-200 flex items-center justify-center text-violet-600 font-bold text-xl">
                                    {influencer.display_name[0]}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-gray-900 truncate leading-tight group-hover:text-violet-700 transition-colors">
                                {influencer.display_name}
                            </h2>
                            {handle && (
                                <p className="text-violet-500 text-xs truncate mt-0.5">@{handle}</p>
                            )}
                            {influencer.followers_count && (
                                <p className="text-gray-400 text-xs mt-0.5">
                                    {formatFollowers(influencer.followers_count)} followers
                                </p>
                            )}
                        </div>
                        {minPrice !== null && (
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-gray-400">from</p>
                                <p className="text-violet-600 font-bold text-sm">${minPrice!.toFixed(0)}</p>
                            </div>
                        )}
                    </div>

                    {/* Bio */}
                    {influencer.bio && (
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed flex-1">
                            {influencer.bio}
                        </p>
                    )}

                    {/* Services */}
                    {influencer.services.length > 0 && (
                        <div className="border-t border-gray-50 pt-3 mt-auto">
                            <div className="flex flex-wrap gap-1">
                                {influencer.services.slice(0, 3).map((service, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium bg-violet-50 text-violet-700"
                                    >
                                        <span>{ENGAGEMENT_ICONS[service.engagement_type] || "▶️"}</span>
                                        <span className="capitalize">{service.engagement_type.replace(/_/g, " ")}</span>
                                    </span>
                                ))}
                                {influencer.services.length > 3 && (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-lg">
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
