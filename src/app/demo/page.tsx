'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_CHANNELS = [
  { id: '1', name: 'general', emoji: '🏠', type: 'chat', description: 'Main cohort discussion' },
  { id: '2', name: 'announcements', emoji: '📢', type: 'announcement', description: 'Important updates' },
  { id: '3', name: 'random', emoji: '🎲', type: 'chat', description: 'Off-topic and fun' },
  { id: '4', name: 'show-and-tell', emoji: '🚀', type: 'thread-board', description: 'Share what you shipped' },
  { id: '5', name: 'help', emoji: '🙋', type: 'chat', description: 'Ask questions' },
];

const DEMO_USERS = [
  { name: 'Alex Chen', color: '#6c5ce7', status: 'online' },
  { name: 'Priya Sharma', color: '#00b894', status: 'online' },
  { name: 'Marcus Johnson', color: '#fd79a8', status: 'online' },
  { name: 'Sofia Martinez', color: '#00cec9', status: 'away' },
  { name: 'Yuki Tanaka', color: '#f39c12', status: 'offline' },
];

type DemoMessage = {
  id: string;
  user: number;
  body: string;
  time: string;
  reactions?: { emoji: string; count: number }[];
};

const DEMO_CONVERSATIONS: Record<string, DemoMessage[]> = {
  '1': [
    { id: 'm1', user: 0, body: 'Hey everyone! Just deployed the comms platform 🚀', time: '9:00 AM', reactions: [{ emoji: '🚀', count: 3 }, { emoji: '🎉', count: 2 }] },
    { id: 'm2', user: 1, body: 'This looks amazing! Love the dark theme.', time: '9:02 AM', reactions: [{ emoji: '❤️', count: 1 }] },
    { id: 'm3', user: 2, body: 'Real-time messaging is super smooth — typing indicators are a nice touch', time: '9:05 AM' },
    { id: 'm4', user: 3, body: 'Who else is working on the PM integration?', time: '9:08 AM' },
    { id: 'm5', user: 0, body: 'Try the slash commands! Type /confetti or /party 🎊', time: '9:10 AM', reactions: [{ emoji: '👀', count: 4 }] },
  ],
  '2': [
    { id: 'a1', user: 0, body: '📢 Week 2 deadline: Sunday 17:00 ET. Make sure your PR is merged!', time: '8:00 AM', reactions: [{ emoji: '👍', count: 5 }] },
    { id: 'a2', user: 1, body: '📢 Peer reviews due Monday 14:00 ET. 66 reviews required.', time: '10:00 AM' },
  ],
  '3': [
    { id: 'r1', user: 2, body: 'Anyone else running on pure caffeine at this point? ☕', time: '11:00 AM', reactions: [{ emoji: '😂', count: 3 }] },
    { id: 'r2', user: 4, body: 'I switched to matcha. Game changer.', time: '11:05 AM' },
    { id: 'r3', user: 1, body: 'Real talk — tabs or spaces?', time: '11:10 AM', reactions: [{ emoji: '👀', count: 2 }] },
    { id: 'r4', user: 0, body: 'Tabs. Fight me. 😤', time: '11:12 AM', reactions: [{ emoji: '😂', count: 4 }, { emoji: '🔥', count: 1 }] },
  ],
  '4': [
    { id: 's1', user: 1, body: '🚀 Just shipped the kanban board with drag-and-drop! Check it out →', time: '2:00 PM', reactions: [{ emoji: '🚀', count: 3 }, { emoji: '🎉', count: 2 }] },
    { id: 's2', user: 4, body: '🚀 Dark mode toggle is live — cycles between system/light/dark', time: '3:00 PM', reactions: [{ emoji: '❤️', count: 2 }] },
  ],
  '5': [
    { id: 'h1', user: 3, body: 'How do I enable Supabase Realtime on a table?', time: '1:00 PM' },
    { id: 'h2', user: 0, body: 'ALTER PUBLICATION supabase_realtime ADD TABLE your_table; — run it in SQL Editor', time: '1:05 PM', reactions: [{ emoji: '👍', count: 1 }] },
  ],
};

