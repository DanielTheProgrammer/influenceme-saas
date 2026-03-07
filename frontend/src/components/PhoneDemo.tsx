"use client";

import { useState, useEffect, useRef } from "react";

const STORY_USERS = [
    { name: "sofia_m",  ring: "linear-gradient(45deg,#FF6B9D,#FCAF45,#E1306C)", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
    { name: "maya.k",   ring: "linear-gradient(45deg,#A29BFE,#FCAF45,#E1306C)", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
    { name: "bella_",   ring: "linear-gradient(45deg,#FD79A8,#FCAF45,#E1306C)", avatar: "https://randomuser.me/api/portraits/women/32.jpg" },
    { name: "zara.off", ring: "linear-gradient(45deg,#FDCB6E,#FCAF45,#E1306C)", avatar: "https://randomuser.me/api/portraits/women/17.jpg" },
    { name: "emma.v",   ring: "linear-gradient(45deg,#74B9FF,#FCAF45,#E1306C)", avatar: "https://randomuser.me/api/portraits/women/55.jpg" },
];

const STREAM_COMMENTS = [
    { user: "sofia_m",    text: "omg you look amazing 😍",                  color: "#FF6B9D", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
    { user: "maya.k",     text: "tagged you in my story!! 🏷️",             color: "#A29BFE", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
    { user: "alex_r",     text: "who IS this?? I need to know 👀",          color: "#74B9FF", avatar: "https://randomuser.me/api/portraits/women/21.jpg" },
    { user: "bella_",     text: "your aura rn bestie ✨",                    color: "#FD79A8", avatar: "https://randomuser.me/api/portraits/women/32.jpg" },
    { user: "zara.off",   text: "just tagged you again, sorry not sorry 😭", color: "#FDCB6E", avatar: "https://randomuser.me/api/portraits/women/17.jpg" },
    { user: "emma.v",     text: "we NEED to collab 🤝",                      color: "#55EFC4", avatar: "https://randomuser.me/api/portraits/women/55.jpg" },
    { user: "lily.rose",  text: "girlies asking about you everywhere lol",   color: "#FF7675", avatar: "https://randomuser.me/api/portraits/women/73.jpg" },
    { user: "ava.k",      text: "your ex definitely saw this 💅",            color: "#E84393", avatar: "https://randomuser.me/api/portraits/women/89.jpg" },
    { user: "nina.m",     text: "tagged you in 3 stories tonight omg",       color: "#C8D6E5", avatar: "https://randomuser.me/api/portraits/women/12.jpg" },
    { user: "chloe_",     text: "following!! profile is goals 🫶",           color: "#6C5CE7", avatar: "https://randomuser.me/api/portraits/women/49.jpg" },
    { user: "leila.j",    text: "you're literally everywhere rn 🔥",         color: "#F0A500", avatar: "https://randomuser.me/api/portraits/women/36.jpg" },
    { user: "sara.off",   text: "this story is going viral bestie",          color: "#00CDB4", avatar: "https://randomuser.me/api/portraits/women/61.jpg" },
];

const NOTIFICATIONS = [
    { text: "sofia_m tagged you in their story",    avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
    { text: "maya.k tagged you in a post",          avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
    { text: "bella_ mentioned you in a story",      avatar: "https://randomuser.me/api/portraits/women/32.jpg" },
    { text: "zara.off tagged you in their story",   avatar: "https://randomuser.me/api/portraits/women/17.jpg" },
    { text: "emma.v shared your post to her story", avatar: "https://randomuser.me/api/portraits/women/55.jpg" },
];

let uid = 10;

export default function PhoneDemo() {
    const [comments, setComments] = useState<(typeof STREAM_COMMENTS[0] & { uid: number })[]>(() =>
        STREAM_COMMENTS.slice(0, 3).map((c, i) => ({ ...c, uid: i }))
    );
    const [notification, setNotification] = useState<{ text: string; avatar: string; key: number } | null>(null);
    const [likes, setLikes] = useState(2847);
    const [storyCount, setStoryCount] = useState(5);
    const commentIdx = useRef(3);
    const notifIdx = useRef(0);
    const notifKey = useRef(0);

    // Stream comments every 1.7s
    useEffect(() => {
        const t = setInterval(() => {
            const c = STREAM_COMMENTS[commentIdx.current % STREAM_COMMENTS.length];
            commentIdx.current++;
            uid++;
            setComments(prev => [...prev.slice(-4), { ...c, uid }]);
            setLikes(prev => prev + Math.floor(Math.random() * 5) + 1);
        }, 1700);
        return () => clearInterval(t);
    }, []);

    // Story notifications every 4.5s
    useEffect(() => {
        const show = () => {
            const n = NOTIFICATIONS[notifIdx.current % NOTIFICATIONS.length];
            notifIdx.current++;
            notifKey.current++;
            setNotification({ text: n.text, avatar: n.avatar, key: notifKey.current });
            setStoryCount(prev => prev + 1);
            setTimeout(() => setNotification(null), 3200);
        };
        const delay = setTimeout(show, 800);
        const t = setInterval(show, 4500);
        return () => { clearTimeout(delay); clearInterval(t); };
    }, []);

    return (
        <div className="relative flex-shrink-0 select-none" style={{ width: 265 }}>
            {/* Glow behind phone */}
            <div className="absolute pointer-events-none" style={{
                inset: "-40px",
                background: "radial-gradient(ellipse at center, rgba(240,165,0,0.14) 0%, rgba(0,205,180,0.06) 50%, transparent 70%)",
                borderRadius: "50%",
            }} />

            {/* Phone frame */}
            <div style={{
                position: "relative",
                width: 265,
                height: 555,
                borderRadius: 44,
                background: "#0C0C0C",
                border: "2px solid rgba(255,255,255,0.13)",
                boxShadow: "0 50px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.07)",
                overflow: "hidden",
            }}>
                {/* Power button */}
                <div style={{ position: "absolute", right: -3, top: 120, width: 3, height: 40, background: "#222", borderRadius: "0 2px 2px 0" }} />
                {/* Volume buttons */}
                <div style={{ position: "absolute", left: -3, top: 90, width: 3, height: 28, background: "#222", borderRadius: "2px 0 0 2px" }} />
                <div style={{ position: "absolute", left: -3, top: 126, width: 3, height: 52, background: "#222", borderRadius: "2px 0 0 2px" }} />

                {/* Dynamic Island */}
                <div style={{
                    position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                    width: 94, height: 30, borderRadius: 20, background: "#000", zIndex: 20,
                }} />

                {/* Screen */}
                <div style={{
                    position: "absolute", inset: 0,
                    background: "#fff",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    overflow: "hidden",
                }}>
                    {/* Notification banner */}
                    {notification && (
                        <div
                            key={notification.key}
                            className="animate-notify"
                            style={{
                                position: "absolute", top: 0, left: 0, right: 0, zIndex: 30,
                                background: "rgba(28,28,28,0.94)",
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                padding: "12px 14px 12px 14px",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                borderRadius: "0 0 18px 18px",
                            }}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={notification.avatar} alt="" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.2)" }}/>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ color: "#fff", fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {notification.text}
                                </p>
                                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, margin: 0 }}>Instagram · now</p>
                            </div>
                        </div>
                    )}

                    {/* Status bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "50px 16px 4px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#000" }}>9:41</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {/* Signal */}
                            <svg width="14" height="10" viewBox="0 0 14 10" fill="#000">
                                <rect x="0" y="6" width="2.5" height="4" rx="0.5"/>
                                <rect x="3.5" y="4" width="2.5" height="6" rx="0.5"/>
                                <rect x="7" y="2" width="2.5" height="8" rx="0.5"/>
                                <rect x="10.5" y="0" width="2.5" height="10" rx="0.5"/>
                            </svg>
                            {/* Battery */}
                            <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
                                <rect x="0.5" y="0.5" width="15" height="10" rx="2" stroke="#000" strokeWidth="1"/>
                                <rect x="16" y="3.5" width="2" height="4" rx="1" fill="#000"/>
                                <rect x="1.5" y="1.5" width="11" height="8" rx="1.5" fill="#000"/>
                            </svg>
                        </div>
                    </div>

                    {/* IG Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 12px 4px" }}>
                        <svg width="82" height="22" viewBox="0 0 82 22">
                            <text x="0" y="18" style={{ fontSize: 20, fontFamily: '"Grand Hotel", "Billabong", cursive', fill: "#000" }}>Instagram</text>
                        </svg>
                        <div style={{ display: "flex", gap: 10 }}>
                            <svg width="20" height="20" fill="none" stroke="#000" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                            </svg>
                            <svg width="20" height="20" fill="none" stroke="#000" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                            </svg>
                        </div>
                    </div>

                    {/* Stories row */}
                    <div style={{ padding: "4px 10px 6px", overflowX: "hidden" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {/* Your story add */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                                <div style={{ position: "relative" }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="you" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid #dbdbdb" }} />
                                    <div style={{
                                        position: "absolute", bottom: -1, right: -1,
                                        width: 16, height: 16, borderRadius: "50%",
                                        background: "#0095F6",
                                        border: "2px solid #fff",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1,
                                    }}>+</div>
                                </div>
                                <span style={{ fontSize: 9, color: "#262626", whiteSpace: "nowrap" }}>Your story</span>
                            </div>

                            {STORY_USERS.map((u) => (
                                <div key={u.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                                    <div style={{ padding: 2.5, borderRadius: "50%", background: u.ring }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={u.avatar}
                                            alt={u.name}
                                            style={{ width: 38, height: 38, borderRadius: "50%", border: "2.5px solid #fff", display: "block", objectFit: "cover" }}
                                        />
                                    </div>
                                    <span style={{ fontSize: 9, color: "#262626", whiteSpace: "nowrap" }}>{u.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: "#efefef", flexShrink: 0 }} />

                    {/* Post header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px 6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="you" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #dbdbdb" }} />
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: "#262626", margin: 0 }}>you</p>
                                <p style={{ fontSize: 9, color: "#8E8E8E", margin: 0 }}>New York, NY</p>
                            </div>
                        </div>
                        <svg width="16" height="4" viewBox="0 0 20 4" fill="#262626">
                            <circle cx="2" cy="2" r="2"/><circle cx="10" cy="2" r="2"/><circle cx="18" cy="2" r="2"/>
                        </svg>
                    </div>

                    {/* Post image — party scene */}
                    <div style={{ height: 138, flexShrink: 0, position: "relative", overflow: "hidden", background: "linear-gradient(160deg,#0d0010 0%,#2b0a3d 35%,#5c1a5a 65%,#1a0020 100%)" }}>
                        {/* Ambient party lights */}
                        <div style={{ position: "absolute", top: -10, left: 30, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,80,140,0.25)", filter: "blur(18px)" }}/>
                        <div style={{ position: "absolute", bottom: -10, right: 20, width: 60, height: 60, borderRadius: "50%", background: "rgba(120,60,255,0.3)", filter: "blur(16px)" }}/>
                        <div style={{ position: "absolute", top: 10, right: 50, width: 40, height: 40, borderRadius: "50%", background: "rgba(255,160,0,0.2)", filter: "blur(14px)" }}/>

                        {/* People row */}
                        <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "space-evenly", alignItems: "flex-end" }}>

                            {/* Girl 1 — sofia_m */}
                            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                {/* Tag box */}
                                <div style={{ background: "rgba(255,255,255,0.92)", borderRadius: 4, padding: "2px 5px", marginBottom: 4, whiteSpace: "nowrap", fontSize: 8, fontWeight: 700, color: "#262626", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
                                    @sofia_m
                                    <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid rgba(255,255,255,0.92)" }}/>
                                </div>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="sofia_m" style={{ width: 46, height: 58, borderRadius: "12px 12px 0 0", objectFit: "cover", objectPosition: "top", border: "2px solid rgba(255,255,255,0.25)" }}/>
                            </div>

                            {/* Guy — you (center, taller) */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="you" style={{ width: 54, height: 72, borderRadius: "12px 12px 0 0", objectFit: "cover", objectPosition: "top", border: "2px solid rgba(255,255,255,0.4)", boxShadow: "0 0 14px rgba(255,255,255,0.12)" }}/>
                            </div>

                            {/* Girl 2 — maya.k */}
                            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                {/* Tag box */}
                                <div style={{ position: "relative", background: "rgba(255,255,255,0.92)", borderRadius: 4, padding: "2px 5px", marginBottom: 4, whiteSpace: "nowrap", fontSize: 8, fontWeight: 700, color: "#262626", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}>
                                    @maya.k
                                    <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "4px solid rgba(255,255,255,0.92)" }}/>
                                </div>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="https://randomuser.me/api/portraits/women/68.jpg" alt="maya.k" style={{ width: 46, height: 58, borderRadius: "12px 12px 0 0", objectFit: "cover", objectPosition: "top", border: "2px solid rgba(255,255,255,0.25)" }}/>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px" }}>
                        <div style={{ display: "flex", gap: 12 }}>
                            <svg width="20" height="20" fill="none" stroke="#262626" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                            </svg>
                            <svg width="20" height="20" fill="none" stroke="#262626" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                            </svg>
                            <svg width="20" height="20" fill="none" stroke="#262626" strokeWidth="1.8" viewBox="0 0 24 24">
                                <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                            </svg>
                        </div>
                        <svg width="20" height="20" fill="none" stroke="#262626" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                    </div>

                    {/* Likes */}
                    <div style={{ padding: "0 12px 4px" }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#262626", margin: 0 }}>
                            {likes.toLocaleString()} likes
                        </p>
                    </div>

                    {/* Comments stream */}
                    <div style={{ flex: 1, overflow: "hidden", padding: "2px 12px 8px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 4 }}>
                        {comments.map((c, i) => (
                            <div
                                key={c.uid}
                                className={i === comments.length - 1 ? "animate-slide-up" : ""}
                                style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.35 + (i / comments.length) * 0.65 }}
                            >
                                {/* Avatar */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={c.avatar}
                                    alt={c.user}
                                    style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, objectFit: "cover", border: "1px solid #dbdbdb" }}
                                />
                                <span style={{ fontWeight: 700, color: "#262626", fontSize: 11 }}>{c.user} </span>
                                <span style={{ color: "#262626", fontSize: 11, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{c.text}</span>
                            </div>
                        ))}

                        {/* Comment input */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, paddingTop: 6, borderTop: "1px solid #efefef" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="you" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}/>
                            <span style={{ color: "#8E8E8E", fontSize: 11 }}>Add a comment…</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Story tags badge */}
            <div style={{
                position: "absolute", top: -8, right: -8,
                background: "#F0A500",
                color: "#000",
                fontSize: 11,
                fontWeight: 800,
                borderRadius: 20,
                padding: "3px 8px",
                zIndex: 10,
                boxShadow: "0 4px 12px rgba(240,165,0,0.4)",
                whiteSpace: "nowrap",
            }}>
                {storyCount} tags 🏷️
            </div>
        </div>
    );
}
