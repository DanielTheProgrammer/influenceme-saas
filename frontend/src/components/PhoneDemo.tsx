"use client";

import { useState, useEffect, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────
const GUY        = "https://randomuser.me/api/portraits/men/32.jpg";
const SOFIA_AVT  = "https://randomuser.me/api/portraits/women/44.jpg";
const MAYA_AVT   = "https://randomuser.me/api/portraits/women/68.jpg";
const BELLA_AVT  = "https://randomuser.me/api/portraits/women/32.jpg";
const ZARA_AVT   = "https://randomuser.me/api/portraits/women/17.jpg";
const EMMA_AVT   = "https://randomuser.me/api/portraits/women/55.jpg";

// Real party/club photo — Unsplash (with onError fallback in JSX)
const PARTY_PHOTO = "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=530&h=400&fit=crop&q=80";

const STORY_USERS = [
    { name: "sofia_m",  ring: "linear-gradient(45deg,#FF6B9D,#FCAF45,#E1306C)", avatar: SOFIA_AVT },
    { name: "maya.k",   ring: "linear-gradient(45deg,#A29BFE,#FCAF45,#E1306C)", avatar: MAYA_AVT  },
    { name: "bella_",   ring: "linear-gradient(45deg,#FD79A8,#FCAF45,#E1306C)", avatar: BELLA_AVT },
    { name: "zara.off", ring: "linear-gradient(45deg,#FDCB6E,#FCAF45,#E1306C)", avatar: ZARA_AVT  },
    { name: "emma.v",   ring: "linear-gradient(45deg,#74B9FF,#FCAF45,#E1306C)", avatar: EMMA_AVT  },
];

const STREAM_COMMENTS = [
    { user: "sofia_m",   text: "omg you look amazing 😍",                   avatar: SOFIA_AVT },
    { user: "maya.k",    text: "tagged you in my story!! 🏷️",              avatar: MAYA_AVT  },
    { user: "alex_r",    text: "who IS this?? I need to know 👀",           avatar: "https://randomuser.me/api/portraits/women/21.jpg" },
    { user: "bella_",    text: "your aura rn bestie ✨",                     avatar: BELLA_AVT },
    { user: "zara.off",  text: "just tagged you again, sorry not sorry 😭",  avatar: ZARA_AVT  },
    { user: "emma.v",    text: "we NEED to collab 🤝",                       avatar: EMMA_AVT  },
    { user: "lily.rose", text: "girlies asking about you everywhere lol",    avatar: "https://randomuser.me/api/portraits/women/73.jpg" },
    { user: "ava.k",     text: "your ex definitely saw this 💅",             avatar: "https://randomuser.me/api/portraits/women/89.jpg" },
    { user: "nina.m",    text: "tagged you in 3 stories tonight omg",        avatar: "https://randomuser.me/api/portraits/women/12.jpg" },
    { user: "chloe_",    text: "following!! profile is goals 🫶",            avatar: "https://randomuser.me/api/portraits/women/49.jpg" },
    { user: "leila.j",   text: "you're literally everywhere rn 🔥",          avatar: "https://randomuser.me/api/portraits/women/36.jpg" },
    { user: "sara.off",  text: "this story is going viral bestie",           avatar: "https://randomuser.me/api/portraits/women/61.jpg" },
];

const NOTIFICATIONS = [
    { text: "sofia_m tagged you in their story",    avatar: SOFIA_AVT },
    { text: "maya.k tagged you in a post",          avatar: MAYA_AVT  },
    { text: "bella_ mentioned you in a story",      avatar: BELLA_AVT },
    { text: "zara.off tagged you in their story",   avatar: ZARA_AVT  },
    { text: "emma.v shared your post to her story", avatar: EMMA_AVT  },
];

const DM_MESSAGES = [
    { from: "her", text: "hey you looked SO good in that story 😍" },
    { from: "her", text: "literally who are those girls 👀"         },
    { from: "you", text: "just some friends haha"                   },
    { from: "her", text: "can we hang sometime? 🥺"                 },
];

const STORY_VIEWERS = [SOFIA_AVT, MAYA_AVT, BELLA_AVT, ZARA_AVT];

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

let uid = 10;

// ─── Shared status bar ────────────────────────────────────────
function StatusBar({ dark }: { dark?: boolean }) {
    const c = dark ? "#fff" : "#000";
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "50px 16px 4px", flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: c }}>9:41</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <svg width="14" height="10" viewBox="0 0 14 10" fill={c}>
                    <rect x="0" y="6" width="2.5" height="4" rx="0.5"/>
                    <rect x="3.5" y="4" width="2.5" height="6" rx="0.5"/>
                    <rect x="7" y="2" width="2.5" height="8" rx="0.5"/>
                    <rect x="10.5" y="0" width="2.5" height="10" rx="0.5"/>
                </svg>
                <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
                    <rect x="0.5" y="0.5" width="15" height="10" rx="2" stroke={c} strokeWidth="1"/>
                    <rect x="16" y="3.5" width="2" height="4" rx="1" fill={c}/>
                    <rect x="1.5" y="1.5" width="11" height="8" rx="1.5" fill={c}/>
                </svg>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────
