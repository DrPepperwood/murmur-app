import React, { useState, useEffect, useRef, useContext, createContext, useMemo } from "react";
import { Heart, Repeat2, MessageCircle, Feather, Sparkles, ArrowLeft, Calendar, CornerDownRight, Loader2, ImagePlus, X, MapPin, Link2, Camera, Users, Search, Bell, UserPlus, Mail, Send, BadgeCheck, MoreHorizontal, Bookmark, Settings, VolumeX, ShieldOff, BarChart2, Check, Plus, Pin, List, Trash2, Eye, Flag, UserCircle, Video } from "lucide-react";
import { useAuth } from "./hooks/useAuth";
import { setCurrentUser } from "./hooks/profileCache";
import { usePosts, usePostDetail } from "./hooks/usePosts";
import * as postsApi from "./lib/api/posts";

const THEMES = {
  light: {
    bg: "#EFF3EF", card: "#FBFAF6", ink: "#1F2A24", inkSoft: "#5B6660", border: "#D9DED6",
    coral: "#D8552F", coralSoft: "#F6DED4", teal: "#2E5A50", tealSoft: "#DCE9E3", gold: "#B8862A",
  },
  dark: {
    bg: "#151916", card: "#1F2521", ink: "#EDF1EC", inkSoft: "#8FA097", border: "#323B36",
    coral: "#E8734C", coralSoft: "#3A2820", teal: "#5FA290", tealSoft: "#1E332E", gold: "#D4A73E",
  },
};

// PALETTE values point at CSS custom properties (set by THEMES via the .murmur-root style block
// in the root render) so every component below can keep using PALETTE.xxx directly and still
// respond live to the theme switch, without threading a theme prop through every component.
const PALETTE = {
  bg: "var(--m-bg)",
  card: "var(--m-card)",
  ink: "var(--m-ink)",
  inkSoft: "var(--m-inkSoft)",
  border: "var(--m-border)",
  coral: "var(--m-coral)",
  coralSoft: "var(--m-coralSoft)",
  teal: "var(--m-teal)",
  tealSoft: "var(--m-tealSoft)",
  gold: "var(--m-gold)",
};

const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

const MAX_POST_LENGTH = 280;

const NAMES = {
  odalysm: { name: "Odalys Marsh", handle: "@odalysm", initials: "OM", bio: "Watches birds, breaks builds occasionally. Reservoir regular.", joined: "March 2019", location: "Portland, OR", website: "odalysmarsh.com", followers: 1893, following: 312, verified: true },
  theoprine: { name: "Theo Prine", handle: "@theoprine", initials: "TP", bio: "Backend engineer. Ships at 2am, regrets at 9am.", joined: "July 2021", location: "Chicago, IL", website: "", followers: 540, following: 128, verified: false },
  kestrel: { name: "Kestrel Ade", handle: "@kestrel", initials: "KA", bio: "Office stapler custodian. Opinions are my own, mostly correct.", joined: "January 2018", location: "Austin, TX", website: "kestrelade.dev", followers: 2210, following: 89, verified: true },
  rubensato: { name: "Ruben Sato", handle: "@rubensato", initials: "RS", bio: "Home cook, slow mornings, faster dashi.", joined: "November 2020", location: "Seattle, WA", website: "", followers: 764, following: 201, verified: false },
  inesok: { name: "Ines Okafor", handle: "@inesok", initials: "IO", bio: "Librarian. Finals week survivor, every single time.", joined: "May 2022", location: "Minneapolis, MN", website: "", followers: 431, following: 175, verified: false },
  you: { name: "You", handle: "@you", initials: "YU", bio: "New here. Figuring out what to murmur about.", joined: "This week", location: "", website: "", followers: 4, following: 0, photo: null, verified: false },
};

const ProfilesContext = createContext({ profiles: NAMES, updateProfile: () => {}, isMobile: false });

let uid = 1000;
const nextId = () => ++uid;

const reply = (author, time, text, replies = [], image = null) => ({ id: nextId(), author, time, text, replies, likes: 0, reposts: 0, liked: false, reposted: false, image });

const SEED_POSTS = [
  {
    id: 1,
    author: "odalysm",
    time: "2h",
    text: "Watched about four hundred starlings fold themselves into a single moving shape over the reservoir tonight. No leader. No plan. Just each bird watching its seven nearest neighbors.",
    likes: 128,
    reposts: 19,
    replies: [
      reply("kestrel", "1h", "This is the most beautiful sentence I've read about geese, I mean starlings, all week.", [
        reply("odalysm", "50m", "It's genuinely the best part of my commute home."),
      ]),
      reply("inesok", "45m", "Now I want to go stand near a reservoir at dusk."),
    ],
  },
  {
    id: 2,
    author: "theoprine",
    time: "3h",
    text: "Shipped the migration at 2am, broke the build at 2:04am, fixed it at 2:11am. This is not a good pattern but it is a consistent one.",
    likes: 54,
    reposts: 4,
    replies: [
      reply("rubensato", "2h", "The 4-minute recovery window is honestly a personal best for you.", [
        reply("theoprine", "1h", "Historically it's closer to 20 minutes so yes, growth."),
      ]),
    ],
  },
  {
    id: 3,
    author: "kestrel",
    time: "5h",
    text: "Unpopular opinion: the good stapler at the office is a shared resource and should be treated with the reverence of a commons, not a spoils system.",
    likes: 302,
    reposts: 41,
    replies: [
      reply("odalysm", "4h", "Someone took it into the supply closet again and I will find them."),
      reply("theoprine", "3h", "Tragedy of the stapler commons."),
      reply("you", "2h", "I keep a spare in my bag now out of pure self defense."),
    ],
  },
  {
    id: 4,
    author: "rubensato",
    time: "7h",
    text: "Made a pot of dashi from scratch for the first time. Ninety seconds of kombu, a fistful of bonito, and suddenly Tuesday feels like an accomplishment.",
    likes: 76,
    reposts: 6,
    replies: [reply("inesok", "6h", "Recipe or it didn't happen.")],
  },
  {
    id: 5,
    author: "inesok",
    time: "9h",
    text: "The library extended its hours for finals week and I have never seen a building more full of quiet, collective panic. Beautiful, honestly.",
    likes: 41,
    reposts: 3,
    replies: [],
  },
  {
    id: 6,
    author: "theoprine",
    time: "4h",
    text: "Genuine question for the group chat, and I will be judging you based on the answer:",
    likes: 18,
    reposts: 2,
    replies: [],
    poll: {
      options: [
        { id: 1, text: "Tabs", votes: 34 },
        { id: 2, text: "Spaces", votes: 61 },
      ],
      duration: "1 day left",
      votedOption: null,
    },
  },
];

/**
 * Derive live trending hashtags from whatever posts are currently loaded.
 * Counts #tag occurrences across post text, ranks by count. This only sees
 * posts already in the loaded feed window (same caveat as the other
 * feed-derived views noted in the README) rather than a true site-wide
 * count, but it's real data, not the old hardcoded fake trends.
 */
function computeTrends(posts, limit = 5) {
  const counts = new Map();
  for (const p of posts) {
    const tags = p.text?.match(/#[a-z0-9_]+/gi) ?? [];
    const seenInThisPost = new Set();
    for (const raw of tags) {
      const tag = raw.toLowerCase();
      if (seenInThisPost.has(tag)) continue; // count each post once per tag
      seenInThisPost.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({
      tag,
      posts: `${count} ${count === 1 ? "murmur" : "murmurs"}`,
      query: tag.slice(1),
    }));
}

const SEED_NOTIFICATIONS = [
  { id: nextId(), type: "like", actor: "kestrel", postId: 3, text: "liked your reply", time: "2h", read: true },
  { id: nextId(), type: "follow", actor: "theoprine", postId: null, text: null, time: "1d", read: true },
  { id: nextId(), type: "reply", actor: "rubensato", postId: 3, text: "\u201cGood policy honestly, I lost mine to the supply closet too.\u201d", time: "2d", read: true },
];

const SEED_CONVERSATIONS = {
  odalysm: {
    unread: 1,
    messages: [
      { id: nextId(), sender: "odalysm", text: "hey, did you end up going back to the reservoir this week?", time: "2d" },
      { id: nextId(), sender: "you", text: "not yet, this weekend hopefully", time: "2d" },
      { id: nextId(), sender: "odalysm", text: "let me know, I'll bring the good binoculars", time: "1d" },
    ],
  },
  kestrel: {
    unread: 0,
    messages: [
      { id: nextId(), sender: "you", text: "ok so who actually took the stapler", time: "3d" },
      { id: nextId(), sender: "kestrel", text: "under investigation. trust no one", time: "3d" },
    ],
  },
};

const DM_REPLIES = [
  "ha, fair point",
  "wait really?",
  "same honestly",
  "okay noted",
  "that tracks",
  "I was just thinking about that",
  "no notes, love this for you",
  "hah okay deal",
  "sending you good vibes for that",
  "we should talk about this in person",
];

const EXTRA_TEXTS = [
  "Rearranged my desk for the third time this month. This is not procrastination, this is optimization research.",
  "The bakery on the corner started selling day-old bread at a discount and honestly it's better than the fresh stuff, don't tell them.",
  "Spent an hour debugging only to find a typo in an environment variable. The bug was inside the house the whole time.",
  "Someone in the group chat sent a voice memo and no one has listened to it in four days. A silent standoff.",
  "Learned that the office plant in the corner is fake and has been for two years. Nobody watering it, still thriving. Take notes.",
  "Finally beat my sourdough starter into submission. Six months of feeding a jar of goo for one good loaf, worth it.",
  "The bus was seven minutes early today which is somehow more disruptive to my morning than it being late.",
  "Rewatched an old favorite film and caught a detail in the background I'd missed three previous times. Movies keep giving.",
  "Tried to explain my job to a relative at dinner and ended up describing something closer to wizardry than software.",
  "New neighbor has a very opinionated cat that sits on the windowsill and judges everyone who walks by. Respect.",
  "Whiteboard meeting devolved into an argument about whether a hot dog is a sandwich. We did not finish the roadmap.",
  "Found a twenty in an old coat pocket. Best kind of found money, no memory of losing it in the first place.",
  "Took the long way home just to walk past the park while the light was doing that gold late-afternoon thing.",
  "Coworker brought homemade pastries again and now the whole floor operates on a strict system of gratitude and bribery.",
  "Tried a new recipe that called for 'a pinch' of five different spices. My pinches are apparently enormous.",
  "The printer jammed exactly once today, which for this printer counts as a good day.",
  "Overheard someone in the coffee shop pitching a business idea that was, charitably, just a worse vending machine.",
  "Reorganized my bookshelf by color instead of subject and now I can't find anything but it looks incredible.",
  "Every group project has one person who makes the shared doc and one person who renames the file 'final_v2_ACTUAL'.",
  "Watched the weather turn from clear to storming in about four minutes flat while walking the dog. He was thrilled, I was not.",
];

const GEN_AUTHORS = Object.keys(NAMES).filter((h) => h !== "you");
const PAGE_SIZE = 5;
const MAX_PAGES = 4;

function generatePost(seedIndex) {
  const author = GEN_AUTHORS[seedIndex % GEN_AUTHORS.length];
  const text = EXTRA_TEXTS[seedIndex % EXTRA_TEXTS.length];
  const dayNum = Math.floor(seedIndex / GEN_AUTHORS.length) + 1;
  const pseudo = (n, mod, min) => ((seedIndex * n + 7) % mod) + min;
  const likes = pseudo(13, 90, 2);
  const reposts = pseudo(5, 20, 0);
  return {
    id: nextId(),
    author,
    time: `${dayNum}d`,
    text,
    likes,
    reposts,
    replies: [],
    liked: false,
    reposted: false,
    views: likes * 9 + reposts * 4 + pseudo(7, 60, 20),
  };
}

function countReplies(nodes) {
  return nodes.reduce((sum, n) => sum + 1 + countReplies(n.replies), 0);
}

function insertReply(nodes, targetId, newNode) {
  return nodes.map((n) => {
    if (n.id === targetId) return { ...n, replies: [...n.replies, newNode] };
    return { ...n, replies: insertReply(n.replies, targetId, newNode) };
  });
}

function updateNode(nodes, targetId, updater) {
  return nodes.map((n) => {
    if (n.id === targetId) return updater(n);
    return { ...n, replies: updateNode(n.replies, targetId, updater) };
  });
}

function removeNode(nodes, targetId) {
  return nodes.filter((n) => n.id !== targetId).map((n) => ({ ...n, replies: removeNode(n.replies, targetId) }));
}

function findNode(nodes, targetId) {
  for (const n of nodes) {
    if (n.id === targetId) return n;
    const found = findNode(n.replies, targetId);
    if (found) return found;
  }
  return null;
}

function filterBlockedReplies(nodes, blocked) {
  return nodes.filter((n) => !blocked.has(n.author)).map((n) => ({ ...n, replies: filterBlockedReplies(n.replies, blocked) }));
}

const menuItemStyle = {
  display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", background: "none", border: "none",
  padding: "10px 14px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink, cursor: "pointer",
};

function readFileAsDataUrl(file, cb) {
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
}

function isVideoUrl(url) {
  if (typeof url !== "string") return false;
  // data: URIs (local preview before upload) carry their type in the prefix;
  // real uploaded files (Supabase Storage URLs) are detected by extension.
  return url.startsWith("data:video") || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function MediaContent({ src, alt, style }) {
  if (isVideoUrl(src)) {
    return <video src={src} controls playsInline style={style} />;
  }
  return <img src={src} alt={alt} style={style} />;
}

function PhotoPicker({ image, setImage, size = "normal", onFile }) {
  const inputRef = useRef(null);
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            readFileAsDataUrl(file, setImage);
            onFile?.(file);
          }
          e.target.value = "";
        }}
      />
      {image ? (
        <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
          <MediaContent
            src={image}
            alt="Attached preview"
            style={{
              maxHeight: size === "small" ? 120 : 200, maxWidth: "100%", borderRadius: 12, border: `1px solid ${PALETTE.border}`, display: "block",
            }}
          />
          <button
            onClick={() => { setImage(null); onFile?.(null); }}
            aria-label="Remove attachment"
            style={{
              position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: "50%", border: "none",
              background: "rgba(31,42,36,0.72)", color: "#FBFAF6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current && inputRef.current.click()}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer",
            padding: 0, marginTop: 6, color: PALETTE.teal, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13,
          }}
        >
          <ImagePlus size={16} /> Add photo, GIF, or video
        </button>
      )}
    </div>
  );
}

function PollComposer({ poll, setPoll, onRemove }) {
  const setOptions = (updater) => setPoll((p) => ({ ...p, options: typeof updater === "function" ? updater(p.options) : updater }));
  return (
    <div style={{ border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 12, marginTop: 8 }}>
      {poll.options.map((opt, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            value={opt}
            onChange={(e) => { const val = e.target.value; setOptions((prev) => prev.map((o, idx) => (idx === i ? val : o))); }}
            placeholder={`Option ${i + 1}`}
            maxLength={40}
            style={{
              flex: 1, border: `1px solid ${PALETTE.border}`, borderRadius: 8, outline: "none", background: PALETTE.bg,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink, padding: "7px 10px", boxSizing: "border-box",
            }}
          />
          {poll.options.length > 2 && (
            <button
              onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
              aria-label="Remove option"
              style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft, display: "flex", flexShrink: 0 }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      ))}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        {poll.options.length < 4 ? (
          <button
            onClick={() => setOptions((prev) => [...prev, ""])}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: PALETTE.teal, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: 0 }}
          >
            <Plus size={14} /> Add option
          </button>
        ) : <span />}
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, padding: 0 }}>
          Remove poll
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
        {["1 day", "3 days", "7 days"].map((d) => (
          <button
            key={d}
            onClick={() => setPoll((p) => ({ ...p, duration: d }))}
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, cursor: "pointer", borderRadius: 999, padding: "5px 12px",
              border: `1px solid ${poll.duration === d ? PALETTE.teal : PALETTE.border}`,
              background: poll.duration === d ? PALETTE.tealSoft : "transparent",
              color: poll.duration === d ? PALETTE.teal : PALETTE.inkSoft,
            }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

function FlockMark({ size = 28 }) {
  const dots = [
    [4, 6], [10, 3], [16, 7], [22, 4],
    [7, 13], [14, 11], [20, 15],
    [11, 20], [18, 22],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" style={{ display: "block" }}>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.1 : 1.5} fill={PALETTE.coral} opacity={0.55 + (i % 3) * 0.15} />
      ))}
    </svg>
  );
}

