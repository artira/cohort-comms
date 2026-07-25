// Run: SUPABASE_SERVICE_ROLE_KEY=your-key node supabase/seed.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('\n❌ Set SUPABASE_SERVICE_ROLE_KEY (Dashboard → Settings → API → service_role)\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const USERS = [
  { email: 'alex@demo.comms', name: 'Alex Chen', color: '#6c5ce7' },
  { email: 'priya@demo.comms', name: 'Priya Sharma', color: '#00b894' },
  { email: 'marcus@demo.comms', name: 'Marcus Johnson', color: '#fd79a8' },
  { email: 'sofia@demo.comms', name: 'Sofia Martinez', color: '#00cec9' },
  { email: 'yuki@demo.comms', name: 'Yuki Tanaka', color: '#f39c12' },
];

async function seed() {
  console.log('🌱 Seeding comms demo data...\n');

  const userIds = [];
  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email, password: 'demo1234', email_confirm: true,
      user_metadata: { display_name: u.name },
    });
    if (error?.message?.includes('already')) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users?.find(x => x.email === u.email);
      userIds.push(existing?.id || null);
      console.log(`  ⏭ ${u.name} exists`);
    } else if (error) {
      console.error(`  ❌ ${u.name}: ${error.message}`);
      userIds.push(null);
    } else {
      userIds.push(data.user.id);
      console.log(`  ✅ ${u.name} created`);
    }
  }

  // Set avatar colors
  for (let i = 0; i < USERS.length; i++) {
    if (userIds[i]) {
      await supabase.from('profiles').update({ avatar_color: USERS[i].color, status: 'online' }).eq('id', userIds[i]);
    }
  }

  // Get channels
  const { data: channels } = await supabase.from('channels').select('id, name');
  const ch = (name) => channels?.find(c => c.name === name)?.id;

  // Seed messages
  const msgs = [
    { channel: 'general', user: 0, body: 'Hey everyone! Excited to kick off the comms platform 🚀' },
    { channel: 'general', user: 1, body: 'Same here! This looks way better than Discord already.' },
    { channel: 'general', user: 2, body: 'Love the dark theme. Very clean.' },
    { channel: 'general', user: 3, body: 'Who else is working on the PM integration?' },
    { channel: 'general', user: 4, body: 'The real-time is super smooth — typing indicators are a nice touch' },
    { channel: 'announcements', user: 0, body: '📢 Week 2 deadline: Sunday 17:00 ET. Make sure your PR is merged!' },
    { channel: 'announcements', user: 3, body: '📢 Peer reviews due Monday 14:00 ET. 66 reviews required.' },
    { channel: 'random', user: 2, body: 'Anyone else running on pure caffeine at this point? ☕' },
    { channel: 'random', user: 4, body: 'I switched to matcha. Game changer.' },
    { channel: 'random', user: 1, body: 'Real talk — tabs or spaces?' },
    { channel: 'random', user: 0, body: 'Tabs. Fight me.' },
    { channel: 'help', user: 3, body: 'How do I enable Supabase Realtime on a table?' },
    { channel: 'help', user: 0, body: 'ALTER PUBLICATION supabase_realtime ADD TABLE your_table; — run it in SQL Editor' },
    { channel: 'show-and-tell', user: 1, body: '🚀 Just shipped the kanban board with drag-and-drop! Check it out at pm-artira-azure.vercel.app' },
    { channel: 'show-and-tell', user: 4, body: '🚀 Dark mode toggle is live — cycles between system/light/dark' },
    { channel: 'ideas', user: 2, body: '💡 What if we added voice channels? Like a mini Discord.' },
    { channel: 'ideas', user: 3, body: '💡 GitHub webhook that posts to #announcements when a PR is merged' },
  ];

  for (const m of msgs) {
    const channelId = ch(m.channel);
    const userId = userIds[m.user];
    if (channelId && userId) {
      await supabase.from('messages').insert({ channel_id: channelId, author_id: userId, body: m.body });
    }
  }
  console.log(`\n💬 ${msgs.length} messages seeded`);

  // Add reactions to first few messages
  const { data: allMsgs } = await supabase.from('messages').select('id').order('created_at').limit(6);
  if (allMsgs) {
    const rxns = [
      { msg: 0, user: 1, emoji: '🚀' }, { msg: 0, user: 2, emoji: '🚀' }, { msg: 0, user: 3, emoji: '🎉' },
      { msg: 1, user: 0, emoji: '❤️' }, { msg: 1, user: 4, emoji: '👍' },
      { msg: 4, user: 0, emoji: '👀' }, { msg: 4, user: 3, emoji: '🔥' },
    ];
    for (const r of rxns) {
      if (allMsgs[r.msg] && userIds[r.user]) {
        await supabase.from('reactions').upsert({ message_id: allMsgs[r.msg].id, user_id: userIds[r.user], emoji: r.emoji });
      }
    }
    console.log('⭐ Reactions added');
  }

  console.log('\n✨ Done! Login: alex@demo.comms / demo1234\n');
}

seed().catch(console.error);
