import Link from "next/link";

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

const ENGAGEMENT_COLORS: Record<string, string> = {
    permanent_follow: "bg-blue-50 text-blue-700",
    timed_follow: "bg-cyan-50 text-cyan-700",
    story_tag: "bg-pink-50 text-pink-700",
    story_highlight: "bg-yellow-50 text-yellow-700",
    post_tag: "bg-orange-50 text-orange-700",
    comment: "bg-green-50 text-green-700",
};

function formatFollowers(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
    return String(n);
}

export default function InfluencerCard({ influencer }: { influencer: Influencer }) {
    const prices = influencer.services.map((s) => s.price);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;
    const priceLabel =
        minPrice === null
            ? null
            : minPrice === maxPrice
            ? `$${minPrice.toFixed(0)}`
            : `$${minPrice.toFixed(0)} – $${maxPrice!.toFixed(0)}`;

    const handle = influencer.instagram_handle || influencer.tiktok_handle;

    return (
        <Link href={`/influencers/${influencer.id}`} className="block group">
            <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden border border-gray-100 group-hover:border-violet-200 h-full flex flex-col">
                {/* Top gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500" />

                <div className="p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative flex-shrink-0">
                            <img
                                src={influencer.profile_picture_url || `https://i.pravatar.cc/80?u=${influencer.id}`}
                                alt={influencer.display_name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-violet-100 group-hover:border-violet-300 transition-colors"
                            />
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
                        {priceLabel && (
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-gray-400">from</p>
                                <p className="text-green-600 font-bold text-sm">${minPrice!.toFixed(0)}</p>
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
                                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg font-medium ${ENGAGEMENT_COLORS[service.engagement_type] || "bg-gray-100 text-gray-600"}`}
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
