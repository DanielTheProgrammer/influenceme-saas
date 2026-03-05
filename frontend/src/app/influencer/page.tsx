"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const ENGAGEMENT_TYPES = [
    { value: "story_tag", label: "Story Tag" },
    { value: "story_highlight", label: "Story Highlight" },
    { value: "permanent_follow", label: "Permanent Follow" },
    { value: "timed_follow", label: "Timed Follow" },
    { value: "post_tag", label: "Post Tag" },
    { value: "comment", label: "Comment" },
];

interface Service {
    id: number;
    engagement_type: string;
    price: number;
    description: string | null;
    duration_days: number | null;
    is_active: boolean;
}

interface Profile {
    id: number;
    display_name: string;
    bio: string | null;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    profile_picture_url: string | null;
    services: Service[];
}

export default function InfluencerOnboarding() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const token = (session as any)?.accessToken;

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Profile form state
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [instagramHandle, setInstagramHandle] = useState("");
    const [tiktokHandle, setTiktokHandle] = useState("");
    const [profilePicUrl, setProfilePicUrl] = useState("");

    // New service form state
    const [showServiceForm, setShowServiceForm] = useState(false);
    const [serviceType, setServiceType] = useState("story_tag");
    const [servicePrice, setServicePrice] = useState("");
    const [serviceDescription, setServiceDescription] = useState("");
    const [serviceDays, setServiceDays] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") router.push("/login?redirect=/influencer");
    }, [status, router]);

    useEffect(() => {
        if (!token) return;
        fetch(`${API_URL}/influencers/profile`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data) {
                    setProfile(data);
                    setDisplayName(data.display_name || "");
                    setBio(data.bio || "");
                    setInstagramHandle(data.instagram_handle || "");
                    setTiktokHandle(data.tiktok_handle || "");
                    setProfilePicUrl(data.profile_picture_url || "");
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [token]);

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${API_URL}/influencers/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    display_name: displayName,
                    bio: bio || null,
                    instagram_handle: instagramHandle || null,
                    tiktok_handle: tiktokHandle || null,
                    profile_picture_url: profilePicUrl || null,
                }),
            });
            if (!res.ok) throw new Error("Failed to save profile.");
            const data = await res.json();
            setProfile(data);
            toast.success("Profile saved!");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const addService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!servicePrice) return;
        try {
            const res = await fetch(`${API_URL}/influencers/services`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    engagement_type: serviceType,
                    price: parseFloat(servicePrice),
                    description: serviceDescription || null,
                    duration_days: serviceDays ? parseInt(serviceDays) : null,
                }),
            });
            if (!res.ok) throw new Error("Failed to add service.");
            // Refresh profile to get updated services list
            const profileRes = await fetch(`${API_URL}/influencers/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProfile(await profileRes.json());
            setShowServiceForm(false);
            setServiceType("story_tag");
            setServicePrice("");
            setServiceDescription("");
            setServiceDays("");
            toast.success("Service added!");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const deleteService = async (serviceId: number) => {
        try {
            await fetch(`${API_URL}/influencers/services/${serviceId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            const profileRes = await fetch(`${API_URL}/influencers/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProfile(await profileRes.json());
            toast.success("Service removed.");
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    if (status === "loading" || loading) {
        return (
            <div className="max-w-3xl mx-auto py-8">
                <div className="animate-pulse space-y-4">
                    <div className="h-10 bg-gray-200 rounded w-1/3" />
                    <div className="h-64 bg-gray-200 rounded-xl" />
                </div>
            </div>
        );
    }

    if (status === "unauthenticated") return null;

    return (
        <div className="max-w-3xl mx-auto py-8 space-y-8">
            <h1 className="text-3xl font-bold">Influencer Profile</h1>

            {/* Profile Form */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4">Your Profile</h2>
                <form onSubmit={saveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
                            <input
                                required
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Your public name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Picture URL</label>
                            <input
                                value={profilePicUrl}
                                onChange={e => setProfilePicUrl(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instagram Handle</label>
                            <input
                                value={instagramHandle}
                                onChange={e => setInstagramHandle(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="@yourhandle"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">TikTok Handle</label>
                            <input
                                value={tiktokHandle}
                                onChange={e => setTiktokHandle(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="@yourhandle"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Tell fans about yourself..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                    >
                        {saving ? "Saving..." : "Save Profile"}
                    </button>
                </form>
            </div>

            {/* Services */}
            {profile && (
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Services</h2>
                        <button
                            onClick={() => setShowServiceForm(true)}
                            className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                            + Add Service
                        </button>
                    </div>

                    {profile.services.length === 0 ? (
                        <p className="text-gray-500 text-sm">No services yet. Add your first service to appear in the marketplace.</p>
                    ) : (
                        <div className="space-y-3">
                            {profile.services.map(service => (
                                <div key={service.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                                    <div>
                                        <span className="font-medium capitalize">{service.engagement_type.replace(/_/g, " ")}</span>
                                        {service.description && <p className="text-sm text-gray-500">{service.description}</p>}
                                        {service.duration_days && <p className="text-xs text-gray-400">{service.duration_days} days</p>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-green-600">${service.price.toFixed(2)}</span>
                                        <button
                                            onClick={() => deleteService(service.id)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Service Modal */}
                    {showServiceForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                                <h3 className="text-xl font-bold mb-4">Add Service</h3>
                                <form onSubmit={addService} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Engagement Type</label>
                                        <select
                                            value={serviceType}
                                            onChange={e => setServiceType(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {ENGAGEMENT_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Price ($) *</label>
                                        <input
                                            required
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            value={servicePrice}
                                            onChange={e => setServicePrice(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="25.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                        <textarea
                                            value={serviceDescription}
                                            onChange={e => setServiceDescription(e.target.value)}
                                            rows={2}
                                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days, for timed services)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={serviceDays}
                                            onChange={e => setServiceDays(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Leave blank if permanent"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button type="button" onClick={() => setShowServiceForm(false)}
                                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300">
                                            Cancel
                                        </button>
                                        <button type="submit"
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                                            Add Service
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
