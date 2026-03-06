"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: "Weak", color: "bg-rose-500" };
    if (score <= 2) return { score, label: "Fair", color: "bg-orange-400" };
    if (score <= 3) return { score, label: "Good", color: "bg-yellow-400" };
    return { score, label: "Strong", color: "bg-green-500" };
}

export default function RegisterPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"fan" | "influencer">("fan");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const strength = getPasswordStrength(password);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
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

            // Redirect to login with registered flag — login will redirect to onboarding
            router.push(`/login?registered=1&role=${role}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8">
                <div className="text-center mb-8">
                    <Link href="/" className="text-2xl font-extrabold text-violet-600">InfluenceMe</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-3">Create account</h1>
                    <p className="text-gray-500 mt-1 text-sm">Join the marketplace today</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
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
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none"
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
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-violet-500 outline-none"
                            placeholder="At least 8 characters"
                        />
                        {password && (
                            <div className="mt-2">
                                <div className="flex gap-1 mb-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-colors ${
                                                strength.score >= i ? strength.color : "bg-gray-200"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400">
                                    Password strength: <span className="font-medium text-gray-600">{strength.label}</span>
                                </p>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            I am a...
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole("fan")}
                                className={`py-3 rounded-xl border-2 font-medium transition-colors ${
                                    role === "fan"
                                        ? "border-violet-600 bg-violet-50 text-violet-700"
                                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                            >
                                Fan
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("influencer")}
                                className={`py-3 rounded-xl border-2 font-medium transition-colors ${
                                    role === "influencer"
                                        ? "border-violet-600 bg-violet-50 text-violet-700"
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
                        className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors disabled:bg-violet-300"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-violet-600 font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
