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
    return { score, label: "Strong", color: "bg-lk-cyan" };
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

            router.push(`/login?registered=1&role=${role}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-lk-black py-12 px-4 pt-24">
            <div className="max-w-md w-full bg-lk-surface border border-lk-border rounded-2xl p-8">
                <div className="text-center mb-8">
                    <Link
                        href="/"
                        className="text-2xl font-black text-lk-amber tracking-[-0.04em] block mb-6"
                        style={{ fontFamily: "var(--font-syne)" }}
                    >
                        LEAKY
                    </Link>
                    <h1 className="text-2xl font-bold text-lk-white" style={{ fontFamily: "var(--font-syne)" }}>
                        Create account
                    </h1>
                    <p className="text-lk-muted mt-1.5 text-sm">Join the marketplace today</p>
                </div>

                {error && (
                    <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-xs font-semibold text-lk-muted-bright uppercase tracking-wider mb-1.5">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-lk-black border border-lk-border rounded-xl p-3 text-lk-white placeholder-lk-muted focus:border-lk-amber/50 focus:outline-none transition-colors text-sm"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-xs font-semibold text-lk-muted-bright uppercase tracking-wider mb-1.5">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-lk-black border border-lk-border rounded-xl p-3 text-lk-white placeholder-lk-muted focus:border-lk-amber/50 focus:outline-none transition-colors text-sm"
                            placeholder="At least 8 characters"
                        />
                        {password && (
                            <div className="mt-2">
                                <div className="flex gap-1 mb-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-colors ${
                                                strength.score >= i ? strength.color : "bg-lk-border"
                                            }`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-lk-muted">
                                    Strength: <span className="font-semibold text-lk-muted-bright">{strength.label}</span>
                                </p>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-lk-muted-bright uppercase tracking-wider mb-2">
                            I am a...
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole("fan")}
                                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                    role === "fan"
                                        ? "border-lk-amber bg-lk-amber/10 text-lk-amber"
                                        : "border-lk-border text-lk-muted-bright hover:border-lk-border-bright"
                                }`}
                            >
                                Fan
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole("influencer")}
                                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                                    role === "influencer"
                                        ? "border-lk-amber bg-lk-amber/10 text-lk-amber"
                                        : "border-lk-border text-lk-muted-bright hover:border-lk-border-bright"
                                }`}
                            >
                                Creator
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-lk-amber text-lk-black font-bold rounded-full hover:brightness-110 transition-all disabled:opacity-50 tracking-wide"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="text-center text-lk-muted text-sm mt-6">
                    Already have an account?{" "}
                    <Link href="/login" className="text-lk-amber font-semibold hover:brightness-110 transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