function Avatar({ user, size = 42, onClick }) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${user.name}'s profile` : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } } : undefined}
      style={{
        width: size, height: size, borderRadius: "50%", background: PALETTE.tealSoft, color: PALETTE.teal,
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif",
        fontWeight: 600, fontSize: size * 0.34, flexShrink: 0, cursor: onClick ? "pointer" : "default", overflow: "hidden",
      }}
    >
      {user.photo ? <img src={user.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : user.initials}
    </div>
  );
}

function VerifiedBadge({ size = 14 }) {
  return <BadgeCheck size={size} color={PALETTE.teal} strokeWidth={2} style={{ flexShrink: 0, verticalAlign: -2 }} aria-label="Verified" />;
}

function ActionRow({ likes, reposts, replyCount, liked, reposted, onLike, onRepost, onQuote, onReplyClick, onBookmark, bookmarked, views }) {
  const [repostMenuOpen, setRepostMenuOpen] = useState(false);
  return (
    <div style={{ display: "flex", gap: 26, alignItems: "center" }}>
      {typeof views === "number" && (
        <span style={{ display: "flex", alignItems: "center", gap: 6, color: PALETTE.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>
          <Eye size={15} strokeWidth={1.8} /> {views >= 1000 ? `${(views / 1000).toFixed(1)}K` : views}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onLike(); }}
        aria-label={liked ? `Unlike. ${likes} likes` : `Like. ${likes} likes`}
        aria-pressed={liked}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer",
          padding: 0, color: liked ? PALETTE.coral : PALETTE.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5,
        }}
      >
        <Heart size={16} fill={liked ? PALETTE.coral : "none"} strokeWidth={1.8} /> {likes}
      </button>
      <div
        style={{ position: "relative" }}
        onKeyDown={(e) => { if (e.key === "Escape" && repostMenuOpen) { e.stopPropagation(); setRepostMenuOpen(false); } }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); if (onQuote) setRepostMenuOpen((o) => !o); else onRepost(); }}
          aria-label={onQuote ? "Repost options" : reposted ? `Undo repost. ${reposts} reposts` : `Repost. ${reposts} reposts`}
          aria-haspopup={onQuote ? "menu" : undefined}
          aria-expanded={onQuote ? repostMenuOpen : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer",
            padding: 0, color: reposted ? PALETTE.teal : PALETTE.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5,
          }}
        >
          <Repeat2 size={16} strokeWidth={1.8} /> {reposts}
        </button>
        {repostMenuOpen && (
          <>
            <div onClick={(e) => { e.stopPropagation(); setRepostMenuOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 5 }} />
            <div
              style={{
                position: "absolute", bottom: "100%", left: 0, marginBottom: 6, background: PALETTE.card, border: `1px solid ${PALETTE.border}`,
                borderRadius: 10, overflow: "hidden", zIndex: 6, minWidth: 150, boxShadow: "0 6px 18px rgba(31,42,36,0.14)",
              }}
            >
              <button onClick={(e) => { e.stopPropagation(); setRepostMenuOpen(false); onRepost(); }} style={menuItemStyle}>
                <Repeat2 size={14} /> {reposted ? "Undo repost" : "Repost"}
              </button>
              <button onClick={(e) => { e.stopPropagation(); setRepostMenuOpen(false); onQuote(); }} style={menuItemStyle}>
                <Feather size={14} /> Quote
              </button>
            </div>
          </>
        )}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onReplyClick && onReplyClick(); }}
        aria-label={`${replyCount} replies`}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          cursor: onReplyClick ? "pointer" : "default", padding: 0, color: PALETTE.inkSoft,
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5,
        }}
      >
        <MessageCircle size={16} strokeWidth={1.8} /> {replyCount}
      </button>
      {onBookmark && (
        <button
          onClick={(e) => { e.stopPropagation(); onBookmark(); }}
          aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
          aria-pressed={bookmarked}
          style={{ display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, color: bookmarked ? PALETTE.gold : PALETTE.inkSoft, marginLeft: "auto" }}
        >
          <Bookmark size={16} fill={bookmarked ? PALETTE.gold : "none"} strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

function PostText({ text, onOpenProfile, onSearch }) {
  const { profiles } = useContext(ProfilesContext);
  const parts = text.split(/(@[A-Za-z0-9_]+|#[A-Za-z0-9_]+)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^@[A-Za-z0-9_]+$/.test(part)) {
          const key = Object.keys(profiles).find((k) => profiles[k].handle.toLowerCase() === part.toLowerCase());
          if (key) {
            return (
              <span
                key={i}
                onClick={(e) => { e.stopPropagation(); onOpenProfile(key); }}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpenProfile(key); } }}
                style={{ color: PALETTE.teal, cursor: "pointer", fontWeight: 500 }}
              >
                {part}
              </span>
            );
          }
        }
        if (/^#[A-Za-z0-9_]+$/.test(part) && onSearch) {
          return (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); onSearch(part.slice(1).toLowerCase()); }}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onSearch(part.slice(1).toLowerCase()); } }}
              style={{ color: PALETTE.teal, cursor: "pointer", fontWeight: 500 }}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

function MentionTextarea({ value, onChange, placeholder, rows, style, autoFocus }) {
  const { profiles } = useContext(ProfilesContext);
  const textareaRef = useRef(null);
  const [query, setQuery] = useState(null);
  const [highlight, setHighlight] = useState(0);

  const matches =
    query !== null
      ? Object.entries(profiles)
          .filter(
            ([, u]) =>
              u.handle.slice(1).toLowerCase().startsWith(query.toLowerCase()) ||
              u.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 5)
      : [];

  const detectQuery = (text, cursor) => {
    const upToCursor = text.slice(0, cursor);
    const match = upToCursor.match(/(?:^|\s)@([A-Za-z0-9_]*)$/);
    return match ? match[1] : null;
  };

  const handleChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);
    setQuery(detectQuery(newVal, e.target.selectionStart));
    setHighlight(0);
  };

  const insertMention = (handle) => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const upToCursor = value.slice(0, cursor);
    const afterCursor = value.slice(cursor);
    const replaced = upToCursor.replace(/@([A-Za-z0-9_]*)$/, `${handle} `);
    const newValue = replaced + afterCursor;
    onChange(newValue);
    setQuery(null);
    requestAnimationFrame(() => {
      if (el) {
        const pos = replaced.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (query !== null && matches.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % matches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + matches.length) % matches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(matches[highlight][1].handle); return; }
      if (e.key === "Escape") { setQuery(null); }
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        placeholder={placeholder}
        rows={rows}
        style={style}
      />
      {query !== null && matches.length > 0 && (
        <div
          style={{
            position: "absolute", top: "100%", left: 0, marginTop: 4, background: PALETTE.card, border: `1px solid ${PALETTE.border}`,
            borderRadius: 10, overflow: "hidden", zIndex: 10, minWidth: 220, boxShadow: "0 6px 18px rgba(31,42,36,0.14)",
          }}
        >
          {matches.map(([key, u], i) => (
            <div
              key={key}
              onMouseDown={(e) => { e.preventDefault(); insertMention(u.handle); }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer",
                background: i === highlight ? PALETTE.tealSoft : "transparent",
              }}
            >
              <Avatar user={u} size={26} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 13, color: PALETTE.ink }}>{u.name}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft }}>{u.handle}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PollDisplay({ poll, isOwnPost, onVote }) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
  const voted = poll.votedOption !== null;
  const showResults = voted || isOwnPost;

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
      {poll.options.map((opt) => {
        const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
        const isChosen = poll.votedOption === opt.id;
        if (showResults) {
          return (
            <div
              key={opt.id}
              style={{
                position: "relative", borderRadius: 8, padding: "8px 12px", marginBottom: 6, overflow: "hidden",
                border: `1px solid ${isChosen ? PALETTE.teal : PALETTE.border}`,
              }}
            >
              <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: PALETTE.tealSoft, transition: "width 0.3s" }} />
              <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink }}>
                  {isChosen && <Check size={13} color={PALETTE.teal} />} {opt.text}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: PALETTE.inkSoft, flexShrink: 0 }}>{pct}%</span>
              </div>
            </div>
          );
        }
        return (
          <button
            key={opt.id}
            onClick={() => onVote(opt.id)}
            style={{
              display: "block", width: "100%", textAlign: "left", border: `1px solid ${PALETTE.border}`, borderRadius: 8,
              padding: "8px 12px", marginBottom: 6, background: "transparent", cursor: "pointer",
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink,
            }}
          >
            {opt.text}
          </button>
        );
      })}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 4 }}>
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"} · {poll.duration}
      </div>
    </div>
  );
}

function QuotedPostPreview({ quoted, onOpenPost, onOpenProfile, onSearch }) {
  const { profiles } = useContext(ProfilesContext);
  const author = profiles[quoted.author];
  if (!author) return null;
  const truncated = quoted.text.length > 200 ? `${quoted.text.slice(0, 200)}\u2026` : quoted.text;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onOpenPost(quoted.id); }}
      role="link"
      tabIndex={0}
      aria-label="Open quoted murmur"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpenPost(quoted.id); } }}
      style={{ border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 12, marginBottom: 12, cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
        <Avatar user={author} size={20} />
        <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 13, color: PALETTE.ink }}>{author.name}</span>
        {author.verified && <VerifiedBadge size={12} />}
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft }}>{author.handle} · {quoted.time}</span>
      </div>
      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink, lineHeight: 1.45, overflowWrap: "break-word", wordBreak: "break-word" }}>
        {onOpenProfile ? <PostText text={truncated} onOpenProfile={onOpenProfile} onSearch={onSearch} /> : truncated}
      </div>
      {quoted.image && (
        <MediaContent src={quoted.image} alt="Quoted attachment" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, marginTop: 8, display: "block" }} />
      )}
    </div>
  );
}

function InlineComposer({ text, setText, image, setImage, imageFile, setImageFile, onSubmit, onCancel, placeholder }) {
  const { profiles } = useContext(ProfilesContext);
  const overLimit = text.length > MAX_POST_LENGTH;
  const canSubmit = (text.trim() || image) && !overLimit;
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0 4px" }}>
      <Avatar user={profiles.you} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <MentionTextarea
          autoFocus
          value={text}
          onChange={setText}
          placeholder={placeholder}
          rows={2}
          style={{
            width: "100%", resize: "none", border: `1px solid ${overLimit ? PALETTE.coral : PALETTE.border}`, borderRadius: 10, outline: "none",
            background: PALETTE.bg, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink,
            lineHeight: 1.4, padding: "8px 10px", boxSizing: "border-box", overflowWrap: "break-word", wordBreak: "break-word",
          }}
        />
        <PhotoPicker image={image} setImage={setImage} onFile={setImageFile} size="small" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end", marginTop: 6 }}>
          <CharCounter length={text.length} max={MAX_POST_LENGTH} />
          <button
            onClick={onCancel}
            style={{
              background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "6px 10px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (canSubmit) onSubmit(text.trim(), image, imageFile); }}
            disabled={!canSubmit}
            style={{
              background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 999,
              padding: "7px 16px", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13,
              cursor: canSubmit ? "pointer" : "not-allowed", opacity: canSubmit ? 1 : 0.5,
            }}
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}

function ReplyThread({ node, depth, onLike, onRepost, onOpenProfile, onAddReply, onEditReply, onDeleteReply, onSearch }) {
  const { profiles, isMobile } = useContext(ProfilesContext);
  const [composing, setComposing] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyDraftImage, setReplyDraftImage] = useState(null);
  const [replyDraftImageFile, setReplyDraftImageFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.text);
  const author = profiles[node.author];
  const maxIndent = isMobile ? 3 : 4;
  const indent = Math.min(depth, maxIndent) * (isMobile ? 14 : 26);

  return (
    <div style={{ marginLeft: indent }}>
      <div style={{ display: "flex", gap: isMobile ? 8 : 10, padding: isMobile ? "14px 12px 4px" : "14px 20px 4px" }}>
        {depth > 0 && <CornerDownRight size={14} color={PALETTE.border} style={{ marginTop: 10, flexShrink: 0 }} />}
        <Avatar user={author} size={depth > 0 ? 32 : 36} onClick={() => onOpenProfile(node.author)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div
              className="murmur-author"
              onClick={() => onOpenProfile(node.author)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile(node.author); } }}
              style={{ display: "inline-flex", gap: 6, alignItems: "baseline", flexWrap: "wrap", cursor: "pointer", padding: "2px 0" }}
            >
              <span className="murmur-author-name" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14, color: PALETTE.ink }}>
                {author.name}
              </span>
              {author.verified && <VerifiedBadge size={13} />}
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft }}>
                {author.handle} · {node.time}{node.edited ? " · edited" : ""}
              </span>
            </div>
            {node.author === "you" && !isEditing && (
              <PostMenu onEdit={() => { setEditText(node.text); setIsEditing(true); }} onDelete={() => onDeleteReply(node.id)} />
            )}
          </div>
          {isEditing ? (
            <div style={{ padding: "6px 0 10px" }}>
              <MentionTextarea
                autoFocus
                rows={2}
                value={editText}
                onChange={setEditText}
                style={{
                  width: "100%", resize: "none", border: `1px solid ${editText.length > MAX_POST_LENGTH ? PALETTE.coral : PALETTE.border}`, borderRadius: 10, outline: "none",
                  background: PALETTE.bg, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink,
                  lineHeight: 1.4, padding: "8px 10px", boxSizing: "border-box", overflowWrap: "break-word", wordBreak: "break-word",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end", marginTop: 6 }}>
                <CharCounter length={editText.length} max={MAX_POST_LENGTH} />
                <button onClick={() => setIsEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "6px 10px" }}>
                  Cancel
                </button>
                <button
                  onClick={() => { if (editText.trim() && editText.length <= MAX_POST_LENGTH) { onEditReply(node.id, editText.trim()); setIsEditing(false); } }}
                  disabled={!editText.trim() || editText.length > MAX_POST_LENGTH}
                  style={{
                    background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 999, padding: "7px 16px",
                    fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13,
                    cursor: (!editText.trim() || editText.length > MAX_POST_LENGTH) ? "not-allowed" : "pointer",
                    opacity: (!editText.trim() || editText.length > MAX_POST_LENGTH) ? 0.5 : 1,
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p style={{ margin: "4px 0 8px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14.5, color: PALETTE.ink, lineHeight: 1.5, overflowWrap: "break-word", wordBreak: "break-word" }}>
              <PostText text={node.text} onOpenProfile={onOpenProfile} onSearch={onSearch} />
            </p>
          )}
          {node.image && (
            <MediaContent
              src={node.image}
              alt="Reply attachment"
              style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 12, border: `1px solid ${PALETTE.border}`, display: "block", marginBottom: 10 }}
            />
          )}
          <ActionRow
            likes={node.likes} reposts={node.reposts} liked={node.liked} reposted={node.reposted}
            replyCount={countReplies(node.replies)}
            onLike={() => onLike(node.id)} onRepost={() => onRepost(node.id)}
            onReplyClick={() => setComposing((c) => !c)}
          />
          {!composing && (replyDraft.trim() || replyDraftImage) && (
            <div
              onClick={() => setComposing(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setComposing(true); } }}
              style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, cursor: "pointer", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}
            >
              <Feather size={11} /> Unsent reply saved
            </div>
          )}
          {composing && (
            <InlineComposer
              placeholder={`Reply to ${author.name}`}
              text={replyDraft}
              setText={setReplyDraft}
              image={replyDraftImage}
              setImage={setReplyDraftImage}
              imageFile={replyDraftImageFile}
              setImageFile={setReplyDraftImageFile}
              onCancel={() => { setComposing(false); setReplyDraft(""); setReplyDraftImage(null); setReplyDraftImageFile(null); }}
              onSubmit={(text, image, imageFile) => { onAddReply(node.id, text, image, imageFile); setComposing(false); setReplyDraft(""); setReplyDraftImage(null); setReplyDraftImageFile(null); }}
            />
          )}
        </div>
      </div>
      {node.replies.map((child) => (
        <ReplyThread key={child.id} node={child} depth={depth + 1} onLike={onLike} onRepost={onRepost} onOpenProfile={onOpenProfile} onAddReply={onAddReply} onEditReply={onEditReply} onDeleteReply={onDeleteReply} onSearch={onSearch} />
      ))}
    </div>
  );
}

