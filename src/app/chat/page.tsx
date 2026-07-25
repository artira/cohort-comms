'use client';

import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useConfetti, ConfettiCanvas } from '@/components/Confetti';

type Channel = { id: string; name: string; description: string | null; type: string; emoji: string; created_by: string | null; is_default: boolean; archived?: boolean };
type Profile = { id: string; display_name: string; avatar_color: string; status: string; email: string; is_admin?: boolean };
type Message = {
  id: string; channel_id: string; author_id: string; body: string; parent_id: string | null;
  is_thread_starter: boolean; created_at: string; edited_at: string | null;
  profiles?: { display_name: string; avatar_color: string } | null;
};
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };
type DirectMessage = { id: string; sender_id: string; recipient_id: string; body: string; read: boolean; created_at: string; profiles?: { display_name: string; avatar_color: string } | null };

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🚀', '👀'];

export default function ChatPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [members, setMembers] = useState<Profile[]>([]);
  const [input, setInput] = useState('');
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [threadInput, setThreadInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('chat');
  const [newChannelEmoji, setNewChannelEmoji] = useState('💬');
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { particles, celebrate } = useConfetti();
  const [emojiRain, setEmojiRain] = useState<{ id: number; emoji: string; left: number; duration: number }[]>([]);
  const [partyMode, setPartyMode] = useState(false);

  // DM state
  const [view, setView] = useState<'channel' | 'dm'>('channel');
  const [dmRecipient, setDmRecipient] = useState<Profile | null>(null);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [dmInput, setDmInput] = useState('');

  // Mobile panels
  const [mobilePanel, setMobilePanel] = useState<'none' | 'thread' | 'members'>('none');

  useEffect(() => { if (!loading && !user) router.replace('/auth'); }, [user, loading, router]);

  // Load channels and members
  useEffect(() => {
    if (!user) return;
    supabase.from('channels').select('*').order('created_at').then(({ data }) => {
      if (data) { setChannels(data); if (!activeChannel) setActiveChannel(data[0]); }
    });
    supabase.from('profiles').select('*').then(({ data }) => { if (data) setMembers(data); });
  }, [user]);

  // Load messages for active channel
  const loadMessages = useCallback(async () => {
    if (!activeChannel) return;
    const { data } = await supabase.from('messages').select('*, profiles(display_name, avatar_color)')
      .eq('channel_id', activeChannel.id).is('parent_id', null).order('created_at', { ascending: true }).limit(200);
    if (data) setMessages(data);

    // Load reactions for these messages
    if (data && data.length > 0) {
      const msgIds = data.map(m => m.id);
      const { data: rxns } = await supabase.from('reactions').select('*').in('message_id', msgIds);
      if (rxns) {
        const grouped: Record<string, Reaction[]> = {};
        rxns.forEach(r => { (grouped[r.message_id] ||= []).push(r); });
        setReactions(grouped);
      }
    }
  }, [activeChannel]);

  useEffect(() => { loadMessages(); }, [loadMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Real-time messages subscription
  useEffect(() => {
    if (!activeChannel) return;
    const sub = supabase.channel(`msgs-${activeChannel.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannel.id}` },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (!newMsg.parent_id) {
            const { data: enriched } = await supabase.from('messages').select('*, profiles(display_name, avatar_color)').eq('id', newMsg.id).single();
            if (enriched) setMessages(prev => [...prev, enriched]);
          } else if (threadParent && newMsg.parent_id === threadParent.id) {
            const { data: enriched } = await supabase.from('messages').select('*, profiles(display_name, avatar_color)').eq('id', newMsg.id).single();
            if (enriched) setThreadMessages(prev => [...prev, enriched]);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeChannel, threadParent]);

  // Typing indicators
  useEffect(() => {
    if (!activeChannel || !user) return;
    const sub = supabase.channel(`typing-${activeChannel.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_indicators', filter: `channel_id=eq.${activeChannel.id}` },
        () => {
          supabase.from('typing_indicators').select('user_id').eq('channel_id', activeChannel.id).neq('user_id', user.id)
            .then(({ data }) => {
              if (data) setTypingUsers(data.map(d => {
                const m = members.find(p => p.id === d.user_id);
                return m?.display_name || 'Someone';
              }));
            });
        })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [activeChannel, user, members]);

  function handleTyping() {
    if (!activeChannel || !user) return;
    supabase.from('typing_indicators').upsert({ channel_id: activeChannel.id, user_id: user.id, started_at: new Date().toISOString() }).then(() => {});
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      supabase.from('typing_indicators').delete().eq('channel_id', activeChannel.id).eq('user_id', user.id).then(() => {});
    }, 3000);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeChannel || !user) return;
    const body = input.trim();
    setInput('');
    await supabase.from('typing_indicators').delete().eq('channel_id', activeChannel.id).eq('user_id', user.id);

    // Slash commands
    if (body === '/confetti' || body === '/celebrate') {
      celebrate('confetti');
      await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body: '🎉🎊 Let\'s celebrate! 🎊🎉' });
      return;
    }
    if (body === '/firework' || body === '/fireworks') {
      celebrate('firework');
      await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body: '🎆✨ Fireworks! ✨🎆' });
      return;
    }
    if (body === '/party') {
      setPartyMode(true);
      celebrate('confetti');
      triggerEmojiRain('🎉');
      await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body: '🥳🪩 PARTY MODE ACTIVATED 🪩🥳' });
      setTimeout(() => setPartyMode(false), 10000);
      return;
    }
    if (body === '/rain') {
      triggerEmojiRain('🌧️');
      await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body: '🌧️ Making it rain! 🌧️' });
      return;
    }
    if (body === '/hearts') {
      triggerEmojiRain('❤️');
      await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body: '❤️💕 Sending love! 💕❤️' });
      return;
    }
    if (body === '/rockets') {
      triggerEmojiRain('🚀');
      celebrate('firework');
      await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body: '🚀🚀🚀 TO THE MOON! 🚀🚀🚀' });
      return;
    }
    if (body === '/help' || body === '/commands') {
      await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body: '✨ Fun commands: /confetti · /fireworks · /party · /rain · /hearts · /rockets' });
      return;
    }

    // Auto-celebrate on milestone words
    if (body.toLowerCase().includes('shipped') || body.toLowerCase().includes('launched') || body.toLowerCase().includes('merged')) {
      celebrate('confetti');
    }

    await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body });
  }

  function triggerEmojiRain(emoji: string) {
    const drops = Array.from({ length: 25 }, (_, i) => ({
      id: Date.now() + i,
      emoji,
      left: Math.random() * 100,
      duration: 2 + Math.random() * 3,
    }));
    setEmojiRain(drops);
    setTimeout(() => setEmojiRain([]), 5000);
  }

  async function sendThreadReply(e: React.FormEvent) {
    e.preventDefault();
    if (!threadInput.trim() || !threadParent || !user || !activeChannel) return;
    const body = threadInput.trim();
    setThreadInput('');
    await supabase.from('messages').insert({ channel_id: activeChannel.id, author_id: user.id, body, parent_id: threadParent.id });
  }

  async function openThread(msg: Message) {
    setThreadParent(msg);
    const { data } = await supabase.from('messages').select('*, profiles(display_name, avatar_color)')
      .eq('parent_id', msg.id).order('created_at', { ascending: true });
    setThreadMessages(data || []);
  }

  async function toggleReaction(msgId: string, emoji: string) {
    if (!user) return;
    const existing = reactions[msgId]?.find(r => r.user_id === user.id && r.emoji === emoji);
    if (existing) {
      await supabase.from('reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('reactions').insert({ message_id: msgId, user_id: user.id, emoji });
    }
    // Reload reactions for this message
    const { data } = await supabase.from('reactions').select('*').eq('message_id', msgId);
    setReactions(prev => ({ ...prev, [msgId]: data || [] }));
  }

  async function createChannel() {
    if (!newChannelName.trim() || !user) return;
    await supabase.from('channels').insert({ name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'), type: newChannelType, emoji: newChannelEmoji, created_by: user.id });
    const { data } = await supabase.from('channels').select('*').order('created_at');
    if (data) setChannels(data);
    setShowNewChannel(false);
    setNewChannelName('');
  }

  async function deleteMessage(msgId: string) {
    await supabase.from('messages').delete().eq('id', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  }

  // DM functions
  async function openDm(recipient: Profile) {
    setView('dm');
    setDmRecipient(recipient);
    setThreadParent(null);
    setMobilePanel('none');
    setShowMobileSidebar(false);
    const { data } = await supabase.from('direct_messages')
      .select('*, profiles:sender_id(display_name, avatar_color)')
      .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
      .or(`sender_id.eq.${recipient.id},recipient_id.eq.${recipient.id}`)
      .order('created_at', { ascending: true });
    // Filter to only this conversation
    const filtered = (data || []).filter(dm =>
      (dm.sender_id === user!.id && dm.recipient_id === recipient.id) ||
      (dm.sender_id === recipient.id && dm.recipient_id === user!.id)
    );
    setDmMessages(filtered);
    // Mark as read
    await supabase.from('direct_messages').update({ read: true }).eq('recipient_id', user!.id).eq('sender_id', recipient.id);
  }

  async function sendDm(e: React.FormEvent) {
    e.preventDefault();
    if (!dmInput.trim() || !dmRecipient || !user) return;
    const body = dmInput.trim();
    setDmInput('');
    await supabase.from('direct_messages').insert({ sender_id: user.id, recipient_id: dmRecipient.id, body });
    // Reload
    openDm(dmRecipient);
  }

  function switchToChannel(ch: Channel) {
    setView('channel');
    setActiveChannel(ch);
    setDmRecipient(null);
    setShowMobileSidebar(false);
    setThreadParent(null);
    setMobilePanel('none');
  }

  // Channel management
  async function renameChannel(channelId: string, newName: string) {
    await supabase.from('channels').update({ name: newName.toLowerCase().replace(/\s+/g, '-') }).eq('id', channelId);
    const { data } = await supabase.from('channels').select('*').order('created_at');
    if (data) setChannels(data);
  }

  async function archiveChannel(channelId: string) {
    await supabase.from('channels').update({ archived: true }).eq('id', channelId);
    const { data } = await supabase.from('channels').select('*').eq('archived', false).order('created_at');
    if (data) { setChannels(data); if (activeChannel?.id === channelId && data[0]) setActiveChannel(data[0]); }
  }

  const isAdmin = profile?.is_admin === true;
  const isAnnouncementChannel = activeChannel?.type === 'announcement';
  const canPostInChannel = !isAnnouncementChannel || isAdmin;

  if (loading || !user) return null;

  const onlineMembers = members.filter(m => m.status === 'online');
  const channelsByType = {
    chat: channels.filter(c => c.type === 'chat' && !c.archived),
    announcement: channels.filter(c => c.type === 'announcement' && !c.archived),
    'thread-board': channels.filter(c => c.type === 'thread-board' && !c.archived),
  };

  return (
    <div className={`h-screen flex overflow-hidden ${partyMode ? 'party-border border-2' : ''}`} style={{ background: 'var(--bg)' }}>
      {/* Confetti overlay */}
      <ConfettiCanvas particles={particles} />

      {/* Emoji rain */}
      {emojiRain.map(drop => (
        <div key={drop.id} className="emoji-rain" style={{ left: `${drop.left}%`, animationDuration: `${drop.duration}s` }}>
          {drop.emoji}
        </div>
      ))}
      {/* Mobile sidebar toggle */}
      <button onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-xl" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Sidebar */}
      <div className={`${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-64 h-full flex flex-col border-r transition-transform`}
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-base font-bold flex items-center gap-2">
            <span className="text-lg">💬</span> Cohort Comms
          </h1>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {onlineMembers.length} online · {members.length} members
          </p>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {Object.entries(channelsByType).map(([type, chs]) => (
            chs.length > 0 && (
              <div key={type} className="mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-1" style={{ color: 'var(--text-muted)' }}>
                  {type === 'chat' ? 'Channels' : type === 'announcement' ? 'Announcements' : 'Threads'}
                </p>
                {chs.map(ch => (
                  <button key={ch.id} onClick={() => { setActiveChannel(ch); setShowMobileSidebar(false); setThreadParent(null); }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors"
                    style={{
                      background: activeChannel?.id === ch.id ? 'var(--accent-light)' : 'transparent',
                      color: activeChannel?.id === ch.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
                    }}>
                    <span className="text-base">{ch.emoji}</span>
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            )
          ))}
          <button onClick={() => setShowNewChannel(true)}
            className="w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 hover:opacity-80 mt-1"
            style={{ color: 'var(--text-muted)' }}>
            <span>＋</span> New channel
          </button>

          {/* Direct Messages */}
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-1" style={{ color: 'var(--text-muted)' }}>
              Direct Messages
            </p>
            {members.filter(m => m.id !== user.id).slice(0, 10).map(m => (
              <button key={m.id} onClick={() => openDm(m)}
                className="w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors"
                style={{
                  background: view === 'dm' && dmRecipient?.id === m.id ? 'var(--accent-light)' : 'transparent',
                  color: view === 'dm' && dmRecipient?.id === m.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
                }}>
                <div className="relative flex-shrink-0">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ background: m.avatar_color }}>{m.display_name?.[0]?.toUpperCase()}</div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border"
                    style={{ borderColor: 'var(--bg-sidebar)', background: m.status === 'online' ? 'var(--success)' : m.status === 'away' ? 'var(--warning)' : 'var(--text-muted)' }} />
                </div>
                <span className="truncate text-xs">{m.display_name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* User footer */}
        <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: profile?.avatar_color || 'var(--accent)' }}>
              {profile?.display_name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{ borderColor: 'var(--bg-sidebar)', background: 'var(--success)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{profile?.display_name}</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>Online</p>
          </div>
          <button onClick={signOut} className="text-[10px] px-2 py-1 rounded-lg border hover:opacity-80"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            ←
          </button>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel/DM header */}
        <div className="h-14 px-4 flex items-center justify-between border-b flex-shrink-0"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {view === 'dm' && dmRecipient ? (
            <div className="flex items-center gap-2 pl-10 md:pl-0">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ background: dmRecipient.avatar_color }}>{dmRecipient.display_name?.[0]?.toUpperCase()}</div>
              <h2 className="text-sm font-semibold">{dmRecipient.display_name}</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: dmRecipient.status === 'online' ? 'rgba(85,239,196,0.2)' : 'var(--border)', color: dmRecipient.status === 'online' ? 'var(--success)' : 'var(--text-muted)' }}>
                {dmRecipient.status}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-10 md:pl-0">
              <span className="text-lg">{activeChannel?.emoji}</span>
              <h2 className="text-sm font-semibold">{activeChannel?.name}</h2>
              {activeChannel?.description && (
                <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>— {activeChannel.description}</span>
              )}
              {isAnnouncementChannel && !isAdmin && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                  Admin-only posting
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1">
            {/* Mobile thread button */}
            {threadParent && (
              <button onClick={() => setMobilePanel(mobilePanel === 'thread' ? 'none' : 'thread')}
                className="md:hidden p-1.5 rounded-lg hover:opacity-80 text-xs"
                style={{ color: mobilePanel === 'thread' ? 'var(--accent)' : 'var(--text-muted)', background: mobilePanel === 'thread' ? 'var(--accent-light)' : 'transparent' }}>
                🧵
              </button>
            )}
            <button onClick={() => { setShowMembers(!showMembers); setMobilePanel(mobilePanel === 'members' ? 'none' : 'members'); }}
              className="p-1.5 rounded-lg hover:opacity-80"
              style={{ color: showMembers || mobilePanel === 'members' ? 'var(--accent)' : 'var(--text-muted)', background: showMembers || mobilePanel === 'members' ? 'var(--accent-light)' : 'transparent' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* DM View */}
          {view === 'dm' && dmRecipient ? (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {dmMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3"
                      style={{ background: dmRecipient.avatar_color }}>{dmRecipient.display_name?.[0]?.toUpperCase()}</div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Start a conversation with {dmRecipient.display_name}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Direct messages are private between you two.</p>
                  </div>
                ) : (
                  dmMessages.map((dm, i) => {
                    const isMine = dm.sender_id === user.id;
                    const sender = isMine ? profile : dmRecipient;
                    const showAvatar = i === 0 || dmMessages[i - 1]?.sender_id !== dm.sender_id;
                    return (
                      <div key={dm.id} className={`flex gap-2 ${showAvatar ? 'mt-4' : 'mt-0.5'} animate-fadeIn`}>
                        {showAvatar ? (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                            style={{ background: sender?.avatar_color || 'var(--accent)' }}>
                            {sender?.display_name?.[0]?.toUpperCase()}
                          </div>
                        ) : <div className="w-8 flex-shrink-0" />}
                        <div>
                          {showAvatar && (
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-semibold" style={{ color: sender?.avatar_color }}>{sender?.display_name}</span>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                {new Date(dm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed break-words" style={{ color: 'var(--text-primary)' }}>{dm.body}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendDm} className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex gap-2">
                  <input type="text" value={dmInput} onChange={(e) => setDmInput(e.target.value)}
                    placeholder={`Message ${dmRecipient.display_name}...`}
                    className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  <button type="submit" disabled={!dmInput.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform"
                    style={{ background: 'var(--gradient-1)' }}>Send</button>
                </div>
              </form>
            </div>
          ) : (
          <>
          {/* Channel View — Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
                  <span className="text-5xl mb-3">{activeChannel?.emoji || '💬'}</span>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Welcome to #{activeChannel?.name}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = msg.author_id === user.id;
                  const showAvatar = i === 0 || messages[i - 1]?.author_id !== msg.author_id;
                  const msgReactions = reactions[msg.id] || [];
                  const reactionCounts: Record<string, { count: number; mine: boolean }> = {};
                  msgReactions.forEach(r => {
                    if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, mine: false };
                    reactionCounts[r.emoji].count++;
                    if (r.user_id === user.id) reactionCounts[r.emoji].mine = true;
                  });

                  const isSpecial = msg.body.includes('🎉') || msg.body.includes('🚀') || msg.body.includes('🎊') || msg.body.includes('🥳');
                  const isCommand = msg.body.includes('✨ Fun commands');

                  return (
                    <div key={msg.id} className={`group flex gap-2 ${showAvatar ? 'mt-4' : 'mt-0.5'} animate-fadeIn msg-hover rounded-lg px-1 -mx-1`}
                      onMouseEnter={() => setHoveredMsg(msg.id)} onMouseLeave={() => setHoveredMsg(null)}>
                      {showAvatar ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${isSpecial ? 'animate-wiggle' : ''}`}
                          style={{ background: msg.profiles?.avatar_color || 'var(--accent)' }}>
                          {msg.profiles?.display_name?.[0]?.toUpperCase() || '?'}
                        </div>
                      ) : <div className="w-8 flex-shrink-0" />}

                      <div className="flex-1 min-w-0">
                        {showAvatar && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-semibold ${partyMode ? 'animate-rainbow' : ''}`} style={{ color: msg.profiles?.avatar_color || 'var(--accent)' }}>
                              {msg.profiles?.display_name}
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        <p className={`text-sm leading-relaxed break-words ${isSpecial ? 'animate-pop-in' : ''} ${isCommand ? 'text-xs rounded-lg px-3 py-2' : ''}`}
                          style={{
                            color: 'var(--text-primary)',
                            ...(isSpecial ? { fontSize: '1.1em' } : {}),
                            ...(isCommand ? { background: 'var(--bg-input)', color: 'var(--text-secondary)' } : {}),
                          }}>
                          {msg.body}
                        </p>

                        {/* Reactions */}
                        {Object.keys(reactionCounts).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(reactionCounts).map(([emoji, { count, mine }]) => (
                              <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)}
                                className="text-xs px-1.5 py-0.5 rounded-full border transition-colors"
                                style={{
                                  borderColor: mine ? 'var(--accent)' : 'var(--border)',
                                  background: mine ? 'var(--accent-light)' : 'transparent',
                                  color: 'var(--text-secondary)',
                                }}>
                                {emoji} {count}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Hover actions */}
                        {hoveredMsg === msg.id && (
                          <div className="flex items-center gap-0.5 mt-1 animate-fadeIn">
                            {QUICK_REACTIONS.map(emoji => (
                              <button key={emoji} onClick={() => { toggleReaction(msg.id, emoji); if (emoji === '🎉') celebrate('confetti'); }}
                                className="text-sm p-1 rounded hover:scale-125 active:scale-90 transition-transform reaction-btn">{emoji}</button>
                            ))}
                            <button onClick={() => openThread(msg)}
                              className="text-[10px] px-2 py-1 rounded-lg border ml-1 hover:opacity-80"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                              💬 Reply
                            </button>
                            {isOwn && (
                              <button onClick={() => deleteMessage(msg.id)}
                                className="text-[10px] px-2 py-1 rounded-lg border ml-0.5 hover:opacity-80"
                                style={{ borderColor: 'var(--border)', color: 'var(--danger)' }}>
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="px-4 pb-1 text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0s' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.4s' }} />
                </span>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing
              </div>
            )}

            {/* Message input */}
            {canPostInChannel ? (
            <form onSubmit={sendMessage} className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-2">
                <input type="text" value={input}
                  onChange={(e) => { setInput(e.target.value); handleTyping(); }}
                  placeholder={input.startsWith('/') ? 'Try: /confetti /fireworks /party /hearts /rockets' : `Message #${activeChannel?.name || 'channel'}...`}
                  className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/30 ${partyMode ? 'party-border' : ''}`}
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <button type="submit" disabled={!input.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform"
                  style={{ background: 'var(--gradient-1)' }}>
                  Send
                </button>
              </div>
              <p className="text-[9px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
                Type / for fun commands · Auto-confetti on "shipped" "launched" "merged"
              </p>
            </form>
            ) : (
              <div className="p-4 text-center border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  🔒 Only admins can post in announcement channels
                </p>
              </div>
            )}
          </div>
          </>
          )}

          {/* Thread panel */}
          {threadParent && (
            <div className={`w-80 border-l flex flex-col flex-shrink-0 ${mobilePanel === 'thread' ? 'fixed inset-0 z-50 w-full' : 'hidden'} md:flex`} style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <div className="h-14 px-4 flex items-center justify-between border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold">Thread</h3>
                <button onClick={() => setThreadParent(null)} className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>

              {/* Parent message */}
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: threadParent.profiles?.avatar_color || 'var(--accent)' }}>
                    {threadParent.profiles?.display_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: threadParent.profiles?.avatar_color }}>{threadParent.profiles?.display_name}</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{threadParent.body}</p>
              </div>

              {/* Thread replies */}
              <div className="flex-1 overflow-y-auto px-4 py-2">
                {threadMessages.map(msg => (
                  <div key={msg.id} className="flex gap-2 mt-2 animate-fadeIn">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: msg.profiles?.avatar_color || 'var(--accent)' }}>
                      {msg.profiles?.display_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-semibold" style={{ color: msg.profiles?.avatar_color }}>{msg.profiles?.display_name}</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-primary)' }}>{msg.body}</p>
                    </div>
                  </div>
                ))}
                <div ref={threadEndRef} />
              </div>

              <form onSubmit={sendThreadReply} className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex gap-2">
                  <input type="text" value={threadInput} onChange={(e) => setThreadInput(e.target.value)}
                    placeholder="Reply in thread..."
                    className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                  <button type="submit" disabled={!threadInput.trim()}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-30"
                    style={{ background: 'var(--gradient-1)' }}>↩</button>
                </div>
              </form>
            </div>
          )}

          {/* Members panel */}
          {(showMembers || mobilePanel === 'members') && (
            <div className={`w-60 border-l flex-col flex-shrink-0 ${mobilePanel === 'members' ? 'fixed inset-0 z-50 w-full' : 'hidden'} md:flex`} style={{ borderColor: 'var(--border)', background: 'var(--bg-sidebar)' }}>
              <div className="h-14 px-4 flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold">Members — {members.length}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {['online', 'away', 'offline'].map(status => {
                  const group = members.filter(m => m.status === status);
                  if (group.length === 0) return null;
                  return (
                    <div key={status} className="mb-3">
                      <p className="text-[10px] font-semibold uppercase px-2 mb-1" style={{ color: 'var(--text-muted)' }}>
                        {status === 'online' ? `Online — ${group.length}` : status === 'away' ? `Away — ${group.length}` : `Offline — ${group.length}`}
                      </p>
                      {group.map(m => (
                        <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:opacity-80 cursor-pointer group/member"
                          onClick={() => { if (m.id !== user.id) openDm(m); }}>
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ background: m.avatar_color, opacity: status === 'offline' ? 0.5 : 1 }}>
                              {m.display_name?.[0]?.toUpperCase()}
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                              style={{
                                borderColor: 'var(--bg-sidebar)',
                                background: status === 'online' ? 'var(--success)' : status === 'away' ? 'var(--warning)' : 'var(--text-muted)',
                              }} />
                          </div>
                          <span className="text-xs truncate flex-1" style={{ color: status === 'offline' ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                            {m.display_name}{m.id === user.id ? ' (you)' : ''}
                          </span>
                          {m.id !== user.id && (
                            <span className="text-[9px] opacity-0 group-hover/member:opacity-100 transition-opacity" style={{ color: 'var(--accent)' }}>
                              DM
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New channel modal */}
      {showNewChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setShowNewChannel(false)}>
          <div className="w-full max-w-sm rounded-2xl border p-6" onClick={e => e.stopPropagation()}
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <h2 className="text-base font-semibold mb-4">New channel</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newChannelEmoji} onChange={e => setNewChannelEmoji(e.target.value)}
                  className="w-14 px-2 py-2 rounded-xl border text-center text-lg outline-none"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }} />
                <input type="text" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}
                  placeholder="channel-name" className="flex-1 px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <select value={newChannelType} onChange={e => setNewChannelType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <option value="chat">Chat</option>
                <option value="announcement">Announcement</option>
                <option value="thread-board">Thread Board</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowNewChannel(false)} className="px-3 py-1.5 rounded-xl text-sm" style={{ color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={createChannel} disabled={!newChannelName.trim()}
                className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white disabled:opacity-30"
                style={{ background: 'var(--gradient-1)' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowMobileSidebar(false)} />
      )}
    </div>
  );
}
