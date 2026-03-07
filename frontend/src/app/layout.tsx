import type { Metadata } from "next";
import { Syne, Epilogue } from "next/font/google";
import "./globals.css";
import AuthContext from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Toaster } from "react-hot-toast";

const syne = Syne({
    subsets: ["latin"],
    variable: "--font-syne",
    weight: ["400", "500", "600", "700", "800"],
    display: "swap",
});

const epilogue = Epilogue({
    subsets: ["latin"],
    variable: "--font-epilogue",
    weight: ["300", "400", "500", "600", "700"],
    display: "swap",
});

export const metadata: Metadata = {
    title: "Leaky — Buy the Story. Own the Narrative.",
    description: "The marketplace where social proof meets strategy. Get tagged, featured, and validated by attractive, successful people.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${syne.variable} ${epilogue.variable}`}>
                <AuthContext>
                    <Navbar />
                    <ErrorBoundary>
                        <main className="min-h-screen bg-lk-black text-lk-white">
                            {children}
                        </main>
                    </ErrorBoundary>
                    <Footer />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: "#0D0D1A",
                                color: "#EDEDFF",
                                border: "1px solid #1A1A2E",
                                fontFamily: "var(--font-epilogue), sans-serif",
                            },
                        }}
                    />
                </AuthContext>
            </body>
        </html>
    );
}