function useReadyDelay(key, delay = 300) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ready;
}

function SkeletonBar({ width = "100%", height = 12, style }) {
  return (
    <div style={{ width, height, borderRadius: 6, background: PALETTE.border, animation: "murmur-pulse 1.4s ease-in-out infinite", ...style }} />
  );
}

function SkeletonPost({ large }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: large ? "20px 14px" : "18px 20px", borderBottom: `1px solid ${PALETTE.border}` }}>
      <div style={{ width: large ? 52 : 42, height: large ? 52 : 42, borderRadius: "50%", background: PALETTE.border, animation: "murmur-pulse 1.4s ease-in-out infinite", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, paddingTop: 2 }}>
        <SkeletonBar width="35%" height={13} />
        <SkeletonBar width="92%" />
        <SkeletonBar width="60%" />
      </div>
    </div>
  );
}

function Post({ post, onLike, onRepost, onOpen, onOpenProfile, large, onReplyClick, onQuote, onEdit, onDelete, onBookmark, bookmarked, onSearch, onVote, isPinned, onTogglePin, showPinnedLabel, onViewAnalytics, onReport, isReported, selected }) {
  const { profiles, isMobile } = useContext(ProfilesContext);
  const author = profiles[post.author];
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  return (
    <div
      onClick={() => onOpen && onOpen(post.id)}
      role={onOpen ? "link" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={onOpen ? "Open murmur" : undefined}
      onKeyDown={onOpen ? (e) => { if ((e.key === "Enter") && e.target === e.currentTarget) { onOpen(post.id); } } : undefined}
      style={{
        display: "flex", gap: isMobile ? 9 : 12, padding: large ? "20px 14px" : isMobile ? "16px 12px" : "18px 20px",
        borderBottom: `1px solid ${PALETTE.border}`, cursor: onOpen ? "pointer" : "default",
        background: selected ? PALETTE.tealSoft : "transparent", boxShadow: selected ? `inset 3px 0 0 ${PALETTE.teal}` : "none",
      }}
    >
      <Avatar user={author} size={large ? 52 : isMobile ? 38 : 42} onClick={(e) => { e.stopPropagation(); onOpenProfile(post.author); }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {showPinnedLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, color: PALETTE.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>
            <Pin size={12} /> Pinned
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div
            className="murmur-author"
            onClick={(e) => { e.stopPropagation(); onOpenProfile(post.author); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpenProfile(post.author); } }}
            style={{ display: "inline-flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", cursor: "pointer", padding: "2px 0" }}
          >
            <span className="murmur-author-name" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: large ? 17 : 15, color: PALETTE.ink }}>
              {author.name}
            </span>
            {author.verified && <VerifiedBadge size={large ? 16 : 14} />}
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, color: PALETTE.inkSoft }}>
              {author.handle} · {post.time}{post.edited ? " · edited" : ""}
            </span>
          </div>
          {post.author === "you" && onEdit && !isEditing && (
            <PostMenu
              onEdit={() => { setEditText(post.text); setIsEditing(true); }}
              onDelete={() => onDelete(post.id)}
              isPinned={isPinned}
              onTogglePin={onTogglePin ? () => onTogglePin(post.id) : null}
              onViewAnalytics={onViewAnalytics ? () => onViewAnalytics(post.id) : null}
            />
          )}
          {post.author !== "you" && onReport && (
            <PostMenu onReport={(reason) => onReport(post.id, reason)} isReported={isReported} />
          )}
        </div>
        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()} style={{ padding: "6px 0 10px" }}>
            <MentionTextarea
              autoFocus
              rows={3}
              value={editText}
              onChange={setEditText}
              style={{
                width: "100%", resize: "none", border: `1px solid ${editText.length > MAX_POST_LENGTH ? PALETTE.coral : PALETTE.border}`, borderRadius: 10, outline: "none",
                background: PALETTE.bg, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink,
                lineHeight: 1.5, padding: "8px 10px", boxSizing: "border-box", overflowWrap: "break-word", wordBreak: "break-word",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end", marginTop: 6 }}>
              <CharCounter length={editText.length} max={MAX_POST_LENGTH} />
              <button onClick={() => setIsEditing(false)} style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "6px 10px" }}>
                Cancel
              </button>
              <button
                onClick={() => { if (editText.trim() && editText.length <= MAX_POST_LENGTH) { onEdit(post.id, editText.trim()); setIsEditing(false); } }}
                disabled={!editText.trim() || editText.length > MAX_POST_LENGTH}
                style={{
                  background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 999, padding: "7px 16px",
                  fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13,
                  cursor: (!editText.trim() || editText.length > MAX_POST_LENGTH) ? "not-allowed" : "pointer",
                  opacity: (!editText.trim() || editText.length > MAX_POST_LENGTH) ? 0.5 : 1,
                }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <p style={{ margin: "6px 0 12px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: large ? 17 : 15, lineHeight: 1.55, color: PALETTE.ink, overflowWrap: "break-word", wordBreak: "break-word" }}>
            <PostText text={post.text} onOpenProfile={onOpenProfile} onSearch={onSearch} />
          </p>
        )}
        {post.image && (
          <MediaContent
            src={post.image}
            alt="Post attachment"
            style={{ width: "100%", maxHeight: large ? 460 : 340, objectFit: "cover", borderRadius: 12, border: `1px solid ${PALETTE.border}`, display: "block", marginBottom: 12 }}
          />
        )}
        {post.poll && <PollDisplay poll={post.poll} isOwnPost={post.author === "you"} onVote={(optionId) => onVote(post.id, optionId)} />}
        {post.quoted && <QuotedPostPreview quoted={post.quoted} onOpenPost={onOpen || (() => {})} onOpenProfile={onOpenProfile} onSearch={onSearch} />}
        <ActionRow
          likes={post.likes} reposts={post.reposts} liked={post.liked} reposted={post.reposted}
          replyCount={countReplies(post.replies)}
          onLike={() => onLike(post.id)} onRepost={() => onRepost(post.id)}
          onQuote={onQuote ? () => onQuote(post.id) : null}
          onReplyClick={large ? onReplyClick : (onOpen ? () => onOpen(post.id) : null)}
          onBookmark={onBookmark ? () => onBookmark(post.id) : null}
          bookmarked={bookmarked}
          views={post.views}
        />
      </div>
    </div>
  );
}

const REPORT_REASONS = ["Spam", "Harassment or abuse", "Misinformation", "Something else"];

