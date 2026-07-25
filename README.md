# Cohort Comms — Talk. Ship. Repeat.

Real-time communications platform for the Hult Cohort Developer Program Summer Pilot 2026.

**Production URL:** _(deployed on Vercel — update after deploy)_

## Features

**Real-time chat:**
- Live messaging with Supabase Realtime (instant delivery, no refresh)
- Typing indicators (animated dots show who's typing)
- User presence (online/away/offline with color-coded status dots)
- Emoji reactions on messages (👍 ❤️ 😂 🎉 🚀 👀)
- Message deletion for your own messages

**Async threads:**
- Reply to any message to start a threaded conversation
- Thread panel opens alongside the main chat
- Thread-board channels for structured discussions

**Channels:**
- 6 default channels: #general, #announcements, #random, #help, #show-and-tell, #ideas
- Create custom channels with emoji and type (chat/announcement/thread-board)
- Channel categories in sidebar

**Members:**
- Collapsible members panel with online/away/offline grouping
- Colorful avatar initials with unique colors per user
- Live presence updates

**Design:**
- Dark-first UI with vivid purple/teal/pink gradient accents
- Smooth animations (fade-in messages, slide-in sidebar)
- Mobile responsive with hamburger nav
- Custom scrollbar styling

## Architecture

```
Next.js 16 (App Router) + Tailwind CSS
         ↓
   Supabase Auth (email/password)
         ↓
   Supabase Realtime (live message streaming)
         ↓
   Supabase Postgres
   ├─ profiles (auto-created, presence tracking)
   ├─ channels (chat/announcement/thread-board)
   ├─ messages (with parent_id for threads)
   ├─ reactions (emoji per user per message)
   ├─ channel_members (read state tracking)
   └─ typing_indicators (ephemeral)
         ↓
   Row Level Security on all tables
         ↓
   Vercel (production deploy)
```

## Setup

1. Clone and install:
   ```bash
   git clone <repo> && cd cohort-comms
   npm install
   ```

2. Create a Supabase project (or reuse existing)

3. Run `supabase/schema.sql` in Supabase SQL Editor

4. Copy `.env.example` → `.env.local` with your Supabase URL + anon key

5. (Optional) Seed demo data:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your-key node supabase/seed.mjs
   ```

6. Run: `npm run dev` → http://localhost:3000

## Demo accounts

All use password `demo1234`:
- alex@demo.comms (Alex Chen)
- priya@demo.comms (Priya Sharma)
- marcus@demo.comms (Marcus Johnson)
- sofia@demo.comms (Sofia Martinez)
- yuki@demo.comms (Yuki Tanaka)

## Known limitations

- No email notifications
- No file/image uploads
- No voice channels
- No message search
- PM platform integration not yet implemented
- Typing indicator cleanup is client-side only
