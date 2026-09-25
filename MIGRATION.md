# Wiring these hooks into the real project

The hooks in `hooks/` are complete and ready to use — but **not inside the
Claude artifact**. That file is a single self-contained blob with no bundler
behind it, so it can't `import` these as separate local files the way a real
Vite or Next.js project can. This doc is the map for when you've copied
`murmur.jsx`'s component code into an actual multi-file project (the one
you'd deploy to Vercel/Netlify per the hosting conversation) and wired up
`npm install @supabase/supabase-js`.

The good news: because of the profile-cache aliasing trick (any UUID that's
actually you gets cached under the slug `"you"`), **none of the ~20 UI
components** (`Post`, `ReplyThread`, `ProfilePage`, `SettingsPage`, etc.)
need to change at all. Every place they do `post.author === "you"`,
`profiles.you`, `handle === "you"` keeps working exactly as written. Only
the top of the `Murmur` component — the state declarations and handler
functions — gets swapped.

## 1. Auth gate

**Delete:**
```js
const [authed, setAuthed] = useState(false);
const handleAuth = ({ mode, name }) => { ... };
```

**Replace with:**
```js
import { useAuth } from "./hooks/useAuth";
import { setCurrentUser } from "./hooks/profileCache";

const { user, authed, authLoading, signUp, logIn } = useAuth();
useEffect(() => { setCurrentUser(user?.id ?? null); }, [user]);
```

`AuthPage`'s `onAuth` prop becomes two real async calls instead of one fake
one — update its submit handler to call `signUp({ name, email, password })`
or `logIn({ email, password })` depending on `mode`, and show
`error.message` from a caught rejection in the existing `errors` state
(wrong password, email already registered, etc. — these are now real
errors from Supabase Auth, not just the client-side format checks that are
already there).

The `!hydrated` loading screen becomes `!authLoading` from the hook instead
of the `window.storage` hydration check.

## 2. Posts / feed

**Delete:** `posts` state, `postDraft`, `toggleLike`, `toggleRepost`,
`toggleBookmark`, `togglePin`, `editPost`, `deletePost`, `voteOnPoll`,
`GEN_AUTHORS`/`generatePost` (the fake infinite-scroll generator — real
pagination replaces it), and the two `setTimeout`-based simulations
(nobody needs a fake reply-arrives-later timer once real other users exist).

**Replace with:**
```js
import { usePosts, usePostDetail } from "./hooks/usePosts";

const {
  posts, loading, reachedEnd, loadMore,
  createPost, editPost, deletePost, togglePin,
  toggleLike, toggleRepost, toggleBookmark, votePoll,
} = usePosts(user?.id);
```

`postDraft()`'s body becomes a call to `createPost({ text, imageFile,
videoFile, pollOptions, quotedPostId })` — note it now takes a raw `File`
object (from the `<input type="file">`), not a base64 string, since
`usePosts` uploads to Storage internally. `PhotoPicker` currently reads the
file into a data URL for the preview — keep that part (it's still useful
for the local preview thumbnail) but pass the original `File` through
separately for upload.

Post detail / thread view: `PostPage`'s local `post` lookup
(`posts.find(p => p.id === postId)`) becomes:
```js
const { post, loading, addReply } = usePostDetail(postId);
```

## 3. Follows / blocks / mutes / lists

**Delete:** the `following`, `blocked`, `muted`, `lists`, `pinnedPostId`
state and their toggle handlers.

**Replace with:**
```js
import { useSocial } from "./hooks/useSocial";

const {
  following, blocked, muted, lists,
  toggleFollow, toggleBlock, toggleMute,
  reportPost, reportProfile,
  createList, deleteList, addListMember, removeListMember,
} = useSocial(user?.id);
```

These are already `Set`s of slugs, same shape the components already
expect — `following.has(handle)` works unchanged.

## 4. DMs / group chats

**Delete:** `conversations`, `groupChats`, `sendMessage`,
`sendGroupMessage`, `createGroup`, `typingIndicator` state and the
`setTimeout`-simulated replies.

**Replace with:**
```js
import { useMessages } from "./hooks/useMessages";

const {
  conversations, groupChats, typingIndicator,
  sendMessage, sendGroupMessage, createGroup, markRead, useTypingChannel,
} = useMessages(user?.id);
```

Inside `ConversationPage`/`GroupChatPage`, call
`const sendTyping = useTypingChannel(conversationId)` and fire
`sendTyping()` from the composer's `onChange` — this is a **real** typing
signal between two actual browser tabs now, not a fake timer.

## 5. Notifications

**Replace** the `notifications` state + `markAllRead` + the
`setTimeout`-simulated arrivals with:
```js
import { useNotifications } from "./hooks/useNotifications";

const { notifications, unreadCount, markAllRead } = useNotifications(user?.id, notificationPrefs);
```

## 6. What's intentionally unchanged

`theme`, `notificationPrefs`, `isMobile`, `view` (navigation), `draft`
(compose text box state), and all the keyboard-shortcut/accessibility work
stay exactly as they are — none of that is data that needs a backend.

## Suggested order to actually do this in

Don't do all six at once. Auth first (get real login working, verify it in
the browser), then posts (the biggest and most central), then the rest —
each one is independently testable once auth works, since they all key off
`user?.id`.