export default function PhoneDemo() {
    const [comments, setComments] = useState<(typeof STREAM_COMMENTS[0] & { uid: number })[]>(() =>
        STREAM_COMMENTS.slice(0, 3).map((c, i) => ({ ...c, uid: i }))
    );
    const [notification, setNotification] = useState<{ text: string; avatar: string; key: number } | null>(null);
    const [likes, setLikes]       = useState(2847);
    const [storyCount, setStoryCount] = useState(5);
    const [view, setView]         = useState(0); // 0=feed  1=dm  2=story
    const commentIdx  = useRef(3);
    const notifIdx    = useRef(0);
    const notifKey    = useRef(0);

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

    // Cycle screens every 7s
    useEffect(() => {
        const t = setInterval(() => setView(v => (v + 1) % 3), 7000);
        return () => clearInterval(t);
    }, []);

    // ── Screen 0: Instagram feed ───────────────────────────────
    const feedScreen = (
        <div style={{ position: "absolute", inset: 0, background: "#fff", display: "flex", flexDirection: "column", fontFamily: FONT, overflow: "hidden" }}>
            <StatusBar />

            {/* IG header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 12px 4px" }}>
                <svg width="82" height="22" viewBox="0 0 82 22">
                    <text x="0" y="18" style={{ fontSize: 20, fontFamily: '"Grand Hotel","Billabong",cursive', fill: "#000" }}>Instagram</text>
                </svg>
                <div style={{ display: "flex", gap: 10 }}>
                    <svg width="20" height="20" fill="none" stroke="#000" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    <svg width="20" height="20" fill="none" stroke="#000" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </div>
            </div>

            {/* Stories row */}
            <div style={{ padding: "4px 10px 6px", overflowX: "hidden" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* Your story */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                        <div style={{ position: "relative" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={GUY} alt="you" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", display: "block", border: "2px solid #dbdbdb" }} />
                            <div style={{ position: "absolute", bottom: -1, right: -1, width: 16, height: 16, borderRadius: "50%", background: "#0095F6", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>+</div>
                        </div>
                        <span style={{ fontSize: 9, color: "#262626", whiteSpace: "nowrap" }}>Your story</span>
                    </div>
                    {STORY_USERS.map(u => (
                        <div key={u.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                            <div style={{ padding: 2.5, borderRadius: "50%", background: u.ring }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u.avatar} alt={u.name} style={{ width: 38, height: 38, borderRadius: "50%", border: "2.5px solid #fff", display: "block", objectFit: "cover" }} />
                            </div>
                            <span style={{ fontSize: 9, color: "#262626", whiteSpace: "nowrap" }}>{u.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ height: 1, background: "#efefef", flexShrink: 0 }} />

            {/* Post header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px 6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={GUY} alt="you" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid #dbdbdb" }} />
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#262626", margin: 0 }}>you</p>
                        <p style={{ fontSize: 9, color: "#8E8E8E", margin: 0 }}>New York, NY</p>
                    </div>
                </div>
                <svg width="16" height="4" viewBox="0 0 20 4" fill="#262626"><circle cx="2" cy="2" r="2"/><circle cx="10" cy="2" r="2"/><circle cx="18" cy="2" r="2"/></svg>
            </div>

            {/* Post image — real party photo with tag labels */}
            <div style={{ height: 138, flexShrink: 0, position: "relative", overflow: "hidden", background: "linear-gradient(160deg,#0d0010,#2b0a3d,#5c1a5a)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={PARTY_PHOTO}
                    alt="party"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                {/* tag labels bottom-left / bottom-right */}
                <div style={{ position: "absolute", bottom: 7, left: 9, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)", borderRadius: 4, padding: "2px 6px", fontSize: 8, fontWeight: 700, color: "#fff" }}>@sofia_m</div>
                <div style={{ position: "absolute", bottom: 7, right: 9, background: "rgba(0,0,0,0.62)", backdropFilter: "blur(4px)", borderRadius: 4, padding: "2px 6px", fontSize: 8, fontWeight: 700, color: "#fff" }}>@maya.k</div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px" }}>
                <div style={{ display: "flex", gap: 12 }}>
                    <svg width="20" height="20" fill="none" stroke="#262626" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    <svg width="20" height="20" fill="none" stroke="#262626" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    <svg width="20" height="20" fill="none" stroke="#262626" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </div>
                <svg width="20" height="20" fill="none" stroke="#262626" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
            </div>

            {/* Likes */}
            <div style={{ padding: "0 12px 4px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#262626", margin: 0 }}>{likes.toLocaleString()} likes</p>
            </div>

            {/* Comments stream */}
            <div style={{ flex: 1, overflow: "hidden", padding: "2px 12px 8px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 4 }}>
                {comments.map((c, i) => (
                    <div
                        key={c.uid}
                        className={i === comments.length - 1 ? "animate-slide-up" : ""}
                        style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.35 + (i / comments.length) * 0.65 }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.avatar} alt={c.user} style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, objectFit: "cover", border: "1px solid #dbdbdb" }} />
                        <span style={{ fontWeight: 700, color: "#262626", fontSize: 11 }}>{c.user} </span>
                        <span style={{ color: "#262626", fontSize: 11, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{c.text}</span>
                    </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, paddingTop: 6, borderTop: "1px solid #efefef" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={GUY} alt="you" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}/>
                    <span style={{ color: "#8E8E8E", fontSize: 11 }}>Add a comment…</span>
                </div>
            </div>
        </div>
    );

    // ── Screen 1: DM from sofia_m ──────────────────────────────
    const dmScreen = (
        <div style={{ position: "absolute", inset: 0, background: "#fff", display: "flex", flexDirection: "column", fontFamily: FONT, overflow: "hidden" }}>
            <StatusBar />

            {/* DM header */}
            <div style={{ display: "flex", alignItems: "center", padding: "4px 12px 10px", borderBottom: "1px solid #efefef", gap: 10, flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SOFIA_AVT} alt="sofia_m" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#262626", margin: 0 }}>sofia_m</p>
                    <p style={{ fontSize: 10, color: "#3897F0", margin: 0, fontWeight: 500 }}>Active now</p>
                </div>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2" strokeLinecap="round"><path d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>

            {/* Profile name centre */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 8px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SOFIA_AVT} alt="sofia_m" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "cover", marginBottom: 5 }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: "#262626", margin: 0 }}>sofia_m</p>
                <p style={{ fontSize: 10, color: "#8E8E8E", margin: "2px 0 0" }}>Instagram · sofia_m</p>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: "4px 12px 8px", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 7 }}>
                {DM_MESSAGES.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.from === "you" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
                        {msg.from === "her" && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={SOFIA_AVT} alt="" style={{ width: 20, height: 20, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        )}
                        <div style={{
                            maxWidth: "70%",
                            padding: "8px 12px",
                            borderRadius: msg.from === "you" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            background: msg.from === "you" ? "linear-gradient(135deg,#7B61FF,#0095F6)" : "#EFEFEF",
                            color: msg.from === "you" ? "#fff" : "#262626",
                            fontSize: 11.5,
                            lineHeight: 1.45,
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {/* Seen */}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SOFIA_AVT} alt="" style={{ width: 12, height: 12, borderRadius: "50%", objectFit: "cover" }} />
                    <span style={{ fontSize: 9, color: "#8E8E8E" }}>Seen</span>
                </div>
            </div>

            {/* Message input */}
            <div style={{ padding: "6px 12px 16px", borderTop: "1px solid #efefef", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <div style={{ flex: 1, border: "1px solid #dbdbdb", borderRadius: 22, padding: "7px 12px", fontSize: 11, color: "#8E8E8E" }}>Message…</div>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E84393" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            </div>
        </div>
    );

    // ── Screen 2: Your story with viewers ─────────────────────
    const storyScreen = (
        <div style={{ position: "absolute", inset: 0, background: "#111", display: "flex", flexDirection: "column", fontFamily: FONT, overflow: "hidden" }}>
            {/* Background party photo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={PARTY_PHOTO}
                alt="story"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", opacity: 0.82 }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }}
            />
            {/* Gradient overlays */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.75) 100%)" }} />

            {/* Content */}
            <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Progress bars */}
                <div style={{ display: "flex", gap: 3, padding: "52px 10px 8px" }}>
                    {[100, 48, 0].map((pct, i) => (
                        <div key={i} style={{ flex: 1, height: 2.5, background: "rgba(255,255,255,0.3)", borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "rgba(255,255,255,0.92)", borderRadius: 2 }} />
                        </div>
                    ))}
                </div>

                {/* Story header row */}
                <div style={{ display: "flex", alignItems: "center", padding: "0 12px 4px", gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={GUY} alt="you" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", border: "2px solid #fff" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>you</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>2h ago</span>
                    <div style={{ flex: 1 }} />
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </div>

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Tag labels in photo */}
                <div style={{ display: "flex", justifyContent: "space-around", padding: "0 20px", marginBottom: 12 }}>
                    <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 6, padding: "3px 9px", fontSize: 9, fontWeight: 700, color: "#111", boxShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>@sofia_m</div>
                    <div style={{ background: "rgba(255,255,255,0.88)", borderRadius: 6, padding: "3px 9px", fontSize: 9, fontWeight: 700, color: "#111", boxShadow: "0 1px 6px rgba(0,0,0,0.3)" }}>@maya.k</div>
                </div>

                {/* Viewers row */}
                <div style={{ padding: "6px 14px 4px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex" }}>
                        {STORY_VIEWERS.map((a, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={i} src={a} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", border: "1.5px solid #111", marginLeft: i > 0 ? -7 : 0 }} />
                        ))}
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>47 views · 12 ❤️</span>
                </div>

                {/* Reply input */}
                <div style={{ padding: "4px 12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: 22, padding: "7px 14px", fontSize: 11, color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.07)" }}>
                        Reply to your story…
                    </div>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                </div>
            </div>
        </div>
    );

    // ── Render ─────────────────────────────────────────────────
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
                <div style={{ position: "absolute", left: -3, top: 90,  width: 3, height: 28, background: "#222", borderRadius: "2px 0 0 2px" }} />
                <div style={{ position: "absolute", left: -3, top: 126, width: 3, height: 52, background: "#222", borderRadius: "2px 0 0 2px" }} />
                {/* Dynamic Island */}
                <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 94, height: 30, borderRadius: 20, background: "#000", zIndex: 20 }} />

                {/* Animated screen */}
                <div key={view} className="animate-view-in">
                    {view === 0 && feedScreen}
                    {view === 1 && dmScreen}
                    {view === 2 && storyScreen}
                </div>

                {/* Notification banner — floats above all screens */}
                {notification && (
                    <div
                        key={notification.key}
                        className="animate-notify"
                        style={{
                            position: "absolute", top: 0, left: 0, right: 0, zIndex: 30,
                            background: "rgba(28,28,28,0.94)",
                            backdropFilter: "blur(20px)",
                            WebkitBackdropFilter: "blur(20px)",
                            padding: "12px 14px",
                            display: "flex", alignItems: "center", gap: 10,
                            borderRadius: "0 0 18px 18px",
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={notification.avatar} alt="" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, objectFit: "cover", border: "1.5px solid rgba(255,255,255,0.2)" }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: "#fff", fontSize: 11, fontWeight: 600, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{notification.text}</p>
                            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, margin: 0 }}>Instagram · now</p>
                        </div>
                    </div>
                )}
            </div>

            {/* View indicator dots */}
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
                {[0, 1, 2].map(i => (
                    <button
                        key={i}
                        onClick={() => setView(i)}
                        style={{
                            width: i === view ? 18 : 6, height: 6, borderRadius: 3,
                            background: i === view ? "#F0A500" : "rgba(255,255,255,0.2)",
                            transition: "all 0.3s ease", border: "none", cursor: "pointer", padding: 0,
                        }}
                    />
                ))}
            </div>

            {/* Story tags badge */}
            <div style={{
                position: "absolute", top: -8, right: -8,
                background: "#F0A500", color: "#000",
                fontSize: 11, fontWeight: 800,
                borderRadius: 20, padding: "3px 8px",
                zIndex: 10,
                boxShadow: "0 4px 12px rgba(240,165,0,0.4)",
                whiteSpace: "nowrap",
            }}>
                {storyCount} tags 🏷️
            </div>
        </div>
    );
}
