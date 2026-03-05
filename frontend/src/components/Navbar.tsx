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
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="text-xl font-extrabold text-blue-600 tracking-tight">
                    InfluenceMe
                </Link>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-6">
                    <Link href="/browse" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                        Browse
                    </Link>

                    {status === "authenticated" ? (
                        <>
                            {isFan && (
                                <Link href="/fan/requests" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                                    My Requests
                                </Link>
                            )}
                            {isInfluencer && (
                                <>
                                    <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                                        Dashboard
                                    </Link>
                                    <Link href="/influencer/analytics" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                                        Analytics
                                    </Link>
                                    <Link href="/influencer" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                                        Profile
                                    </Link>
                                </>
                            )}
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500">{session?.user?.email}</span>
                                <button
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 transition-colors"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link href="/login" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                                Log In
                            </Link>
                            <Link
                                href="/register"
                                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden p-2 text-gray-600"
                    onClick={() => setMenuOpen(!menuOpen)}
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
                    <Link href="/browse" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium">Browse</Link>
                    {status === "authenticated" ? (
                        <>
                            {isFan && <Link href="/fan/requests" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium">My Requests</Link>}
                            {isInfluencer && (
                                <>
                                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium">Dashboard</Link>
                                    <Link href="/influencer/analytics" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium">Analytics</Link>
                                    <Link href="/influencer" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium">Profile</Link>
                                </>
                            )}
                            <button onClick={() => signOut({ callbackUrl: "/" })} className="block text-red-600 font-medium">Sign Out</button>
                        </>
                    ) : (
                        <>
                            <Link href="/login" onClick={() => setMenuOpen(false)} className="block text-gray-700 font-medium">Log In</Link>
                            <Link href="/register" onClick={() => setMenuOpen(false)} className="block text-blue-600 font-bold">Sign Up</Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
