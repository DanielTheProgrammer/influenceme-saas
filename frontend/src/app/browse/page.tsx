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

    const hasFilters = !!(search || filterType || maxPrice);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page header */}
            <div className="bg-gradient-to-br from-violet-700 via-blue-700 to-indigo-800 text-white px-4 py-14">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-4xl font-extrabold mb-2">Browse Influencers</h1>
                    <p className="text-blue-100 text-lg">
                        {loading
                            ? "Loading creators..."
                            : `${filtered.length} creator${filtered.length !== 1 ? "s" : ""} available`}
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8 flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by name, handle, or bio..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                        />
                    </div>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white text-gray-700"
                    >
                        {ENGAGEMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                        <input
                            type="number"
                            placeholder="Max price"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            min="0"
                            className="border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-violet-500 outline-none w-36"
                        />
                    </div>
                    {hasFilters && (
                        <button
                            onClick={() => { setSearch(""); setFilterType(""); setMaxPrice(""); }}
                            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors whitespace-nowrap"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
                                <div className="h-1.5 bg-gray-200" />
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-14 h-14 rounded-full bg-gray-200 flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                                            <div className="h-3 bg-gray-200 rounded w-1/3" />
                                        </div>
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded mb-2" />
                                    <div className="h-3 bg-gray-200 rounded w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-lg font-medium mb-2">No influencers match your filters</p>
                        <p className="text-gray-400 text-sm mb-4">Try adjusting your search or removing some filters</p>
                        {hasFilters && (
                            <button
                                onClick={() => { setSearch(""); setFilterType(""); setMaxPrice(""); }}
                                className="text-violet-600 hover:underline text-sm font-medium"
                            >
                                Clear all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((influencer) => (
                            <InfluencerCard key={influencer.id} influencer={influencer} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
