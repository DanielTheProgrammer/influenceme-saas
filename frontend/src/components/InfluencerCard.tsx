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
    services: Service[];
}

const ENGAGEMENT_ICONS: Record<string, string> = {
    permanent_follow: "👥",
    timed_follow: "⏱️",
    story_tag: "🏷️",
    story_highlight: "🌟",
    post_tag: "📌",
    comment: "💬",
};

export default function InfluencerCard({ influencer }: { influencer: Influencer }) {
    const prices = influencer.services.map(s => s.price);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;
    const priceLabel = minPrice === maxPrice
        ? `$${minPrice?.toFixed(0)}`
        : `$${minPrice?.toFixed(0)} – $${maxPrice?.toFixed(0)}`;

    return (
        <Link href={`/influencers/${influencer.id}`} className="block">
            <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 h-full border border-transparent hover:border-blue-200 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                    <img
                        src={influencer.profile_picture_url || `https://i.pravatar.cc/80?u=${influencer.id}`}
                        alt={influencer.display_name}
                        className="w-16 h-16 rounded-full border-2 border-blue-100 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold truncate">{influencer.display_name}</h2>
                        {influencer.instagram_handle && (
                            <p className="text-blue-500 text-sm truncate">{influencer.instagram_handle}</p>
                        )}
                        {prices.length > 0 && (
                            <p className="text-green-600 font-semibold text-sm">{priceLabel}</p>
                        )}
                    </div>
                </div>

                {influencer.bio && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">{influencer.bio}</p>
                )}

                <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400 font-medium mb-2">
                        {influencer.services.length} service{influencer.services.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {influencer.services.slice(0, 4).map((service, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                                <span>{ENGAGEMENT_ICONS[service.engagement_type] || "▶️"}</span>
                                <span className="capitalize">{service.engagement_type.replace(/_/g, " ")}</span>
                            </span>
                        ))}
                        {influencer.services.length > 4 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-xs rounded-full">
                                +{influencer.services.length - 4} more
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