function ReportPanel({ onReport, onBack }) {
  return (
    <>
      <div style={{ padding: "8px 14px 4px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: 0.4, color: PALETTE.inkSoft }}>
        WHY ARE YOU REPORTING THIS?
      </div>
      {REPORT_REASONS.map((reason) => (
        <button key={reason} onClick={(e) => { e.stopPropagation(); onReport(reason); }} style={menuItemStyle}>
          {reason}
        </button>
      ))}
      <button onClick={(e) => { e.stopPropagation(); onBack(); }} style={{ ...menuItemStyle, color: PALETTE.inkSoft, borderTop: `1px solid ${PALETTE.border}` }}>
        Cancel
      </button>
    </>
  );
}

function PostMenu({ onEdit, onDelete, isPinned, onTogglePin, onViewAnalytics, onReport, isReported }) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  return (
    <div
      style={{ position: "relative", alignSelf: "flex-start", flexShrink: 0 }}
      onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); setReporting(false); } }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); setReporting(false); }}
        aria-label="More options"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%",
          border: "none", background: "transparent", color: PALETTE.inkSoft, cursor: "pointer",
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div onClick={(e) => { e.stopPropagation(); setOpen(false); }} style={{ position: "fixed", inset: 0, zIndex: 5 }} />
          <div
            style={{
              position: "absolute", top: "100%", right: 0, marginTop: 4, background: PALETTE.card, border: `1px solid ${PALETTE.border}`,
              borderRadius: 10, overflow: "hidden", zIndex: 6, minWidth: 190, boxShadow: "0 6px 18px rgba(31,42,36,0.14)",
            }}
          >
            {reporting ? (
              <ReportPanel onReport={(reason) => { onReport(reason); setOpen(false); setReporting(false); }} onBack={() => setReporting(false)} />
            ) : (
              <>
                {onTogglePin && (
                  <button onClick={(e) => { e.stopPropagation(); setOpen(false); onTogglePin(); }} style={menuItemStyle}>
                    {isPinned ? "Unpin from profile" : "Pin to profile"}
                  </button>
                )}
                {onViewAnalytics && (
                  <button onClick={(e) => { e.stopPropagation(); setOpen(false); onViewAnalytics(); }} style={menuItemStyle}>
                    View analytics
                  </button>
                )}
                {onEdit && (
                  <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }} style={menuItemStyle}>
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }} style={{ ...menuItemStyle, color: PALETTE.coral }}>
                    Delete
                  </button>
                )}
                {onReport && (
                  isReported ? (
                    <div style={{ ...menuItemStyle, color: PALETTE.inkSoft, cursor: "default" }}>Reported</div>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); setReporting(true); }} style={{ ...menuItemStyle, color: PALETTE.coral }}>
                      Report
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProfileMenu({ handle, isMuted, onToggleMute, onToggleBlock, onReport, isReported }) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  return (
    <div
      style={{ position: "relative" }}
      onKeyDown={(e) => { if (e.key === "Escape" && open) { e.stopPropagation(); setOpen(false); setReporting(false); } }}
    >
      <button
        onClick={() => { setOpen((o) => !o); setReporting(false); }}
        aria-label="More options"
        style={{
          width: 38, height: 38, borderRadius: "50%", border: `1px solid ${PALETTE.border}`, background: "transparent",
          color: PALETTE.inkSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 5 }} />
          <div
            style={{
              position: "absolute", top: "100%", right: 0, marginTop: 4, background: PALETTE.card, border: `1px solid ${PALETTE.border}`,
              borderRadius: 10, overflow: "hidden", zIndex: 6, minWidth: 190, boxShadow: "0 6px 18px rgba(31,42,36,0.14)",
            }}
          >
            {reporting ? (
              <ReportPanel onReport={(reason) => { onReport(reason); setOpen(false); setReporting(false); }} onBack={() => setReporting(false)} />
            ) : (
              <>
                <button onClick={() => { setOpen(false); onToggleMute(); }} style={menuItemStyle}>
                  {isMuted ? `Unmute ${handle}` : `Mute ${handle}`}
                </button>
                <button onClick={() => { setOpen(false); onToggleBlock(); }} style={{ ...menuItemStyle, color: PALETTE.coral }}>
                  Block {handle}
                </button>
                {isReported ? (
                  <div style={{ ...menuItemStyle, color: PALETTE.inkSoft, cursor: "default" }}>Account reported</div>
                ) : (
                  <button onClick={() => setReporting(true)} style={{ ...menuItemStyle, color: PALETTE.coral }}>
                    Report {handle}
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CharCounter({ length, max }) {
  const remaining = max - length;
  const over = remaining < 0;
  const near = !over && remaining <= 20;
  return (
    <span
      style={{
        fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: over ? 600 : 400,
        color: over ? PALETTE.coral : near ? PALETTE.gold : PALETTE.inkSoft, flexShrink: 0,
      }}
    >
      {remaining}
    </span>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      style={{
        width: 42, height: 24, borderRadius: 999, border: "none", padding: 2, cursor: "pointer", flexShrink: 0,
        background: checked ? PALETTE.teal : PALETTE.border, display: "flex", alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start", transition: "background 0.15s",
      }}
    >
      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#FBFAF6", boxShadow: "0 1px 3px rgba(31,42,36,0.3)" }} />
    </button>
  );
}

function FollowButton({ isFollowing, onToggle }) {
  const [hover, setHover] = useState(false);
  const label = isFollowing ? (hover ? "Unfollow" : "Following") : "Follow";
  const showDanger = isFollowing && hover;
  const filled = isFollowing && !hover;
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13.5, cursor: "pointer",
        borderRadius: 999, padding: "8px 18px", border: `1px solid ${showDanger ? PALETTE.coral : PALETTE.teal}`,
        background: filled ? PALETTE.teal : "transparent",
        color: filled ? "#FBFAF6" : showDanger ? PALETTE.coral : PALETTE.teal,
      }}
    >
      {label}
    </button>
  );
}

function BackBar({ onBack, label }) {
  return (
    <button
      onClick={onBack}
      style={{
        display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer",
        padding: "14px 4px", color: PALETTE.ink, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14.5, fontWeight: 500,
      }}
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}

function ProfilePage({ handle, posts, onLike, onRepost, onOpenPost, onOpenProfile, onBack, coverImage, setCoverImage, isFollowing, onToggleFollow, followingCount, onMessage, onQuote, onEdit, onDelete, onBookmark, bookmarks, isBlocked, isMuted, onToggleBlock, onToggleMute, onOpenSettings, onSearch, onVote, pinnedPostId, onTogglePin, onReport, reportedPosts, onReportProfile, reportedProfiles, onViewAnalytics }) {
  const { profiles, updateProfile, isMobile } = useContext(ProfilesContext);
  const user = profiles[handle];
  const authored = posts.filter((p) => p.author === handle);
  const pinnedPost = authored.find((p) => p.id === pinnedPostId);
  const restPosts = pinnedPost ? authored.filter((p) => p.id !== pinnedPostId) : authored;
  const editable = handle === "you";
  const coverInputRef = useRef(null);
  const ready = useReadyDelay(handle);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const watermarkDots = [
    [10, 14], [22, 8], [40, 20], [58, 10], [76, 22], [90, 12],
    [16, 40], [34, 46], [52, 38], [70, 44], [86, 40],
  ];

  const openEdit = () => {
    setForm({ name: user.name, handle: user.handle, bio: user.bio, location: user.location, website: user.website, photo: user.photo || null });
    setEditing(true);
  };
  const saveEdit = () => {
    updateProfile("you", {
      name: form.name.trim() || "You",
      handle: form.handle.trim().startsWith("@") ? form.handle.trim() : `@${form.handle.trim() || "you"}`,
      bio: form.bio.trim(),
      location: form.location.trim(),
      website: form.website.trim(),
      photo: form.photo,
    });
    setEditing(false);
  };

  const inputStyle = {
    width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10, outline: "none", background: PALETTE.bg,
    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink, padding: "8px 10px", boxSizing: "border-box",
    overflowWrap: "break-word", wordBreak: "break-word",
  };
  const fieldLabel = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 4, display: "block" };

  if (!editable && isBlocked) {
    return (
      <div>
        <BackBar onBack={onBack} label="Back to feed" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
          <Avatar user={user} size={56} />
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, color: PALETTE.ink, margin: "12px 0 4px" }}>
            You've blocked {user.name}
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.inkSoft, marginBottom: 18 }}>
            {user.handle} can't message you, and you won't see their murmurs.
          </div>
          <button
            onClick={onToggleBlock}
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13.5, cursor: "pointer",
              borderRadius: 999, padding: "9px 20px", border: `1px solid ${PALETTE.teal}`, background: "transparent", color: PALETTE.teal,
            }}
          >
            Unblock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackBar onBack={onBack} label="Back to feed" />

      <div style={{ position: "relative", marginBottom: isMobile ? 36 : 44 }}>
        <div style={{ height: isMobile ? 108 : 140, borderRadius: 14, overflow: "hidden", background: PALETTE.tealSoft, position: "relative" }}>
          {coverImage ? (
            <img src={coverImage} alt="Profile header" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          ) : (
            <svg width="100%" height="100%" viewBox="0 0 100 56" preserveAspectRatio="none" style={{ display: "block" }}>
              {watermarkDots.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.6 : 1.1} fill={PALETTE.teal} opacity={0.18} />
              ))}
            </svg>
          )}

          {editable && (
            <>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) readFileAsDataUrl(file, setCoverImage);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => coverInputRef.current && coverInputRef.current.click()}
                aria-label={coverImage ? "Change header photo" : "Add header photo"}
                style={{
                  position: "absolute", bottom: 10, right: 10, display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(31,42,36,0.6)", color: "#FBFAF6", border: "none", borderRadius: 999,
                  padding: "7px 12px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, cursor: "pointer",
                }}
              >
                <Camera size={14} /> {coverImage ? "Change photo" : "Add header photo"}
              </button>
              {coverImage && (
                <button
                  onClick={() => setCoverImage(null)}
                  aria-label="Remove header photo"
                  style={{
                    position: "absolute", top: 10, right: 10, width: 26, height: 26, borderRadius: "50%", border: "none",
                    background: "rgba(31,42,36,0.6)", color: "#FBFAF6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ position: "absolute", left: isMobile ? 14 : 22, bottom: isMobile ? -30 : -38, borderRadius: "50%", border: `4px solid ${PALETTE.bg}`, background: PALETTE.bg, lineHeight: 0 }}>
          <Avatar user={user} size={isMobile ? 62 : 76} />
        </div>
      </div>

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: "18px 22px 22px", marginBottom: 18 }}>
        {editing ? (
          <div>
            <label style={fieldLabel}>PHOTO</label>
            <div style={{ marginBottom: 14 }}>
              <PhotoPicker image={form.photo} setImage={(img) => setForm((f) => ({ ...f, photo: img }))} size="small" />
            </div>
            <label style={fieldLabel}>NAME</label>
            <input style={{ ...inputStyle, marginBottom: 12 }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <label style={fieldLabel}>HANDLE</label>
            <input style={{ ...inputStyle, marginBottom: 12 }} value={form.handle} onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))} />
            <label style={fieldLabel}>BIO</label>
            <textarea rows={3} style={{ ...inputStyle, resize: "none", marginBottom: 12 }} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            <label style={fieldLabel}>LOCATION</label>
            <input style={{ ...inputStyle, marginBottom: 12 }} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Optional" />
            <label style={fieldLabel}>WEBSITE</label>
            <input style={{ ...inputStyle, marginBottom: 16 }} value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="Optional" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditing(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, padding: "8px 12px" }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                style={{ background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 999, padding: "8px 18px", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13.5, cursor: "pointer" }}
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 21, color: PALETTE.ink }}>{user.name}</span>
                  {user.verified && <VerifiedBadge size={17} />}
                  {isMuted && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft, border: `1px solid ${PALETTE.border}`, borderRadius: 20, padding: "2px 8px" }}>
                      Muted
                    </span>
                  )}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: PALETTE.inkSoft, marginBottom: 16 }}>{user.handle}</div>
              </div>
              {editable ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={onOpenSettings}
                    aria-label="Settings"
                    style={{
                      width: 38, height: 38, borderRadius: "50%", border: `1px solid ${PALETTE.border}`, background: "transparent",
                      color: PALETTE.inkSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}
                  >
                    <Settings size={15} />
                  </button>
                  <button
                    onClick={openEdit}
                    style={{
                      fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13.5, cursor: "pointer",
                      borderRadius: 999, padding: "8px 18px", border: `1px solid ${PALETTE.teal}`, background: "transparent", color: PALETTE.teal,
                    }}
                  >
                    Edit profile
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={onMessage}
                    aria-label="Message"
                    style={{
                      width: 38, height: 38, borderRadius: "50%", border: `1px solid ${PALETTE.border}`, background: "transparent",
                      color: PALETTE.inkSoft, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                    }}
                  >
                    <Mail size={15} />
                  </button>
                  <FollowButton isFollowing={isFollowing} onToggle={onToggleFollow} />
                  <ProfileMenu
                    handle={user.handle} isMuted={isMuted} onToggleMute={onToggleMute} onToggleBlock={onToggleBlock}
                    onReport={onReportProfile ? (reason) => onReportProfile(handle, reason) : null}
                    isReported={reportedProfiles ? reportedProfiles.has(handle) : false}
                  />
                </div>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${PALETTE.border}`, paddingTop: 14 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 10 }}>
                ABOUT
              </div>
              <p style={{ margin: "0 0 12px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: PALETTE.ink, lineHeight: 1.55, overflowWrap: "break-word", wordBreak: "break-word" }}>
                {user.bio}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {user.location && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5 }}>
                    <MapPin size={14} /> {user.location}
                  </div>
                )}
                {user.website && (
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: PALETTE.teal, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5 }}>
                    <Link2 size={14} /> {user.website}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5 }}>
                  <Calendar size={14} /> Joined {user.joined}
                </div>
              </div>
            </div>

            {editable && !user.verified && (
              <div style={{ borderTop: `1px solid ${PALETTE.border}`, marginTop: 16, paddingTop: 16 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 10 }}>
                  GET VERIFIED
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: PALETTE.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <BadgeCheck size={17} color={PALETTE.teal} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14.5, color: PALETTE.ink }}>Verified badge</div>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.inkSoft }}>
                        A checkmark next to your name, everywhere on Murmur.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateProfile("you", { verified: true })}
                    style={{
                      background: PALETTE.teal, color: "#FBFAF6", border: "none", borderRadius: 999, padding: "8px 16px",
                      fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13, cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    Subscribe · $8/mo
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${PALETTE.border}`, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, flexWrap: "wrap" }}>
              <span><strong style={{ color: PALETTE.ink }}>{authored.length}</strong> <span style={{ color: PALETTE.inkSoft }}>murmurs</span></span>
              <span><strong style={{ color: PALETTE.ink }}>{authored.reduce((s, p) => s + p.likes, 0)}</strong> <span style={{ color: PALETTE.inkSoft }}>likes received</span></span>
              <span><strong style={{ color: PALETTE.ink }}>{user.followers}</strong> <span style={{ color: PALETTE.inkSoft }}>followers</span></span>
              <span><strong style={{ color: PALETTE.ink }}>{editable ? followingCount : user.following}</strong> <span style={{ color: PALETTE.inkSoft }}>following</span></span>
            </div>
          </>
        )}
      </div>

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }} aria-busy={!ready}>
        {!ready ? (
          [0, 1, 2].map((i) => <SkeletonPost key={i} />)
        ) : authored.length === 0 ? (
          <div style={{ padding: 28, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
            No murmurs yet.
          </div>
        ) : (
          <>
            {pinnedPost && (
              <Post
                key={pinnedPost.id} post={pinnedPost} onLike={onLike} onRepost={onRepost} onOpen={onOpenPost} onOpenProfile={onOpenProfile}
                onQuote={onQuote} onEdit={onEdit} onDelete={onDelete} onBookmark={onBookmark} bookmarked={bookmarks.has(pinnedPost.id)}
                onSearch={onSearch} onVote={onVote} isPinned onTogglePin={onTogglePin} showPinnedLabel
                onReport={onReport} isReported={reportedPosts.has(pinnedPost.id)} onViewAnalytics={onViewAnalytics}
              />
            )}
            {restPosts.map((post) => (
              <Post key={post.id} post={post} onLike={onLike} onRepost={onRepost} onOpen={onOpenPost} onOpenProfile={onOpenProfile} onQuote={onQuote} onEdit={onEdit} onDelete={onDelete} onBookmark={onBookmark} bookmarked={bookmarks.has(post.id)} onSearch={onSearch} onVote={onVote} isPinned={false} onTogglePin={onTogglePin} onReport={onReport} isReported={reportedPosts.has(post.id)} onViewAnalytics={onViewAnalytics} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SearchPage({ query, setQuery, posts, onLike, onRepost, onOpenPost, onOpenProfile, following, onToggleFollow, onBack, onQuote, onEdit, onDelete, onBookmark, bookmarks, blocked, onSearch, onVote, pinnedPostId, onTogglePin, onReport, reportedPosts }) {
  const { profiles } = useContext(ProfilesContext);
  const [resultTab, setResultTab] = useState("top");
  const q = query.trim().toLowerCase();
  const people = q ? Object.entries(profiles).filter(([h, u]) => !blocked.has(h) && (u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q))) : [];
  const matchedPosts = q ? posts.filter((p) => p.text.toLowerCase().includes(q)) : [];
  const photoPosts = matchedPosts.filter((p) => p.image);

  const showPeople = q && (resultTab === "top" || resultTab === "people");
  const showMurmurs = q && (resultTab === "top" || resultTab === "murmurs");
  const showPhotos = q && resultTab === "photos";
  const noResults =
    q &&
    (resultTab === "photos"
      ? photoPosts.length === 0
      : resultTab === "people"
      ? people.length === 0
      : resultTab === "murmurs"
      ? matchedPosts.length === 0
      : people.length === 0 && matchedPosts.length === 0);

  const suggestions = Object.entries(profiles)
    .filter(([h]) => h !== "you" && !following.has(h) && !blocked.has(h))
    .slice(0, 3);
  const popularPosts = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3);
  const trends = computeTrends(posts);

  return (
    <div>
      <BackBar onBack={onBack} label="Back to feed" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 999, padding: "10px 16px", marginBottom: 20 }}>
        <Search size={17} color={PALETTE.inkSoft} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search murmurs and people"
          style={{
            flex: 1, border: "none", outline: "none", background: "transparent",
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: PALETTE.ink,
          }}
        />
      </div>

      {!q && trends.length > 0 && (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 8, padding: "0 4px" }}>
            TRENDING
          </div>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            {trends.map((t, i) => (
              <div
                key={t.tag}
                onClick={() => setQuery(t.query)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setQuery(t.query); } }}
                style={{ padding: "12px 18px", borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`, cursor: "pointer" }}
              >
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, color: PALETTE.ink }}>{t.tag}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: PALETTE.inkSoft }}>{t.posts}</div>
              </div>
            ))}
          </div>

          {suggestions.length > 0 && (
            <>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 8, padding: "0 4px" }}>
                WHO TO FOLLOW
              </div>
              <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
                {suggestions.map(([handle, u], i) => (
                  <div
                    key={handle}
                    onClick={() => onOpenProfile(handle)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile(handle); } }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`, cursor: "pointer" }}
                  >
                    <Avatar user={u} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, color: PALETTE.ink }}>{u.name}</span>
                        {u.verified && <VerifiedBadge size={13} />}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.bio}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <FollowButton isFollowing={false} onToggle={() => onToggleFollow(handle)} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {popularPosts.length > 0 && (
            <>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 8, padding: "0 4px" }}>
                POPULAR MURMURS
              </div>
              <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
                {popularPosts.map((post) => (
                  <Post key={post.id} post={post} onLike={onLike} onRepost={onRepost} onOpen={onOpenPost} onOpenProfile={onOpenProfile} onQuote={onQuote} onEdit={onEdit} onDelete={onDelete} onBookmark={onBookmark} bookmarked={bookmarks.has(post.id)} onSearch={onSearch} onVote={onVote} isPinned={post.id === pinnedPostId} onTogglePin={onTogglePin} onReport={onReport} isReported={reportedPosts.has(post.id)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {q && (
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 999, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
          {[{ id: "top", label: "Top" }, { id: "people", label: "People" }, { id: "murmurs", label: "Murmurs" }, { id: "photos", label: "Photos" }].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setResultTab(tab.id)}
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13, cursor: "pointer",
                border: "none", borderRadius: 999, padding: "6px 14px",
                background: resultTab === tab.id ? PALETTE.teal : "transparent",
                color: resultTab === tab.id ? "#FBFAF6" : PALETTE.inkSoft,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {showPeople && people.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 8, padding: "0 4px" }}>
            PEOPLE
          </div>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
            {people.map(([handle, u], i) => (
              <div
                key={handle}
                onClick={() => onOpenProfile(handle)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile(handle); } }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
                  borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`, cursor: "pointer",
                }}
              >
                <Avatar user={u} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, color: PALETTE.ink }}>{u.name}</span>
                    {u.verified && <VerifiedBadge size={13} />}
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: PALETTE.inkSoft }}>{u.handle}</div>
                </div>
                {handle !== "you" && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <FollowButton isFollowing={following.has(handle)} onToggle={() => onToggleFollow(handle)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showMurmurs && (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 8, padding: "0 4px" }}>
            MURMURS
          </div>
          {matchedPosts.length === 0 ? (
            <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 28, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
              No murmurs match.
            </div>
          ) : (
            <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
              {matchedPosts.map((post) => (
                <Post key={post.id} post={post} onLike={onLike} onRepost={onRepost} onOpen={onOpenPost} onOpenProfile={onOpenProfile} onQuote={onQuote} onEdit={onEdit} onDelete={onDelete} onBookmark={onBookmark} bookmarked={bookmarks.has(post.id)} onSearch={onSearch} onVote={onVote} isPinned={post.id === pinnedPostId} onTogglePin={onTogglePin} onReport={onReport} isReported={reportedPosts.has(post.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {showPhotos && (
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 8, padding: "0 4px" }}>
            PHOTOS
          </div>
          {photoPosts.length === 0 ? (
            <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 28, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
              No murmurs with photos match.
            </div>
          ) : (
            <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
              {photoPosts.map((post) => (
                <Post key={post.id} post={post} onLike={onLike} onRepost={onRepost} onOpen={onOpenPost} onOpenProfile={onOpenProfile} onQuote={onQuote} onEdit={onEdit} onDelete={onDelete} onBookmark={onBookmark} bookmarked={bookmarks.has(post.id)} onSearch={onSearch} onVote={onVote} isPinned={post.id === pinnedPostId} onTogglePin={onTogglePin} onReport={onReport} isReported={reportedPosts.has(post.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {noResults && (
        <div style={{ textAlign: "center", padding: "12px 4px", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5 }}>
          Nothing turned up for "{query}".
        </div>
      )}
    </div>
  );
}

function QuotePage({ postId, posts, profiles, onSubmit, onBack }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const original = posts.find((p) => p.id === postId);

  if (!original) {
    return (
      <div>
        <BackBar onBack={onBack} label="Back" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          This murmur is no longer available.
        </div>
      </div>
    );
  }

  const author = profiles[original.author];

  return (
    <div>
      <BackBar onBack={onBack} label="Cancel" />
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Avatar user={profiles.you} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <MentionTextarea
              autoFocus
              rows={3}
              value={text}
              onChange={setText}
              placeholder="Add a comment"
              style={{
                width: "100%", resize: "none", border: "none", outline: "none", background: "transparent",
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: PALETTE.ink, lineHeight: 1.5, boxSizing: "border-box",
                overflowWrap: "break-word", wordBreak: "break-word",
              }}
            />
            <PhotoPicker image={image} setImage={setImage} onFile={setImageFile} size="small" />
            <div style={{ border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 12, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                <Avatar user={author} size={20} />
                <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 13, color: PALETTE.ink }}>{author.name}</span>
                {author.verified && <VerifiedBadge size={12} />}
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: PALETTE.inkSoft }}>{author.handle} · {original.time}</span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink, lineHeight: 1.45, overflowWrap: "break-word", wordBreak: "break-word" }}>
                {original.text.length > 200 ? `${original.text.slice(0, 200)}\u2026` : original.text}
              </div>
              {original.image && (
                <MediaContent src={original.image} alt="Quoted attachment" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 8, marginTop: 8, display: "block" }} />
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, marginTop: 12 }}>
          <CharCounter length={text.length} max={MAX_POST_LENGTH} />
          <button
            onClick={() => { if (text.length <= MAX_POST_LENGTH) onSubmit(postId, text.trim(), imageFile); }}
            disabled={text.length > MAX_POST_LENGTH}
            style={{
              background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 999, padding: "9px 18px",
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 14,
              cursor: text.length > MAX_POST_LENGTH ? "not-allowed" : "pointer", opacity: text.length > MAX_POST_LENGTH ? 0.5 : 1,
            }}
          >
            Quote
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ blocked, muted, onUnblock, onUnmute, onOpenProfile, onBack, notificationPrefs, onToggleNotificationPref, theme, onSetTheme, onOpenLists, listCount }) {
  const { profiles } = useContext(ProfilesContext);
  const you = profiles.you;
  const blockedList = [...blocked];
  const mutedList = [...muted];

  const sectionLabel = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft, margin: "0 4px 8px" };

  const PersonRow = ({ handle, actionLabel, onAction }) => {
    const u = profiles[handle];
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
        <Avatar user={u} size={36} onClick={() => onOpenProfile(handle)} />
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onOpenProfile(handle)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile(handle); } }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14, color: PALETTE.ink }}>{u.name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft }}>{u.handle}</div>
        </div>
        <button
          onClick={onAction}
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 12.5, cursor: "pointer",
            borderRadius: 999, padding: "6px 14px", border: `1px solid ${PALETTE.teal}`, background: "transparent", color: PALETTE.teal, flexShrink: 0,
          }}
        >
          {actionLabel}
        </button>
      </div>
    );
  };

  return (
    <div>
      <BackBar onBack={onBack} label="Back to feed" />

      <div style={sectionLabel}>ACCOUNT</div>
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        <div
          onClick={() => onOpenProfile("you")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile("you"); } }}
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
        >
          <Avatar user={you} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, color: PALETTE.ink }}>{you.name}</span>
              {you.verified && <VerifiedBadge size={13} />}
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: PALETTE.inkSoft }}>{you.handle}</div>
          </div>
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.teal }}>Edit</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderTop: `1px solid ${PALETTE.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BadgeCheck size={16} color={you.verified ? PALETTE.teal : PALETTE.inkSoft} />
            <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink }}>
              {you.verified ? "Verified · subscribed" : "Not verified"}
            </span>
          </div>
          {!you.verified && (
            <span
              onClick={() => onOpenProfile("you")}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile("you"); } }}
              style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.teal, cursor: "pointer" }}
            >
              Get verified
            </span>
          )}
        </div>
        <div
          onClick={onOpenLists}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenLists(); } }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderTop: `1px solid ${PALETTE.border}`, cursor: "pointer" }}
        >
          <List size={16} color={PALETTE.inkSoft} />
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink, flex: 1 }}>Your lists</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: PALETTE.inkSoft }}>{listCount}</span>
        </div>
      </div>

      <div style={sectionLabel}>APPEARANCE</div>
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 14, color: PALETTE.ink }}>Dark mode</div>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.inkSoft, marginTop: 2 }}>
              Switches the whole app to a dark palette.
            </div>
          </div>
          <Switch checked={theme === "dark"} onChange={(on) => onSetTheme(on ? "dark" : "light")} />
        </div>
      </div>

      <div style={sectionLabel}>NOTIFICATIONS</div>
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
        {[
          { type: "like", label: "Likes", desc: "When someone likes your murmurs." },
          { type: "repost", label: "Reposts", desc: "When someone reposts or quotes your murmurs." },
          { type: "reply", label: "Replies", desc: "When someone replies to your murmurs." },
          { type: "follow", label: "Follows", desc: "When someone follows you." },
        ].map((row, i) => (
          <div
            key={row.type}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}` }}
          >
            <div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 14, color: PALETTE.ink }}>{row.label}</div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.inkSoft, marginTop: 2 }}>{row.desc}</div>
            </div>
            <Switch checked={notificationPrefs[row.type]} onChange={() => onToggleNotificationPref(row.type)} />
          </div>
        ))}
      </div>

      <div style={sectionLabel}>PRIVACY & SAFETY</div>
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PALETTE.border}` }}>
          <VolumeX size={14} color={PALETTE.inkSoft} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft }}>MUTED ACCOUNTS</span>
        </div>
        {mutedList.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5 }}>
            You haven't muted anyone.
          </div>
        ) : (
          mutedList.map((h) => <PersonRow key={h} handle={h} actionLabel="Unmute" onAction={() => onUnmute(h)} />)
        )}
      </div>

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${PALETTE.border}` }}>
          <ShieldOff size={14} color={PALETTE.inkSoft} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft }}>BLOCKED ACCOUNTS</span>
        </div>
        {blockedList.length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5 }}>
            You haven't blocked anyone.
          </div>
        ) : (
          blockedList.map((h) => <PersonRow key={h} handle={h} actionLabel="Unblock" onAction={() => onUnblock(h)} />)
        )}
      </div>
    </div>
  );
}

function PostAnalyticsPage({ postId, posts, onBack }) {
  const post = posts.find((p) => p.id === postId);

  if (!post) {
    return (
      <div>
        <BackBar onBack={onBack} label="Back" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          This murmur was deleted.
        </div>
      </div>
    );
  }

  const replyCount = countReplies(post.replies);
  const views = post.views || 0;
  const engagements = post.likes + post.reposts + replyCount + (post.bookmarkCount || 0);
  const rate = views > 0 ? ((engagements / views) * 100).toFixed(1) : "0.0";

  const stats = [
    { label: "Views", value: views, icon: Eye },
    { label: "Likes", value: post.likes, icon: Heart },
    { label: "Reposts & quotes", value: post.reposts, icon: Repeat2 },
    { label: "Replies", value: replyCount, icon: MessageCircle },
  ];

  return (
    <div>
      <BackBar onBack={onBack} label="Back" />
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft, margin: "0 4px 12px" }}>
        MURMUR ANALYTICS
      </div>
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <p style={{ margin: 0, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14.5, color: PALETTE.ink, lineHeight: 1.5, overflowWrap: "break-word" }}>
          {post.text || "(photo or poll)"}
        </p>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 6 }}>{post.time}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: PALETTE.inkSoft, marginBottom: 6 }}>
              <s.icon size={14} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5 }}>{s.label}</span>
            </div>
            <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 24, color: PALETTE.ink }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft, marginBottom: 4 }}>ENGAGEMENT RATE</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 22, color: PALETTE.ink }}>{rate}%</div>
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.inkSoft, marginTop: 4 }}>
          Likes, reposts, and replies as a share of views.
        </div>
      </div>
    </div>
  );
}

function BookmarksPage({ posts, bookmarks, onLike, onRepost, onOpenPost, onOpenProfile, onQuote, onEdit, onDelete, onBookmark, onBack, onSearch, onVote, pinnedPostId, onTogglePin, onReport, reportedPosts }) {
  const list = posts.filter((p) => bookmarks.has(p.id));
  return (
    <div>
      <BackBar onBack={onBack} label="Back to feed" />
      {list.length === 0 ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          Nothing bookmarked yet. Tap the bookmark icon on any murmur to save it here.
        </div>
      ) : (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
          {list.map((post) => (
            <Post
              key={post.id} post={post} onLike={onLike} onRepost={onRepost} onOpen={onOpenPost} onOpenProfile={onOpenProfile}
              onQuote={onQuote} onEdit={onEdit} onDelete={onDelete} onBookmark={onBookmark} bookmarked onSearch={onSearch} onVote={onVote} isPinned={post.id === pinnedPostId} onTogglePin={onTogglePin} onReport={onReport} isReported={reportedPosts.has(post.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListsPage({ lists, onOpenList, onCreateList, onBack }) {
  const { profiles } = useContext(ProfilesContext);
  const [name, setName] = useState("");
  const listArr = Object.values(lists);

  return (
    <div>
      <BackBar onBack={onBack} label="Back to feed" />

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 10 }}>
          NEW LIST
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name"
            maxLength={40}
            style={{
              flex: 1, border: `1px solid ${PALETTE.border}`, borderRadius: 10, outline: "none", background: PALETTE.bg,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink, padding: "8px 12px", boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => { if (name.trim()) { onCreateList(name.trim()); setName(""); } }}
            disabled={!name.trim()}
            style={{
              background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 10, padding: "8px 16px",
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13.5,
              cursor: name.trim() ? "pointer" : "not-allowed", opacity: name.trim() ? 1 : 0.5, flexShrink: 0,
            }}
          >
            Create
          </button>
        </div>
      </div>

      {listArr.length === 0 ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          No lists yet. Create one above to group people you want to follow closely.
        </div>
      ) : (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
          {listArr.map((l, i) => (
            <div
              key={l.id}
              onClick={() => onOpenList(l.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenList(l.id); } }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`, cursor: "pointer" }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: PALETTE.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <List size={18} color={PALETTE.teal} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, color: PALETTE.ink }}>{l.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {l.members.slice(0, 4).map((h) => (
                    <Avatar key={h} user={profiles[h]} size={16} />
                  ))}
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft, marginLeft: l.members.length ? 4 : 0 }}>
                    {l.members.length} {l.members.length === 1 ? "member" : "members"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ListDetailPage({ listId, lists, posts, onLike, onRepost, onOpenPost, onOpenProfile, onQuote, onEdit, onDelete, onBookmark, bookmarks, onSearch, onVote, pinnedPostId, onTogglePin, onAddMember, onRemoveMember, onDeleteList, onBack, blocked, onReport, reportedPosts }) {
  const { profiles } = useContext(ProfilesContext);
  const list = lists[listId];

  if (!list) {
    return (
      <div>
        <BackBar onBack={onBack} label="Back to lists" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          This list no longer exists.
        </div>
      </div>
    );
  }

  const candidates = Object.keys(profiles).filter((h) => h !== "you" && !list.members.includes(h) && !blocked.has(h));
  const listPosts = posts.filter((p) => list.members.includes(p.author));

  return (
    <div>
      <BackBar onBack={onBack} label="Back to lists" />

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 19, color: PALETTE.ink }}>{list.name}</div>
          <button
            onClick={() => { onDeleteList(list.id); onBack(); }}
            aria-label="Delete list"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: PALETTE.coral, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5 }}
          >
            <Trash2 size={14} /> Delete list
          </button>
        </div>

        {list.members.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {list.members.map((h) => {
              const u = profiles[h];
              return (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${PALETTE.border}`, borderRadius: 999, padding: "4px 10px 4px 4px" }}>
                  <Avatar user={u} size={22} onClick={() => onOpenProfile(h)} />
                  <span
                    onClick={() => onOpenProfile(h)}
                    role="link"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile(h); } }}
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.ink, cursor: "pointer" }}
                  >{u.name}</span>
                  <button onClick={() => onRemoveMember(list.id, h)} aria-label={`Remove ${u.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft, display: "flex" }}>
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {candidates.length > 0 && (
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 8 }}>
              ADD PEOPLE
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {candidates.map((h) => {
                const u = profiles[h];
                return (
                  <button
                    key={h}
                    onClick={() => onAddMember(list.id, h)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, border: `1px solid ${PALETTE.border}`, borderRadius: 999,
                      padding: "4px 10px 4px 4px", background: "transparent", cursor: "pointer",
                    }}
                  >
                    <Avatar user={u} size={22} />
                    <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.ink }}>{u.name}</span>
                    <Plus size={12} color={PALETTE.teal} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {list.members.length === 0 ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          Add people above to see their murmurs here.
        </div>
      ) : listPosts.length === 0 ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          Nobody in this list has posted yet.
        </div>
      ) : (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
          {listPosts.map((post) => (
            <Post key={post.id} post={post} onLike={onLike} onRepost={onRepost} onOpen={onOpenPost} onOpenProfile={onOpenProfile} onQuote={onQuote} onEdit={onEdit} onDelete={onDelete} onBookmark={onBookmark} bookmarked={bookmarks.has(post.id)} onSearch={onSearch} onVote={onVote} isPinned={post.id === pinnedPostId} onTogglePin={onTogglePin} onReport={onReport} isReported={reportedPosts.has(post.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsPage({ notifications, onOpenPost, onOpenProfile, onBack, markAllRead }) {
  const { profiles } = useContext(ProfilesContext);
  const [unreadSnapshot] = useState(() => new Set(notifications.filter((n) => !n.read).map((n) => n.id)));

  useEffect(() => {
    markAllRead();
  }, []);

  const meta = {
    like: { Icon: Heart, label: "liked your murmur", color: PALETTE.coral },
    repost: { Icon: Repeat2, label: "reposted your murmur", color: PALETTE.teal },
    reply: { Icon: MessageCircle, label: "replied to your murmur", color: PALETTE.inkSoft },
    follow: { Icon: UserPlus, label: "followed you", color: PALETTE.gold },
  };

  return (
    <div>
      <BackBar onBack={onBack} label="Back to feed" />
      {notifications.length === 0 ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          Nothing yet. Notifications show up here when someone interacts with your murmurs.
        </div>
      ) : (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
          {notifications.map((n, i) => {
            const actor = profiles[n.actor];
            const { Icon, label, color } = meta[n.type];
            const isNew = unreadSnapshot.has(n.id);
            return (
              <div
                key={n.id}
                onClick={() => (n.postId != null ? onOpenPost(n.postId) : onOpenProfile(n.actor))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (n.postId != null ? onOpenPost(n.postId) : onOpenProfile(n.actor)); } }}
                style={{
                  display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 18px", cursor: "pointer",
                  borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`, background: isNew ? PALETTE.coralSoft : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: PALETTE.card, border: `1px solid ${PALETTE.border}`, flexShrink: 0, marginTop: 2 }}>
                  <Icon size={12} color={color} fill={n.type === "like" ? color : "none"} />
                </div>
                <Avatar user={actor} size={38} onClick={(e) => { e.stopPropagation(); onOpenProfile(n.actor); }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink }}>
                    <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}>{actor.name}</span>{actor.verified && <VerifiedBadge size={12} />} {label}
                  </div>
                  {n.text && (
                    <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: PALETTE.inkSoft, fontStyle: "italic", margin: "3px 0", overflowWrap: "break-word", wordBreak: "break-word" }}>
                      {n.text}
                    </div>
                  )}
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft, marginTop: 2 }}>{n.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TypingBubble({ name }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ background: PALETTE.bg, borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 6 }}>
        {name && (
          <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: PALETTE.inkSoft, marginRight: 2 }}>
            {name}
          </span>
        )}
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6, height: 6, borderRadius: "50%", background: PALETTE.inkSoft, display: "inline-block",
              animation: "murmur-typing-bounce 1.2s infinite", animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes murmur-typing-bounce { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }`}</style>
    </div>
  );
}

function MessagesPage({ conversations, groupChats, onOpenConversation, onOpenGroup, onCreateGroup, blocked, onBack }) {
  const { profiles } = useContext(ProfilesContext);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState([]);

  const dmList = Object.entries(conversations)
    .filter(([, c]) => c.messages.length > 0)
    .map(([handle, c]) => ({ key: handle, isGroup: false, handle, ...c, last: c.messages[c.messages.length - 1] }));
  const groupList = Object.values(groupChats)
    .filter((g) => g.messages.length > 0)
    .map((g) => ({ key: `group-${g.id}`, isGroup: true, ...g, last: g.messages[g.messages.length - 1] }));
  const list = [...dmList, ...groupList];

  const candidates = Object.keys(profiles).filter((h) => h !== "you" && !blocked.has(h));
  const toggleSelected = (h) => setSelected((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  const submitGroup = () => {
    if (selected.length < 2) return;
    const id = onCreateGroup(groupName.trim(), selected);
    setCreatingGroup(false);
    setGroupName("");
    setSelected([]);
    onOpenGroup(id);
  };

  return (
    <div>
      <BackBar onBack={onBack} label="Back to feed" />

      {creatingGroup ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 16, marginBottom: 20 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 10 }}>
            NEW GROUP
          </div>
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name (optional)"
            maxLength={40}
            style={{
              width: "100%", border: `1px solid ${PALETTE.border}`, borderRadius: 10, outline: "none", background: PALETTE.bg,
              fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink, padding: "8px 12px", boxSizing: "border-box", marginBottom: 12,
            }}
          />
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 8 }}>
            PICK AT LEAST 2 PEOPLE
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
            {candidates.map((h) => {
              const u = profiles[h];
              const on = selected.includes(h);
              return (
                <button
                  key={h}
                  onClick={() => toggleSelected(h)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, border: `1px solid ${on ? PALETTE.teal : PALETTE.border}`, borderRadius: 999,
                    padding: "4px 10px 4px 4px", background: on ? PALETTE.tealSoft : "transparent", cursor: "pointer",
                  }}
                >
                  <Avatar user={u} size={22} />
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12.5, color: PALETTE.ink }}>{u.name}</span>
                  {on && <Check size={12} color={PALETTE.teal} />}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={() => { setCreatingGroup(false); setGroupName(""); setSelected([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, padding: "6px 10px" }}>
              Cancel
            </button>
            <button
              onClick={submitGroup}
              disabled={selected.length < 2}
              style={{
                background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 999, padding: "7px 16px",
                fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13,
                cursor: selected.length < 2 ? "not-allowed" : "pointer", opacity: selected.length < 2 ? 0.5 : 1,
              }}
            >
              Create
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreatingGroup(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer",
            padding: 0, marginBottom: 16, color: PALETTE.teal, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5,
          }}
        >
          <Plus size={16} /> New group
        </button>
      )}

      {list.length === 0 ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          No messages yet. Visit someone's profile and say hello, or start a group.
        </div>
      ) : (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
          {list.map((c, i) => {
            const senderName = c.last.sender === "you" ? "You" : c.isGroup ? profiles[c.last.sender].name.split(" ")[0] : null;
            return (
              <div
                key={c.key}
                onClick={() => (c.isGroup ? onOpenGroup(c.id) : onOpenConversation(c.handle))}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (c.isGroup ? onOpenGroup(c.id) : onOpenConversation(c.handle)); } }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer",
                  borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`, background: c.unread > 0 ? PALETTE.coralSoft : "transparent",
                }}
              >
                {c.isGroup ? (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: PALETTE.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Users size={19} color={PALETTE.teal} />
                  </div>
                ) : (
                  <Avatar user={profiles[c.handle]} size={44} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 15, color: PALETTE.ink }}>
                        {c.isGroup ? c.name : profiles[c.handle].name}
                      </span>
                      {!c.isGroup && profiles[c.handle].verified && <VerifiedBadge size={13} />}
                    </span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft, flexShrink: 0 }}>{c.last.time}</span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: c.unread > 0 ? PALETTE.ink : PALETTE.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {senderName ? `${senderName}: ` : ""}{c.last.image && !c.last.text ? "\uD83D\uDCF7 Photo" : c.last.text}
                  </div>
                </div>
                {c.unread > 0 && (
                  <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: PALETTE.coral, color: "#FFF7F2", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px", flexShrink: 0 }}>
                    {c.unread}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupChatPage({ groupId, groupChats, onSend, onOpenProfile, onBack, markRead, typingIndicator }) {
  const { profiles } = useContext(ProfilesContext);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const group = groupChats[groupId];
  const isTyping = typingIndicator && typingIndicator.key === groupId;

  useEffect(() => {
    markRead(groupId);
  }, [groupId]);

  useEffect(() => {
    bottomRef.current && bottomRef.current.scrollIntoView({ block: "nearest" });
  }, [group ? group.messages.length : 0, isTyping]);

  if (!group) {
    return (
      <div>
        <BackBar onBack={onBack} label="Messages" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          This group no longer exists.
        </div>
      </div>
    );
  }

  const submit = () => {
    const t = text.trim();
    if (!t && !pendingImage) return;
    onSend(groupId, t, pendingImage);
    setText("");
    setPendingImage(null);
  };

  return (
    <div>
      <BackBar onBack={onBack} label="Messages" />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px 16px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: PALETTE.tealSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Users size={18} color={PALETTE.teal} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: PALETTE.ink }}>{group.name}</div>
          <div style={{ display: "flex", gap: 4 }}>
            {group.members.map((h) => (
              <span
                key={h}
                onClick={() => onOpenProfile(h)}
                role="link"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile(h); } }}
                style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft, cursor: "pointer" }}
              >
                {profiles[h].handle}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 18, marginBottom: 16, minHeight: 220, display: "flex", flexDirection: "column", gap: 12 }}>
        {group.messages.length === 0 && !isTyping ? (
          <div style={{ margin: "auto", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, textAlign: "center" }}>
            No messages yet. Say hello to the group.
          </div>
        ) : (
          group.messages.map((m) => {
            const mine = m.sender === "you";
            const author = profiles[m.sender];
            return (
              <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}>
                {!mine && (
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11.5, color: PALETTE.inkSoft, marginBottom: 2, marginLeft: 2 }}>
                    {author.name}
                  </span>
                )}
                <div
                  style={{
                    maxWidth: "75%", background: mine ? PALETTE.teal : PALETTE.bg, color: mine ? "#FBFAF6" : PALETTE.ink,
                    borderRadius: 16, padding: m.image ? 6 : "9px 14px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, lineHeight: 1.45,
                    overflowWrap: "break-word", wordBreak: "break-word",
                  }}
                >
                  {m.image && (
                    <MediaContent src={m.image} alt="Attachment" style={{ display: "block", maxWidth: "100%", maxHeight: 220, borderRadius: 11, marginBottom: m.text ? 6 : 2 }} />
                  )}
                  {m.text && <div style={{ padding: m.image ? "0 6px" : 0 }}>{m.text}</div>}
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: mine ? "right" : "left", padding: m.image ? "0 6px" : 0 }}>
                    {m.time}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isTyping && <TypingBubble name={typingIndicator.name} />}
        <div ref={bottomRef} />
      </div>

      {pendingImage && (
        <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
          <MediaContent src={pendingImage} alt="Attachment preview" style={{ maxHeight: 100, borderRadius: 10, border: `1px solid ${PALETTE.border}`, display: "block" }} />
          <button
            onClick={() => setPendingImage(null)}
            aria-label="Remove attachment"
            style={{
              position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", border: "none",
              background: "rgba(31,42,36,0.72)", color: "#FBFAF6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={11} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            if (file) readFileAsDataUrl(file, setPendingImage);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          aria-label="Add photo, GIF, or video"
          style={{
            width: 42, height: 42, borderRadius: "50%", border: `1px solid ${PALETTE.border}`, background: "transparent", color: PALETTE.inkSoft,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}
        >
          <ImagePlus size={17} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Message the group"
          style={{
            flex: 1, border: `1px solid ${PALETTE.border}`, borderRadius: 999, outline: "none", background: PALETTE.card,
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink, padding: "10px 16px", boxSizing: "border-box",
          }}
        />
        <button
          onClick={submit}
          aria-label="Send"
          style={{
            width: 42, height: 42, borderRadius: "50%", border: "none", background: PALETTE.coral, color: "#FFF7F2",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function ConversationPage({ handle, conversations, onSend, onOpenProfile, onBack, markRead, blocked, typingIndicator }) {
  const { profiles } = useContext(ProfilesContext);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const user = profiles[handle];
  const convo = conversations[handle] || { messages: [], unread: 0 };
  const isTyping = typingIndicator && typingIndicator.key === handle;

  useEffect(() => {
    markRead(handle);
  }, [handle]);

  useEffect(() => {
    bottomRef.current && bottomRef.current.scrollIntoView({ block: "nearest" });
  }, [convo.messages.length, isTyping]);

  const submit = () => {
    const t = text.trim();
    if (!t && !pendingImage) return;
    onSend(handle, t, pendingImage);
    setText("");
    setPendingImage(null);
  };

  if (blocked.has(handle)) {
    return (
      <div>
        <BackBar onBack={onBack} label="Messages" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          You've blocked this account. Unblock from their profile to message again.
        </div>
      </div>
    );
  }

  return (
    <div>
      <BackBar onBack={onBack} label="Messages" />
      <div
        onClick={() => onOpenProfile(handle)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenProfile(handle); } }}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px 16px", cursor: "pointer" }}
      >
        <Avatar user={user} size={40} />
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: PALETTE.ink }}>{user.name}</span>
            {user.verified && <VerifiedBadge size={14} />}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: PALETTE.inkSoft }}>{user.handle}</div>
        </div>
      </div>

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 18, marginBottom: 16, minHeight: 220, display: "flex", flexDirection: "column", gap: 10 }}>
        {convo.messages.length === 0 && !isTyping ? (
          <div style={{ margin: "auto", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, textAlign: "center" }}>
            No messages yet. Say hello to {user.name.split(" ")[0]}.
          </div>
        ) : (
          convo.messages.map((m) => {
            const mine = m.sender === "you";
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "75%", background: mine ? PALETTE.teal : PALETTE.bg, color: mine ? "#FBFAF6" : PALETTE.ink,
                    borderRadius: 16, padding: m.image ? 6 : "9px 14px", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, lineHeight: 1.45,
                    overflowWrap: "break-word", wordBreak: "break-word",
                  }}
                >
                  {m.image && (
                    <MediaContent src={m.image} alt="Attachment" style={{ display: "block", maxWidth: "100%", maxHeight: 220, borderRadius: 11, marginBottom: m.text ? 6 : 2 }} />
                  )}
                  {m.text && <div style={{ padding: m.image ? "0 6px" : 0 }}>{m.text}</div>}
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: mine ? "right" : "left", padding: m.image ? "0 6px" : 0 }}>
                    {m.time}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {isTyping && <TypingBubble />}
        <div ref={bottomRef} />
      </div>

      {pendingImage && (
        <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
          <MediaContent src={pendingImage} alt="Attachment preview" style={{ maxHeight: 100, borderRadius: 10, border: `1px solid ${PALETTE.border}`, display: "block" }} />
          <button
            onClick={() => setPendingImage(null)}
            aria-label="Remove attachment"
            style={{
              position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", border: "none",
              background: "rgba(31,42,36,0.72)", color: "#FBFAF6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >
            <X size={11} />
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            if (file) readFileAsDataUrl(file, setPendingImage);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          aria-label="Add photo, GIF, or video"
          style={{
            width: 42, height: 42, borderRadius: "50%", border: `1px solid ${PALETTE.border}`, background: "transparent", color: PALETTE.inkSoft,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}
        >
          <ImagePlus size={17} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder={`Message ${user.name.split(" ")[0]}`}
          style={{
            flex: 1, border: `1px solid ${PALETTE.border}`, borderRadius: 999, outline: "none", background: PALETTE.card,
            fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: PALETTE.ink, padding: "10px 16px", boxSizing: "border-box",
          }}
        />
        <button
          onClick={submit}
          aria-label="Send"
          style={{
            width: 42, height: 42, borderRadius: "50%", border: "none", background: PALETTE.coral, color: "#FFF7F2",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

function PostPage({ postId, currentUserId, onLike, onRepost, onOpenProfile, onBack, onQuote, onEdit, onDelete, onBookmark, onVote, onTogglePin, blocked, onSearch, onViewAnalytics, onReport, reportedPosts }) {
  const { post, loading, reload, addReply } = usePostDetail(postId);
  const [composing, setComposing] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replyDraftImage, setReplyDraftImage] = useState(null);
  const [replyDraftImageFile, setReplyDraftImageFile] = useState(null);

  if (loading) {
    return (
      <div>
        <BackBar onBack={onBack} label="Back" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }} aria-busy="true" aria-label="Loading murmur">
          <SkeletonPost large />
        </div>
      </div>
    );
  }
  if (!post) {
    return (
      <div>
        <BackBar onBack={onBack} label="Back" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          This murmur was deleted.
        </div>
      </div>
    );
  }
  if (blocked.has(post.author)) {
    return (
      <div>
        <BackBar onBack={onBack} label="Back" />
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
          You've blocked this account.
        </div>
      </div>
    );
  }

  // Root-post actions go through the same feed-level handlers as everywhere
  // else (so the main feed list stays in sync), then refresh this page's own
  // copy of the post since it's tracked separately via usePostDetail.
  const handleLike = async (id) => { await onLike(id); reload(); };
  const handleRepost = async (id) => { await onRepost(id); reload(); };
  const handleBookmark = async (id) => { await onBookmark(id); reload(); };
  const handleTogglePin = async (id) => { await onTogglePin(id); reload(); };
  const handleVote = async (id, optionId) => { await onVote(id, optionId); reload(); };
  const handleEdit = async (id, text) => { await onEdit(id, text); reload(); };
  const handleDelete = async (id) => { await onDelete(id); onBack(); };

  // Reply-level actions: replies are just posts with reply_to_id set, but
  // they live only in this page's own reply tree (not the main feed list),
  // so these call the API directly and refetch the tree afterward.
  const handleReplyLike = async (replyId) => {
    const target = findNode(post.replies, replyId);
    if (!target) return;
    await postsApi.toggleLike(replyId, currentUserId, target.liked);
    reload();
  };
  const handleReplyRepost = async (replyId) => {
    const target = findNode(post.replies, replyId);
    if (!target) return;
    await postsApi.toggleRepost(replyId, currentUserId, target.reposted);
    reload();
  };
  const handleEditReply = async (replyId, text) => {
    await postsApi.editPost(replyId, text);
    reload();
  };
  const handleDeleteReply = async (replyId) => {
    await postsApi.deletePost(replyId);
    reload();
  };
  const handleAddReply = async (targetId, text, image, imageFile) => {
    // targetId is null for a reply directly on the root post (vs. a reply to
    // a specific reply) — reply_to_id must point at the actual parent row,
    // so fall back to this page's own postId in that case.
    await addReply(currentUserId, targetId ?? postId, text, imageFile);
  };

  const visibleReplies = filterBlockedReplies(post.replies, blocked);
  return (
    <div>
      <BackBar onBack={onBack} label="Back" />
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
        <Post
          post={post} onLike={handleLike} onRepost={handleRepost} onOpenProfile={onOpenProfile} large
          onReplyClick={() => setComposing((c) => !c)} onQuote={onQuote} onEdit={handleEdit} onDelete={handleDelete}
          onBookmark={handleBookmark} bookmarked={post.bookmarked} onSearch={onSearch} onVote={handleVote} isPinned={post.isPinned} onTogglePin={handleTogglePin}
          onViewAnalytics={onViewAnalytics} onReport={onReport} isReported={reportedPosts.has(post.id)}
        />
        {composing && (
          <div style={{ padding: "0 22px 18px" }}>
            <InlineComposer
              placeholder="Post your reply"
              text={replyDraft}
              setText={setReplyDraft}
              image={replyDraftImage}
              setImage={setReplyDraftImage}
              imageFile={replyDraftImageFile}
              setImageFile={setReplyDraftImageFile}
              onCancel={() => { setComposing(false); setReplyDraft(""); setReplyDraftImage(null); setReplyDraftImageFile(null); }}
              onSubmit={(text, image, imageFile) => { handleAddReply(null, text, image, imageFile); setComposing(false); setReplyDraft(""); setReplyDraftImage(null); setReplyDraftImageFile(null); }}
            />
          </div>
        )}
        {!composing && (replyDraft.trim() || replyDraftImage) && (
          <div
            onClick={() => setComposing(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setComposing(true); } }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 22px 16px", cursor: "pointer", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}
          >
            <Feather size={11} /> Unsent reply saved
          </div>
        )}
      </div>

      <div style={{ padding: "0 4px 8px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft }}>
        REPLIES
      </div>
      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden", paddingBottom: 6 }}>
        {visibleReplies.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: PALETTE.inkSoft, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
            No replies yet. Start the thread.
          </div>
        ) : (
          visibleReplies.map((node) => (
            <ReplyThread
              key={node.id} node={node} depth={0}
              onLike={handleReplyLike}
              onRepost={handleReplyRepost}
              onOpenProfile={onOpenProfile}
              onAddReply={handleAddReply}
              onEditReply={handleEditReply}
              onDeleteReply={handleDeleteReply}
              onSearch={onSearch}
            />
          ))
        )}
      </div>
    </div>
  );
}

function Feed({ posts, onLike, onRepost, onOpenPost, onOpenProfile, draft, setDraft, draftImage, setDraftImage, setDraftImageFile, postDraft, onLoadMore, loadingMore, reachedEnd, feedTab, setFeedTab, following, onQuote, onEdit, onDelete, onBookmark, bookmarks, onSearch, onVote, draftPoll, setDraftPoll, pinnedPostId, onTogglePin, onReport, reportedPosts }) {
  const { profiles } = useContext(ProfilesContext);
  const sentinelRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [onLoadMore]);

  const displayedPosts = feedTab === "following" ? posts.filter((p) => p.author === "you" || following.has(p.author)) : posts;
  const pollValid = draftPoll && draftPoll.options.filter((o) => o.trim()).length >= 2;
  const canPost = draft.length <= MAX_POST_LENGTH && (draft.trim() || draftImage || pollValid);
  const ready = useReadyDelay(feedTab);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "j") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, displayedPosts.length - 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if ((e.key === "Enter" || e.key === "o") && selectedIndex >= 0 && displayedPosts[selectedIndex]) {
        onOpenPost(displayedPosts[selectedIndex].id);
      } else if (e.key === "l" && selectedIndex >= 0 && displayedPosts[selectedIndex]) {
        onLike(displayedPosts[selectedIndex].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, displayedPosts, onOpenPost, onLike]);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 999, padding: 4, width: "fit-content" }}>
        {[{ id: "foryou", label: "For you" }, { id: "following", label: "Following" }].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFeedTab(tab.id)}
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13.5, cursor: "pointer",
              border: "none", borderRadius: 999, padding: "7px 16px",
              background: feedTab === tab.id ? PALETTE.teal : "transparent",
              color: feedTab === tab.id ? "#FBFAF6" : PALETTE.inkSoft,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 16, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <Avatar user={profiles.you} onClick={() => onOpenProfile("you")} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <MentionTextarea
              value={draft}
              onChange={setDraft}
              placeholder="What's moving through the flock?"
              rows={2}
              style={{ width: "100%", resize: "none", border: "none", outline: "none", background: "transparent", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 15, color: PALETTE.ink, lineHeight: 1.5, paddingTop: 8, boxSizing: "border-box", overflowWrap: "break-word", wordBreak: "break-word" }}
            />
            {!draftPoll && <PhotoPicker image={draftImage} setImage={setDraftImage} onFile={setDraftImageFile} />}
            {!draftImage && (
              draftPoll ? (
                <PollComposer poll={draftPoll} setPoll={setDraftPoll} onRemove={() => setDraftPoll(null)} />
              ) : (
                <button
                  onClick={() => setDraftPoll({ options: ["", ""], duration: "1 day" })}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer",
                    padding: 0, marginTop: 6, color: PALETTE.teal, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13,
                  }}
                >
                  <BarChart2 size={16} /> Add poll
                </button>
              )
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, marginTop: 6 }}>
          <CharCounter length={draft.length} max={MAX_POST_LENGTH} />
          <button
            onClick={postDraft}
            disabled={!canPost}
            style={{
              display: "flex", alignItems: "center", gap: 8, background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 999,
              padding: "9px 18px", fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 14,
              cursor: canPost ? "pointer" : "not-allowed",
              opacity: canPost ? 1 : 0.5,
            }}
          >
            <Feather size={15} /> Send it out
          </button>
        </div>
      </div>

      {!ready ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }} aria-busy="true" aria-label="Loading murmurs">
          {[0, 1, 2, 3].map((i) => <SkeletonPost key={i} />)}
        </div>
      ) : feedTab === "following" && displayedPosts.length === 0 ? (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
          <Users size={22} color={PALETTE.inkSoft} style={{ marginBottom: 10 }} />
          <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16, color: PALETTE.ink, marginBottom: 4 }}>
            Nobody here yet
          </div>
          <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.inkSoft }}>
            Follow a few people from their profile and their murmurs will show up here.
          </div>
        </div>
      ) : (
        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, overflow: "hidden" }}>
          {displayedPosts.map((post, i) => (
            <Post
              key={post.id} post={post} onLike={onLike} onRepost={onRepost} onOpen={onOpenPost} onOpenProfile={onOpenProfile}
              onQuote={onQuote} onEdit={onEdit} onDelete={onDelete} onBookmark={onBookmark} bookmarked={bookmarks.has(post.id)}
              onSearch={onSearch} onVote={onVote} isPinned={post.id === pinnedPostId} onTogglePin={onTogglePin} onReport={onReport}
              isReported={reportedPosts.has(post.id)} selected={i === selectedIndex}
            />
          ))}
        </div>
      )}

      <div ref={sentinelRef} style={{ padding: "20px 0", textAlign: "center" }}>
        {loadingMore && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: PALETTE.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>
            <Loader2 size={15} className="murmur-spin" /> loading more murmurs
          </div>
        )}
        {reachedEnd && !loadingMore && (
          <div style={{ color: PALETTE.inkSoft, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5 }}>
            — you've reached the end of the flock —
          </div>
        )}
      </div>
      <style>{`@keyframes murmur-spin { to { transform: rotate(360deg); } } .murmur-spin { animation: murmur-spin 0.8s linear infinite; }`}</style>
    </div>
  );
}

function AuthPage({ onSignUp, onLogIn, theme }) {
  const [mode, setMode] = useState("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (mode === "signup" && !name.trim()) errs.name = "Enter a name.";
    if (!email.trim()) errs.email = "Enter an email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "That doesn't look like a valid email.";
    if (!password) errs.password = "Enter a password.";
    else if (password.length < 6) errs.password = "Use at least 6 characters.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await onSignUp({ name: name.trim(), email: email.trim(), password });
      } else {
        await onLogIn({ email: email.trim(), password });
      }
    } catch (err) {
      setErrors({ form: err?.message || "Something went wrong. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (field) => ({
    width: "100%", border: `1px solid ${errors[field] ? PALETTE.coral : PALETTE.border}`, borderRadius: 10, outline: "none",
    background: PALETTE.bg, fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14.5, color: PALETTE.ink,
    padding: "10px 12px", boxSizing: "border-box",
  });
  const labelStyle = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: 0.4, color: PALETTE.inkSoft, marginBottom: 5, display: "block" };
  const errorStyle = { fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: PALETTE.coral, marginTop: 4 };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
          <FlockMark size={32} />
          <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, color: PALETTE.ink }}>Murmur</span>
        </div>

        <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", gap: 4, background: PALETTE.bg, border: `1px solid ${PALETTE.border}`, borderRadius: 999, padding: 4, marginBottom: 22 }}>
            {[{ id: "signup", label: "Sign up" }, { id: "login", label: "Log in" }].map((t) => (
              <button
                key={t.id}
                onClick={() => { setMode(t.id); setErrors({}); }}
                style={{
                  flex: 1, fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 13.5, cursor: "pointer",
                  border: "none", borderRadius: 999, padding: "8px 0",
                  background: mode === t.id ? PALETTE.teal : "transparent",
                  color: mode === t.id ? "#FBFAF6" : PALETTE.inkSoft,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode === "signup" && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>NAME</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Odalys Marsh" style={inputStyle("name")} />
                {errors.name && <div style={errorStyle}>{errors.name}</div>}
              </div>
            )}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>EMAIL</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle("email")} />
              {errors.email && <div style={errorStyle}>{errors.email}</div>}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>PASSWORD</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle("password")} />
              {errors.password && <div style={errorStyle}>{errors.password}</div>}
            </div>
            {errors.form && <div style={{ ...errorStyle, marginBottom: 14, textAlign: "center" }}>{errors.form}</div>}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", background: PALETTE.coral, color: "#FFF7F2", border: "none", borderRadius: 999, padding: "11px 0",
                fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500, fontSize: 14.5, cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft }}>
          {mode === "signup" ? "creates a real account via Supabase" : "signed in against your Supabase project"}
        </div>
      </div>
    </div>
  );
}

export default function Murmur() {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 680 : false));
  const [theme, setTheme] = useState("light");

  // --- Real auth (Supabase), replacing the old mock authed/handleAuth state. ---
  const { user, authed, authLoading, signUp, logIn } = useAuth();
  useEffect(() => {
    setCurrentUser(user?.id ?? null);
  }, [user]);

  // --- Real posts/feed (Supabase), replacing the old SEED_POSTS local state
  // and its fake infinite-scroll generator. See MIGRATION.md step 2.
  const {
    posts,
    reachedEnd,
    loadMore: loadMorePosts,
    createPost,
    editPost,
    deletePost,
    togglePin,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    votePoll,
  } = usePosts(user?.id);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMore = async () => {
    if (loadingMore || reachedEnd) return;
    setLoadingMore(true);
    try {
      await loadMorePosts();
    } finally {
      setLoadingMore(false);
    }
  };
  // Bookmarks are a boolean on each post from the backend (toAppPost's
  // `bookmarked` field), but every existing component still expects a Set of
  // ids to check with `.has(post.id)` — this keeps that contract unchanged.
  const bookmarks = new Set(posts.filter((p) => p.bookmarked).map((p) => p.id));
  const pinnedPostId = posts.find((p) => p.isPinned)?.id ?? null;
  useEffect(() => {
    // Once signed up, seed the "you" profile's display name/handle from what they entered.
    // (Real backend: profiles.name/handle come from the signup call in useAuth and are
    // fetched into `user`-adjacent profile state once posts/social hooks are wired in —
    // for now this keeps the existing UI's `profiles.you` shape populated on first login.)
    if (user?.user_metadata?.name) {
      const name = user.user_metadata.name;
      const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      const handle = `@${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "you"}`;
      setProfiles((prev) => ({ ...prev, you: { ...prev.you, name: name.trim(), initials: initials || "YU", handle } }));
    }
  }, [user]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 680);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const [profiles, setProfiles] = useState(() => ({ ...NAMES }));
  const updateProfile = (handle, updates) =>
    setProfiles((prev) => ({ ...prev, [handle]: { ...prev[handle], ...updates } }));
  const [draft, setDraft] = useState("");
  const [draftImage, setDraftImage] = useState(null);
  const [draftImageFile, setDraftImageFile] = useState(null);
  const [draftPoll, setDraftPoll] = useState(null);
  const [view, setView] = useState({ type: "feed" });
  const [coverImage, setCoverImage] = useState(null);
  const [following, setFollowing] = useState(new Set(["odalysm", "kestrel"]));
  const [feedTab, setFeedTab] = useState("foryou");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState(SEED_NOTIFICATIONS);
  const timersRef = useRef([]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const [notificationPrefs, setNotificationPrefs] = useState({ like: true, repost: true, reply: true, follow: true });
  const notificationPrefsRef = useRef(notificationPrefs);
  useEffect(() => {
    notificationPrefsRef.current = notificationPrefs;
  }, [notificationPrefs]);
  const toggleNotificationPref = (type) => setNotificationPrefs((prev) => ({ ...prev, [type]: !prev[type] }));

  const addNotification = (n) => {
    if (!notificationPrefsRef.current[n.type]) return;
    setNotifications((prev) => [{ id: nextId(), read: false, ...n }, ...prev]);
  };
  const markAllRead = () => setNotifications((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));

  const [blocked, setBlocked] = useState(new Set());
  const [muted, setMuted] = useState(new Set());
  const hiddenAuthors = new Set([...blocked, ...muted]);

  const toggleBlock = (handle) =>
    setBlocked((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) {
        next.delete(handle);
      } else {
        next.add(handle);
        setFollowing((f) => {
          if (!f.has(handle)) return f;
          const nf = new Set(f);
          nf.delete(handle);
          return nf;
        });
        setMuted((m) => {
          if (!m.has(handle)) return m;
          const nm = new Set(m);
          nm.delete(handle);
          return nm;
        });
      }
      return next;
    });

  const toggleMute = (handle) =>
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(handle)) next.delete(handle);
      else next.add(handle);
      return next;
    });

  const visibleNotifications = notifications.filter((n) => !blocked.has(n.actor));
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;
  const visiblePosts = posts.filter((p) => !hiddenAuthors.has(p.author));
  const trends = useMemo(() => computeTrends(posts), [posts]);

  const [conversations, setConversations] = useState(() => JSON.parse(JSON.stringify(SEED_CONVERSATIONS)));
  const [groupChats, setGroupChats] = useState({});
  const openConvoRef = useRef(null);
  useEffect(() => {
    openConvoRef.current = view.type === "dm" ? view.handle : view.type === "group" ? view.id : null;
  }, [view]);

  const [typingIndicator, setTypingIndicator] = useState(null);

  const markConversationRead = (handle) =>
    setConversations((prev) => (prev[handle] ? { ...prev, [handle]: { ...prev[handle], unread: 0 } } : prev));

  const sendMessage = (handle, text, image) => {
    setConversations((prev) => {
      const convo = prev[handle] || { messages: [], unread: 0 };
      return { ...prev, [handle]: { ...convo, messages: [...convo.messages, { id: nextId(), sender: "you", text, image: image || null, time: "now" }] } };
    });
    setTypingIndicator({ key: handle, name: profiles[handle] ? profiles[handle].name : "" });
    const t = setTimeout(() => {
      const replyText = DM_REPLIES[Math.floor(Math.random() * DM_REPLIES.length)];
      setTypingIndicator((prev) => (prev && prev.key === handle ? null : prev));
      setConversations((prev) => {
        const convo = prev[handle] || { messages: [], unread: 0 };
        const isOpen = openConvoRef.current === handle;
        return {
          ...prev,
          [handle]: {
            ...convo,
            messages: [...convo.messages, { id: nextId(), sender: handle, text: replyText, image: null, time: "now" }],
            unread: isOpen ? 0 : convo.unread + 1,
          },
        };
      });
    }, 2200 + Math.random() * 2600);
    timersRef.current.push(t);
  };

  const createGroup = (name, members) => {
    const id = nextId();
    setGroupChats((prev) => ({ ...prev, [id]: { id, name: name || members.map((h) => profiles[h].name.split(" ")[0]).join(", "), members, messages: [], unread: 0 } }));
    return id;
  };

  const markGroupRead = (id) =>
    setGroupChats((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], unread: 0 } } : prev));

  const sendGroupMessage = (groupId, text, image) => {
    const group = groupChats[groupId];
    if (!group) return;
    setGroupChats((prev) => {
      const g = prev[groupId];
      if (!g) return prev;
      return { ...prev, [groupId]: { ...g, messages: [...g.messages, { id: nextId(), sender: "you", text, image: image || null, time: "now" }] } };
    });
    const replier = group.members[Math.floor(Math.random() * group.members.length)];
    setTypingIndicator({ key: groupId, name: profiles[replier] ? profiles[replier].name : "" });
    const t = setTimeout(() => {
      const replyText = DM_REPLIES[Math.floor(Math.random() * DM_REPLIES.length)];
      setTypingIndicator((prev) => (prev && prev.key === groupId ? null : prev));
      setGroupChats((prev) => {
        const g = prev[groupId];
        if (!g) return prev;
        const isOpen = openConvoRef.current === groupId;
        return {
          ...prev,
          [groupId]: {
            ...g,
            messages: [...g.messages, { id: nextId(), sender: replier, text: replyText, image: null, time: "now" }],
            unread: isOpen ? 0 : g.unread + 1,
          },
        };
      });
    }, 2200 + Math.random() * 2600);
    timersRef.current.push(t);
  };

  const visibleConversations = Object.fromEntries(Object.entries(conversations).filter(([h]) => !blocked.has(h)));
  const visibleGroupChats = Object.fromEntries(Object.entries(groupChats).filter(([, g]) => g.members.every((h) => !blocked.has(h))));
  const totalUnreadDMs =
    Object.values(visibleConversations).reduce((s, c) => s + c.unread, 0) +
    Object.values(visibleGroupChats).reduce((s, g) => s + g.unread, 0);

  const toggleFollow = (handle) =>
    setFollowing((prev) => {
      const next = new Set(prev);
      const wasFollowing = next.has(handle);
      if (wasFollowing) next.delete(handle);
      else next.add(handle);
      if (!wasFollowing) {
        const t = setTimeout(() => {
          addNotification({ type: "follow", actor: handle, postId: null, text: null, time: "now" });
          setProfiles((p) => ({ ...p, you: { ...p.you, followers: p.you.followers + 1 } }));
        }, 2600 + Math.random() * 2200);
        timersRef.current.push(t);
      }
      return next;
    });
  const voteOnPoll = votePoll;

  const postDraft = async () => {
    const text = draft.trim();
    const pollValid = draftPoll && draftPoll.options.filter((o) => o.trim()).length >= 2;
    if ((!text && !draftImage && !pollValid) || draft.length > MAX_POST_LENGTH) return;
    const pollOptions = pollValid ? draftPoll.options.filter((o) => o.trim()).map((o) => o.trim()) : null;
    const isVideo = draftImageFile && draftImageFile.type.startsWith("video");
    setDraft("");
    setDraftImage(null);
    setDraftImageFile(null);
    setDraftPoll(null);
    await createPost({
      text,
      imageFile: isVideo ? null : draftImageFile,
      videoFile: isVideo ? draftImageFile : null,
      pollOptions,
      quotedPostId: null,
    });
  };

  const [reportedPosts, setReportedPosts] = useState(new Set());
  const [reportedProfiles, setReportedProfiles] = useState(new Set());
  const reportPost = (id, reason) => setReportedPosts((prev) => new Set(prev).add(id));
  const reportProfile = (handle, reason) => setReportedProfiles((prev) => new Set(prev).add(handle));

  const [lists, setLists] = useState({});
  const createList = (name) => {
    const id = nextId();
    setLists((prev) => ({ ...prev, [id]: { id, name, members: [] } }));
  };
  const deleteList = (id) =>
    setLists((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  const addListMember = (listId, handle) =>
    setLists((prev) => {
      const l = prev[listId];
      if (!l || l.members.includes(handle)) return prev;
      return { ...prev, [listId]: { ...l, members: [...l.members, handle] } };
    });
  const removeListMember = (listId, handle) =>
    setLists((prev) => {
      const l = prev[listId];
      if (!l) return prev;
      return { ...prev, [listId]: { ...l, members: l.members.filter((h) => h !== handle) } };
    });

  const submitQuote = async (postId, text, imageFile) => {
    await createPost({ text, imageFile, videoFile: null, pollOptions: null, quotedPostId: postId });
    goFeed();
  };

  const goFeed = () => setView({ type: "feed" });
  const goProfile = (handle) => setView({ type: "profile", handle });
  const goPost = (id) => setView({ type: "post", id });
  const goSearch = (initialQuery) => {
    setSearchQuery(initialQuery || "");
    setView({ type: "search" });
  };
  const goNotifications = () => setView({ type: "notifications" });
  const goMessages = () => setView({ type: "messages" });
  const goConversation = (handle) => setView({ type: "dm", handle });
  const goGroup = (id) => setView({ type: "group", id });
  const goQuote = (postId) => setView({ type: "quote", postId });
  const goBookmarks = () => setView({ type: "bookmarks" });
  const goSettings = () => setView({ type: "settings" });
  const goLists = () => setView({ type: "lists" });
  const goList = (id) => setView({ type: "list", id });
  const goAnalytics = (id) => setView({ type: "analytics", id });

  const viewKey = `${view.type}-${view.handle || view.id || view.postId || ""}`;

  const [showShortcuts, setShowShortcuts] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if (!authed) return;
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/") {
        e.preventDefault();
        goSearch("");
      } else if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      } else if (e.key === "Escape") {
        if (showShortcuts) setShowShortcuts(false);
        else if (view.type !== "feed") goFeed();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.type, showShortcuts, authed]);

  // NOTE — migration status: auth (step 1 of MIGRATION.md) is now real, via
  // Supabase. Posts/social/messages/notifications (steps 2–5) still live in
  // local component state below (SEED_POSTS, etc.) rather than window.storage
  // (an artifact-only API that doesn't exist in a real deployed app, so it was
  // removed rather than ported) — that state resets on refresh until those
  // hooks (usePosts/useSocial/useMessages/useNotifications, already written in
  // src/hooks/) get wired in the same way auth was. See MIGRATION.md.

  return (
    <ProfilesContext.Provider value={{ profiles, updateProfile, isMobile }}>
    <div className="murmur-root" style={{ background: PALETTE.bg, minHeight: "100vh", fontFamily: "'IBM Plex Sans', sans-serif", transition: "background 0.15s" }}>
      <link rel="stylesheet" href={FONT_IMPORT_URL} />
      <style>{`
        html, body {
          background: ${THEMES[theme].bg};
          min-height: 100%;
          transition: background 0.15s;
        }
        .murmur-root {
          --m-bg: ${THEMES[theme].bg};
          --m-card: ${THEMES[theme].card};
          --m-ink: ${THEMES[theme].ink};
          --m-inkSoft: ${THEMES[theme].inkSoft};
          --m-border: ${THEMES[theme].border};
          --m-coral: ${THEMES[theme].coral};
          --m-coralSoft: ${THEMES[theme].coralSoft};
          --m-teal: ${THEMES[theme].teal};
          --m-tealSoft: ${THEMES[theme].tealSoft};
          --m-gold: ${THEMES[theme].gold};
        }
        .murmur-author:hover .murmur-author-name { text-decoration: underline; }
        @keyframes murmur-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 0.8; } }
        @keyframes murmur-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .murmur-view-fade { animation: murmur-fadein 0.22s ease; }
        .murmur-root *:focus-visible {
          outline: 2px solid ${THEMES[theme].teal};
          outline-offset: 2px;
          border-radius: 4px;
        }
      `}</style>

      {authLoading ? (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }} aria-busy="true" aria-label="Loading Murmur">
          <div style={{ animation: "murmur-pulse 1.4s ease-in-out infinite" }}>
            <FlockMark size={32} />
          </div>
        </div>
      ) : !authed ? (
        <AuthPage onSignUp={signUp} onLogIn={logIn} theme={theme} />
      ) : (
      <>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: isMobile ? "0 10px" : "0 16px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 4px 16px" }}>
          <div
            onClick={goFeed}
            role="button"
            tabIndex={0}
            aria-label="Murmur home"
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goFeed(); } }}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          >
            <FlockMark />
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: isMobile ? 19 : 22, color: PALETTE.ink }}>Murmur</span>
          </div>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
            <button
              onClick={() => goSearch("")}
              aria-label="Search"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%",
                border: `1px solid ${PALETTE.border}`, background: view.type === "search" ? PALETTE.tealSoft : "transparent",
                color: view.type === "search" ? PALETTE.teal : PALETTE.inkSoft, cursor: "pointer",
              }}
            >
              <Search size={16} />
            </button>
            <div style={{ position: "relative" }}>
              <button
                onClick={goNotifications}
                aria-label="Notifications"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%",
                  border: `1px solid ${PALETTE.border}`, background: view.type === "notifications" ? PALETTE.tealSoft : "transparent",
                  color: view.type === "notifications" ? PALETTE.teal : PALETTE.inkSoft, cursor: "pointer",
                }}
              >
                <Bell size={16} />
              </button>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 999,
                    background: PALETTE.coral, color: "#FFF7F2", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", lineHeight: 1,
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <button
                onClick={goMessages}
                aria-label="Messages"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%",
                  border: `1px solid ${PALETTE.border}`, background: (view.type === "messages" || view.type === "dm" || view.type === "group") ? PALETTE.tealSoft : "transparent",
                  color: (view.type === "messages" || view.type === "dm" || view.type === "group") ? PALETTE.teal : PALETTE.inkSoft, cursor: "pointer",
                }}
              >
                <Mail size={16} />
              </button>
              {totalUnreadDMs > 0 && (
                <span
                  style={{
                    position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 999,
                    background: PALETTE.coral, color: "#FFF7F2", fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", lineHeight: 1,
                  }}
                >
                  {totalUnreadDMs > 9 ? "9+" : totalUnreadDMs}
                </span>
              )}
            </div>
            <button
              onClick={goBookmarks}
              aria-label="Bookmarks"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%",
                border: `1px solid ${PALETTE.border}`, background: view.type === "bookmarks" ? PALETTE.tealSoft : "transparent",
                color: view.type === "bookmarks" ? PALETTE.teal : PALETTE.inkSoft, cursor: "pointer",
              }}
            >
              <Bookmark size={16} fill={bookmarks.size > 0 ? "currentColor" : "none"} />
            </button>
          </span>
        </header>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexDirection: isMobile ? "column" : "row" }}>
          <main key={viewKey} className="murmur-view-fade" style={{ flex: 1, minWidth: 0 }}>
            {view.type === "feed" && (
              <Feed
                posts={visiblePosts}
                onLike={toggleLike}
                onRepost={toggleRepost}
                onOpenPost={goPost}
                onOpenProfile={goProfile}
                draft={draft}
                setDraft={setDraft}
                draftImage={draftImage}
                setDraftImage={setDraftImage}
                setDraftImageFile={setDraftImageFile}
                postDraft={postDraft}
                onLoadMore={loadMore}
                loadingMore={loadingMore}
                reachedEnd={reachedEnd}
                feedTab={feedTab}
                setFeedTab={setFeedTab}
                following={following}
                onQuote={goQuote}
                onEdit={editPost}
                onDelete={deletePost}
                onBookmark={toggleBookmark}
                bookmarks={bookmarks}
                onSearch={goSearch}
                onVote={voteOnPoll}
                draftPoll={draftPoll}
                setDraftPoll={setDraftPoll}
                pinnedPostId={pinnedPostId}
                onTogglePin={togglePin}
                onReport={reportPost}
                reportedPosts={reportedPosts}
              />
            )}
            {view.type === "profile" && (
              <ProfilePage
                handle={view.handle}
                posts={posts}
                onLike={toggleLike}
                onRepost={toggleRepost}
                onOpenPost={goPost}
                onOpenProfile={goProfile}
                onBack={goFeed}
                coverImage={view.handle === "you" ? coverImage : null}
                setCoverImage={setCoverImage}
                isFollowing={following.has(view.handle)}
                onToggleFollow={() => toggleFollow(view.handle)}
                followingCount={following.size}
                onMessage={() => goConversation(view.handle)}
                onQuote={goQuote}
                onEdit={editPost}
                onDelete={deletePost}
                onBookmark={toggleBookmark}
                bookmarks={bookmarks}
                isBlocked={blocked.has(view.handle)}
                isMuted={muted.has(view.handle)}
                onToggleBlock={() => toggleBlock(view.handle)}
                onToggleMute={() => toggleMute(view.handle)}
                onOpenSettings={goSettings}
                onSearch={goSearch}
                onVote={voteOnPoll}
                pinnedPostId={pinnedPostId}
                onTogglePin={togglePin}
                onReport={reportPost}
                reportedPosts={reportedPosts}
                onReportProfile={reportProfile}
                reportedProfiles={reportedProfiles}
                onViewAnalytics={goAnalytics}
              />
            )}
            {view.type === "post" && (
              <PostPage
                postId={view.id} currentUserId={user?.id} onLike={toggleLike} onRepost={toggleRepost} onOpenProfile={goProfile} onBack={goFeed}
                onQuote={goQuote} onEdit={editPost} onDelete={deletePost} onBookmark={toggleBookmark}
                blocked={blocked} onSearch={goSearch} onVote={voteOnPoll} onTogglePin={togglePin}
                onViewAnalytics={goAnalytics} onReport={reportPost} reportedPosts={reportedPosts}
              />
            )}
            {view.type === "analytics" && (
              <PostAnalyticsPage postId={view.id} posts={posts} onBack={goFeed} />
            )}
            {view.type === "search" && (
              <SearchPage
                query={searchQuery}
                setQuery={setSearchQuery}
                posts={visiblePosts}
                onLike={toggleLike}
                onRepost={toggleRepost}
                onOpenPost={goPost}
                onOpenProfile={goProfile}
                following={following}
                onToggleFollow={toggleFollow}
                onBack={goFeed}
                onQuote={goQuote}
                onEdit={editPost}
                onDelete={deletePost}
                onBookmark={toggleBookmark}
                bookmarks={bookmarks}
                blocked={blocked}
                onSearch={goSearch}
                onVote={voteOnPoll}
                pinnedPostId={pinnedPostId}
                onTogglePin={togglePin}
                onReport={reportPost}
                reportedPosts={reportedPosts}
              />
            )}
            {view.type === "notifications" && (
              <NotificationsPage
                notifications={visibleNotifications}
                onOpenPost={goPost}
                onOpenProfile={goProfile}
                onBack={goFeed}
                markAllRead={markAllRead}
              />
            )}
            {view.type === "messages" && (
              <MessagesPage
                conversations={visibleConversations}
                groupChats={visibleGroupChats}
                onOpenConversation={goConversation}
                onOpenGroup={goGroup}
                onCreateGroup={createGroup}
                blocked={blocked}
                onBack={goFeed}
              />
            )}
            {view.type === "dm" && (
              <ConversationPage
                key={view.handle}
                handle={view.handle}
                conversations={conversations}
                onSend={sendMessage}
                onOpenProfile={goProfile}
                onBack={goMessages}
                markRead={markConversationRead}
                blocked={blocked}
                typingIndicator={typingIndicator}
              />
            )}
            {view.type === "group" && (
              <GroupChatPage
                key={view.id}
                groupId={view.id}
                groupChats={groupChats}
                onSend={sendGroupMessage}
                onOpenProfile={goProfile}
                onBack={goMessages}
                markRead={markGroupRead}
                typingIndicator={typingIndicator}
              />
            )}
            {view.type === "quote" && (
              <QuotePage postId={view.postId} posts={posts} profiles={profiles} onSubmit={submitQuote} onBack={goFeed} />
            )}
            {view.type === "bookmarks" && (
              <BookmarksPage
                posts={visiblePosts}
                bookmarks={bookmarks}
                onLike={toggleLike}
                onRepost={toggleRepost}
                onOpenPost={goPost}
                onOpenProfile={goProfile}
                onQuote={goQuote}
                onEdit={editPost}
                onDelete={deletePost}
                onBookmark={toggleBookmark}
                onBack={goFeed}
                onSearch={goSearch}
                onVote={voteOnPoll}
                pinnedPostId={pinnedPostId}
                onTogglePin={togglePin}
                onReport={reportPost}
                reportedPosts={reportedPosts}
              />
            )}
            {view.type === "settings" && (
              <SettingsPage
                blocked={blocked}
                muted={muted}
                onUnblock={toggleBlock}
                onUnmute={toggleMute}
                onOpenProfile={goProfile}
                onBack={goFeed}
                notificationPrefs={notificationPrefs}
                onToggleNotificationPref={toggleNotificationPref}
                theme={theme}
                onSetTheme={setTheme}
                onOpenLists={goLists}
                listCount={Object.keys(lists).length}
              />
            )}
            {view.type === "lists" && (
              <ListsPage lists={lists} onOpenList={goList} onCreateList={createList} onBack={goSettings} />
            )}
            {view.type === "list" && (
              <ListDetailPage
                listId={view.id}
                lists={lists}
                posts={visiblePosts}
                onLike={toggleLike}
                onRepost={toggleRepost}
                onOpenPost={goPost}
                onOpenProfile={goProfile}
                onQuote={goQuote}
                onEdit={editPost}
                onDelete={deletePost}
                onBookmark={toggleBookmark}
                bookmarks={bookmarks}
                onSearch={goSearch}
                onVote={voteOnPoll}
                pinnedPostId={pinnedPostId}
                onTogglePin={togglePin}
                onAddMember={addListMember}
                onRemoveMember={removeListMember}
                onDeleteList={deleteList}
                onBack={goLists}
                blocked={blocked}
                onReport={reportPost}
                reportedPosts={reportedPosts}
              />
            )}
          </main>

          {view.type === "feed" && trends.length > 0 && (
            <aside style={{ width: isMobile ? "100%" : 240, flexShrink: 0 }}>
              <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Sparkles size={14} color={PALETTE.gold} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 0.4, color: PALETTE.inkSoft }}>IN THE FLOCK</span>
                </div>
                {trends.map((t, i) => (
                  <div
                    key={t.tag}
                    onClick={() => goSearch(t.query)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goSearch(t.query); } }}
                    style={{ padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${PALETTE.border}`, cursor: "pointer" }}
                  >
                    <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14.5, color: PALETTE.ink }}>{t.tag}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, color: PALETTE.inkSoft }}>{t.posts}</div>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>

      {showShortcuts && (
        <div
          onClick={() => setShowShortcuts(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 14, padding: 22, maxWidth: 320, width: "100%" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 17, color: PALETTE.ink }}>Keyboard shortcuts</span>
              <button onClick={() => setShowShortcuts(false)} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", color: PALETTE.inkSoft, display: "flex" }}>
                <X size={18} />
              </button>
            </div>
            {[
              ["j / k", "Move down / up the feed"],
              ["Enter / o", "Open selected murmur"],
              ["l", "Like selected murmur"],
              ["/", "Jump to search"],
              ["Esc", "Back to feed"],
              ["?", "Toggle this menu"],
            ].map(([key, desc]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0" }}>
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13.5, color: PALETTE.ink }}>{desc}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: PALETTE.inkSoft, background: PALETTE.bg, border: `1px solid ${PALETTE.border}`, borderRadius: 6, padding: "2px 8px" }}>
                  {key}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}
    </div>
    </ProfilesContext.Provider>
  );
}