const TYPING_SEQUENCES = [
  { user: 1, delay: 5000, message: 'Just pushed a fix for the mobile nav — can someone test?' },
  { user: 2, delay: 12000, message: 'On it! Testing now on iPhone 📱' },
  { user: 0, delay: 20000, message: 'Looks great on my end! Ship it 🚀' },
];

export default function DemoPage() {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState('1');
  const [messages, setMessages] = useState<Record<string, DemoMessage[]>>(DEMO_CONVERSATIONS);
  const [input, setInput] = useState('');
  const [typingUser, setTypingUser] = useState<number | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [confetti, setConfetti] = useState<{ id: number; x: number; color: string; size: number }[]>([]);
  const [emojiRain, setEmojiRain] = useState<{ id: number; emoji: string; left: number; duration: number }[]>([]);
  const [step, setStep] = useState(0);
  const [showTooltip, setShowTooltip] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seqIndex = useRef(0);

  const channel = DEMO_CHANNELS.find(c => c.id === activeChannel)!;
  const channelMessages = messages[activeChannel] || [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [channelMessages.length]);

  // Simulate typing and new messages
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    TYPING_SEQUENCES.forEach((seq, i) => {
      // Show typing
      timeouts.push(setTimeout(() => {
        if (activeChannel === '1') setTypingUser(seq.user);
      }, seq.delay));

      // Send message
      timeouts.push(setTimeout(() => {
        setTypingUser(null);
        if (activeChannel === '1') {
          setMessages(prev => ({
            ...prev,
            '1': [...(prev['1'] || []), {
              id: `sim-${i}`,
              user: seq.user,
              body: seq.message,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }],
          }));
        }
      }, seq.delay + 3000));
    });

    return () => timeouts.forEach(clearTimeout);
  }, [activeChannel]);

  function triggerConfetti() {
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      color: ['#6c5ce7', '#fd79a8', '#00cec9', '#55efc4', '#fdcb6e', '#ff6b6b'][Math.floor(Math.random() * 6)],
      size: 4 + Math.random() * 8,
    }));
    setConfetti(particles);
    setTimeout(() => setConfetti([]), 3000);
  }

  function triggerEmojiRain(emoji: string) {
    const drops = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i, emoji, left: Math.random() * 100, duration: 2 + Math.random() * 3,
    }));
    setEmojiRain(drops);
    setTimeout(() => setEmojiRain([]), 5000);
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');

    if (body === '/confetti' || body === '/celebrate') {
      triggerConfetti();
      addMessage('🎉🎊 Let\'s celebrate! 🎊🎉');
      return;
    }
    if (body === '/party') {
      triggerConfetti();
      triggerEmojiRain('🎉');
      addMessage('🥳🪩 PARTY MODE ACTIVATED 🪩🥳');
      return;
    }
    if (body === '/hearts') { triggerEmojiRain('❤️'); addMessage('❤️💕 Sending love! 💕❤️'); return; }
    if (body === '/rockets') { triggerConfetti(); triggerEmojiRain('🚀'); addMessage('🚀🚀🚀 TO THE MOON! 🚀🚀🚀'); return; }
    if (body === '/help' || body === '/commands') { addMessage('✨ Fun commands: /confetti · /party · /hearts · /rockets'); return; }

    if (body.toLowerCase().includes('shipped') || body.toLowerCase().includes('launched')) triggerConfetti();

    addMessage(body);

    // Simulate a reply after a moment
    setTimeout(() => {
      setTypingUser(Math.floor(Math.random() * 4) + 1);
      setTimeout(() => {
        setTypingUser(null);
        const replies = ['Nice! 🔥', 'Love it!', 'Great work! 🚀', 'Awesome 👏', '💯', 'Ship it!', 'Let\'s gooo 🎉'];
        const reply = replies[Math.floor(Math.random() * replies.length)];
        const replyUser = Math.floor(Math.random() * 4) + 1;
        setMessages(prev => ({
          ...prev,
          [activeChannel]: [...(prev[activeChannel] || []), {
            id: `reply-${Date.now()}`, user: replyUser, body: reply,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }],
        }));
      }, 2000);
    }, 1000);
  }

  function addMessage(body: string) {
    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), {
        id: `you-${Date.now()}`, user: -1, body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }],
    }));
  }

  const TOOLTIPS = [
    { text: '👈 Switch channels in the sidebar', position: 'left' },
    { text: '💬 Try sending a message below!', position: 'bottom' },
    { text: '🎉 Type /confetti or /party for celebrations!', position: 'bottom' },
    { text: '👥 Click the people icon to see members', position: 'right' },
  ];

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Confetti */}
      {confetti.map(p => (
        <div key={p.id} className="fixed pointer-events-none z-[100]" style={{
          left: `${p.x}%`, top: '-10px', width: p.size, height: p.size, background: p.color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `emoji-fall ${2 + Math.random() * 2}s linear forwards`,
        }} />
      ))}

      {/* Emoji rain */}
      {emojiRain.map(d => (
        <div key={d.id} className="emoji-rain" style={{ left: `${d.left}%`, animationDuration: `${d.duration}s` }}>{d.emoji}</div>
      ))}

      {/* Demo banner */}
      <div className="fixed top-0 left-0 right-0 z-50 text-center py-1.5 text-xs font-semibold text-white"
        style={{ background: 'var(--gradient-1)' }}>
        🎮 Interactive Demo — Try sending messages, reactions, and slash commands!
        <button onClick={() => router.push('/auth')}
          className="ml-3 px-3 py-0.5 rounded-full text-[10px] font-bold bg-white/20 hover:bg-white/30 transition-colors">
          Sign up for real →
        </button>
      </div>

      {/* Mobile sidebar toggle */}
      <button onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="md:hidden fixed top-10 left-3 z-50 p-2 rounded-xl" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Sidebar */}
      <div className={`${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-64 h-full flex flex-col border-r transition-transform pt-8`}
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-base font-bold flex items-center gap-2">
            <span className="text-lg">💬</span> Cohort Comms
          </h1>
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {DEMO_USERS.filter(u => u.status === 'online').length} online · {DEMO_USERS.length} members
          </p>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider px-2 mb-1" style={{ color: 'var(--text-muted)' }}>Channels</p>
          {DEMO_CHANNELS.map(ch => (
            <button key={ch.id} onClick={() => { setActiveChannel(ch.id); setShowMobileSidebar(false); setStep(1); setShowTooltip(true); }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors"
              style={{
                background: activeChannel === ch.id ? 'var(--accent-light)' : 'transparent',
                color: activeChannel === ch.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
              }}>
              <span className="text-base">{ch.emoji}</span>
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>

        {/* Demo user */}
        <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--accent)' }}>Y</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{ borderColor: 'var(--bg-sidebar)', background: 'var(--success)' }} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>You (Demo)</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Exploring</p>
          </div>
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col min-w-0 pt-8">
        {/* Channel header */}
        <div className="h-14 px-4 flex items-center justify-between border-b flex-shrink-0"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 pl-10 md:pl-0">
            <span className="text-lg">{channel.emoji}</span>
            <h2 className="text-sm font-semibold">{channel.name}</h2>
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>— {channel.description}</span>
          </div>
          <button onClick={() => { setShowMembers(!showMembers); setStep(3); }}
            className="p-1.5 rounded-lg hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Messages */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {channelMessages.map((msg, i) => {
                const isYou = msg.user === -1;
                const u = isYou ? { name: 'You', color: 'var(--accent)' } : DEMO_USERS[msg.user];
                const showAvatar = i === 0 || channelMessages[i - 1]?.user !== msg.user;
                const isSpecial = msg.body.includes('🎉') || msg.body.includes('🚀') || msg.body.includes('🥳');

                return (
                  <div key={msg.id} className={`group flex gap-2 ${showAvatar ? 'mt-4' : 'mt-0.5'} animate-fadeIn msg-hover rounded-lg px-1 -mx-1`}>
                    {showAvatar ? (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${isSpecial ? 'animate-wiggle' : ''}`}
                        style={{ background: u.color }}>
                        {u.name[0]}
                      </div>
                    ) : <div className="w-8 flex-shrink-0" />}

                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold" style={{ color: u.color }}>{u.name}</span>
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{msg.time}</span>
                        </div>
                      )}
                      <p className={`text-sm leading-relaxed break-words ${isSpecial ? 'animate-pop-in' : ''}`}
                        style={{ color: 'var(--text-primary)' }}>{msg.body}</p>

                      {/* Reactions */}
                      {msg.reactions && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {msg.reactions.map((r, ri) => (
                            <button key={ri} onClick={() => triggerConfetti()}
                              className="text-xs px-1.5 py-0.5 rounded-full border transition-colors hover:scale-110 active:scale-90 reaction-btn"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                              {r.emoji} {r.count}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Hover actions */}
                      <div className="hidden group-hover:flex items-center gap-0.5 mt-1 animate-fadeIn">
                        {['👍', '❤️', '😂', '🎉', '🚀', '👀'].map(emoji => (
                          <button key={emoji} onClick={() => { if (emoji === '🎉') triggerConfetti(); }}
                            className="text-sm p-1 rounded hover:scale-125 active:scale-90 transition-transform reaction-btn">{emoji}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Typing indicator */}
            {typingUser !== null && (
              <div className="px-4 pb-1 text-xs flex items-center gap-1 animate-fadeIn" style={{ color: 'var(--text-muted)' }}>
                <span className="flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0s' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.4s' }} />
                </span>
                {DEMO_USERS[typingUser].name} is typing
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder={input.startsWith('/') ? 'Try: /confetti /party /hearts /rockets' : `Message #${channel.name}... (try it!)`}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <button type="submit" disabled={!input.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform"
                  style={{ background: 'var(--gradient-1)' }}>
                  Send
                </button>
              </div>
              <p className="text-[9px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
                Type / for fun commands · Messages in demo are local only
              </p>
            </form>
          </div>

          {/* Members panel */}
          {showMembers && (
            <div className="w-60 border-l flex-col flex-shrink-0 hidden md:flex" style={{ borderColor: 'var(--border)', background: 'var(--bg-sidebar)' }}>
              <div className="h-14 px-4 flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-semibold">Members — {DEMO_USERS.length}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {['online', 'away', 'offline'].map(status => {
                  const group = DEMO_USERS.filter(u => u.status === status);
                  if (!group.length) return null;
                  return (
                    <div key={status} className="mb-3">
                      <p className="text-[10px] font-semibold uppercase px-2 mb-1" style={{ color: 'var(--text-muted)' }}>
                        {status} — {group.length}
                      </p>
                      {group.map((m, mi) => (
                        <div key={mi} className="flex items-center gap-2 px-2 py-1.5 rounded-lg animate-slideIn"
                          style={{ animationDelay: `${mi * 0.05}s` }}>
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ background: m.color, opacity: status === 'offline' ? 0.5 : 1 }}>{m.name[0]}</div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                              style={{
                                borderColor: 'var(--bg-sidebar)',
                                background: status === 'online' ? 'var(--success)' : status === 'away' ? 'var(--warning)' : 'var(--text-muted)',
                              }} />
                          </div>
                          <span className="text-xs" style={{ color: status === 'offline' ? 'var(--text-muted)' : 'var(--text-primary)' }}>{m.name}</span>
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

      {/* Feature highlights */}
      <div className="fixed bottom-20 right-4 z-50 space-y-2 hidden md:block">
        <div className="rounded-xl border p-3 max-w-[200px] animate-slide-up" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-semibold mb-1" style={{ color: 'var(--accent)' }}>✨ Features</p>
          <ul className="text-[10px] space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>💬 Real-time messaging</li>
            <li>🧵 Threaded replies</li>
            <li>⭐ Emoji reactions</li>
            <li>⌨️ Typing indicators</li>
            <li>🟢 User presence</li>
            <li>🎉 Slash commands</li>
            <li>📱 Mobile responsive</li>
          </ul>
          <button onClick={() => router.push('/auth')}
            className="w-full mt-2 py-1.5 rounded-lg text-[10px] font-semibold text-white hover:scale-105 transition-transform"
            style={{ background: 'var(--gradient-1)' }}>
            Sign up for the full experience →
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {showMobileSidebar && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowMobileSidebar(false)} />
      )}
    </div>
  );
}
