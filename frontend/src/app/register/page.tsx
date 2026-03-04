"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"fan" | "influencer">("fan");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Registration failed.");
            }

            // Redirect to login after successful registration
            router.push("/login?registered=1");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create account</h1>
                    <p className="text-gray-500 mt-2">Join InfluenceMe today</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="At least 8 characters"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            I am a...
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole("fan")}
                                className={`py-3 rounded-lg border-2 font-medium transition-colors ${
                                    role === "fan"
                                        ? "border-blue-600 bg-blue-50 text-blue-600"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                            >
                                Fan
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("influencer")}
                                className={`py-3 rounded-lg border-2 font-medium transition-colors ${
                                    role === "influencer"
                                        ? "border-blue-600 bg-blue-50 text-blue-600"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                            >
                                Influencer
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-blue-600 font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
