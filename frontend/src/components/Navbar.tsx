"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
    const { data: session, status } = useSession();
    const [menuOpen, setMenuOpen] = useState(false);

    const role = (session as any)?.user?.role ?? (session as any)?.role;
    const isInfluencer = role === "influencer";
    const isFan = role === "fan";

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-lk-border bg-lk-black/90 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link
                    href="/"
                    className="text-xl font-black text-lk-amber tracking-[-0.04em] leading-none"
                    style={{ fontFamily: "var(--font-syne)" }}
                >
                    LEAKY
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-8">
                    <Link
                        href="/browse"
                        className="text-lk-muted-bright hover:text-lk-white text-sm font-medium tracking-wide transition-colors"
                    >
                        Browse
                    </Link>

                    {status === "authenticated" ? (
                        <>
                            {isFan && (
                                <Link href="/fan/requests" className="text-lk-muted-bright hover:text-lk-white text-sm font-medium tracking-wide transition-colors">
                                    My Requests
                                </Link>
                            )}
                            {isInfluencer && (
                                <>
                                    <Link href="/dashboard" className="text-lk-muted-bright hover:text-lk-white text-sm font-medium tracking-wide transition-colors">
                                        Dashboard
                                    </Link>
                                    <Link href="/influencer/analytics" className="text-lk-muted-bright hover:text-lk-white text-sm font-medium tracking-wide transition-colors">
                                        Analytics
                                    </Link>
                                    <Link href="/influencer" className="text-lk-muted-bright hover:text-lk-white text-sm font-medium tracking-wide transition-colors">
                                        Profile
                                    </Link>
                                </>
                            )}
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-lk-muted truncate max-w-[140px]">{session?.user?.email}</span>
                                <button
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="px-4 py-1.5 text-xs font-semibold text-lk-muted-bright hover:text-lk-white border border-lk-border hover:border-lk-border-bright rounded-full tracking-wide transition-all"
                                >
                                    Sign out
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="text-lk-muted-bright hover:text-lk-white text-sm font-medium tracking-wide transition-colors">
                                Log in
                            </Link>
                            <Link
                                href="/register"
                                className="px-5 py-2 bg-lk-amber text-lk-black text-sm font-bold rounded-full tracking-wide hover:brightness-110 transition-all"
                            >
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 text-lk-muted-bright hover:text-lk-white transition-colors"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {menuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden border-t border-lk-border bg-lk-surface px-5 py-5 space-y-4">
                    <Link href="/browse" onClick={() => setMenuOpen(false)} className="block text-lk-white font-medium text-sm">Browse</Link>
                    {status === "authenticated" ? (
                        <>
                            {isFan && <Link href="/fan/requests" onClick={() => setMenuOpen(false)} className="block text-lk-white font-medium text-sm">My Requests</Link>}
                            {isInfluencer && (
                                <>
                                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block text-lk-white font-medium text-sm">Dashboard</Link>
                                    <Link href="/influencer/analytics" onClick={() => setMenuOpen(false)} className="block text-lk-white font-medium text-sm">Analytics</Link>
                                    <Link href="/influencer" onClick={() => setMenuOpen(false)} className="block text-lk-white font-medium text-sm">Profile</Link>
                                </>
                            )}
                            <button onClick={() => signOut({ callbackUrl: "/" })} className="block text-lk-muted-bright font-medium text-sm">Sign out</button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-lk-white font-medium text-sm">Log in</Link>
                            <Link href="/register" onClick={() => setMenuOpen(false)} className="inline-block px-5 py-2 bg-lk-amber text-lk-black text-sm font-bold rounded-full">Get Started</Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
