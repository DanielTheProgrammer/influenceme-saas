"use client";

import { useEffect, useState, useMemo } from "react";
import InfluencerCard from "@/components/InfluencerCard";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENGAGEMENT_TYPES = [
    { value: "", label: "All Types" },
    { value: "story_tag", label: "Story Tag" },
    { value: "story_highlight", label: "Story Highlight" },
    { value: "permanent_follow", label: "Permanent Follow" },
    { value: "timed_follow", label: "Timed Follow" },
    { value: "post_tag", label: "Post Tag" },
    { value: "comment", label: "Comment" },
];

export default function BrowsePage() {
    const [influencers, setInfluencers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    useEffect(() => {
        fetch(`${API_URL}/marketplace/influencers`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch influencers");
                return res.json();
            })
            .then((data) => {
                setInfluencers(data);
                setLoading(false);
            })
            .catch((err) => {
                toast.error(err.message);
                setLoading(false);
            });
    }, []);

    const filtered = useMemo(() => {
        return influencers.filter((inf) => {
            const matchesSearch =
                !search ||
                inf.display_name.toLowerCase().includes(search.toLowerCase()) ||
                inf.instagram_handle?.toLowerCase().includes(search.toLowerCase()) ||
                inf.tiktok_handle?.toLowerCase().includes(search.toLowerCase()) ||
                inf.bio?.toLowerCase().includes(search.toLowerCase());

            const matchesType =
                !filterType ||
                inf.services.some((s: any) => s.engagement_type === filterType);

            const matchesPrice =
                !maxPrice ||
                inf.services.some((s: any) => s.price <= parseFloat(maxPrice));

            return matchesSearch && matchesType && matchesPrice;
        });
    }, [influencers, search, filterType, maxPrice]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Browse Influencers</h1>
                <p className="text-gray-500">{loading ? "Loading..." : `${filtered.length} influencer${filtered.length !== 1 ? "s" : ""} found`}</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-3">
                <input
                    type="text"
                    placeholder="Search by name, handle, or bio..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                    {ENGAGEMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Max $</span>
                    <input
                        type="number"
                        placeholder="Any price"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        min="0"
                        className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-36"
                    />
                </div>
                {(search || filterType || maxPrice) && (
                    <button
                        onClick={() => { setSearch(""); setFilterType(""); setMaxPrice(""); }}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                            <div className="h-3 bg-gray-200 rounded mb-2" />
                            <div className="h-3 bg-gray-200 rounded w-4/5" />
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                    <p className="text-gray-400 text-lg mb-2">No influencers match your filters.</p>
                    <button
                        onClick={() => { setSearch(""); setFilterType(""); setMaxPrice(""); }}
                        className="text-blue-600 hover:underline text-sm"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((influencer) => (
                        <InfluencerCard key={influencer.id} influencer={influencer} />
                    ))}
                </div>
            )}
        </div>
    );
}
