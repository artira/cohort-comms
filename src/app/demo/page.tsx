'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    { id: 's1', user: 1, body: '🚀 Just shipped the kanban board with drag-and-drop!', time: '2:00 PM', reactions: [{ emoji: '🚀', count: 3 }, { emoji: '🎉', count: 2 }] },
    { id: 's2', user: 4, body: '🚀 Dark mode toggle is live — cycles between system/light/dark', time: '3:00 PM', reactions: [{ emoji: '❤️', count: 2 }] },
  ],
  '5': [
    { id: 'h1', user: 3, body: 'How do I enable Supabase Realtime on a table?', time: '1:00 PM' },
    { id: 'h2', user: 0, body: 'ALTER PUBLICATION supabase_realtime ADD TABLE your_table;', time: '1:05 PM', reactions: [{ emoji: '👍', count: 1 }] },
  ],
};

const TYPING_SEQUENCES = [
  { user: 1, delay: 8000, message: 'Just pushed a fix for the mobile nav — can someone test?' },
  { user: 2, delay: 18000, message: 'On it! Testing now on iPhone 📱' },
  { user: 0, delay: 28000, message: 'Looks great on my end! Ship it 🚀' },
];

// Tour steps
const TOUR_STEPS = [
  {
    target: 'tour-sidebar',
    title: 'Channel Sidebar',
    body: 'Browse organized channels — chat rooms, announcements, and thread boards. Click any channel to switch.',
    emoji: '📋',
    position: 'right' as const,
    highlight: 'sidebar',
  },
  {
    target: 'tour-channel-general',
    title: 'Channels',
    body: 'Each channel has an emoji and type. #general for discussion, #announcements for updates, #show-and-tell for sharing wins.',
    emoji: '🏠',
    position: 'right' as const,
    highlight: 'channels',
  },
  {
    target: 'tour-messages',
    title: 'Real-time Messages',
    body: 'Messages appear instantly with colorful avatars, timestamps, and smooth animations. New messages slide in live.',
    emoji: '💬',
    position: 'left' as const,
    highlight: 'messages',
  },
  {
    target: 'tour-reactions',
    title: 'Emoji Reactions',
    body: 'Hover any message to react with emoji. Click 🎉 for a confetti explosion! Reactions stack with counts.',
    emoji: '⭐',
    position: 'top' as const,
    highlight: 'reactions',
  },
  {
    target: 'tour-input',
    title: 'Message Input & Slash Commands',
    body: 'Type messages or use slash commands: /confetti, /party, /hearts, /rockets. Say "shipped" for auto-confetti!',
    emoji: '⌨️',
    position: 'top' as const,
    highlight: 'input',
  },
  {
    target: 'tour-typing',
    title: 'Typing Indicators',
    body: 'See animated dots when someone is typing. Watch — other users will start typing soon!',
    emoji: '💭',
    position: 'top' as const,
    highlight: 'typing',
  },
  {
    target: 'tour-members',
    title: 'Members Panel',
    body: 'Click the people icon to see who\'s online, away, or offline — with color-coded presence dots.',
    emoji: '👥',
    position: 'left' as const,
    highlight: 'members',
  },
  {
    target: 'tour-profile',
    title: 'Your Profile',
    body: 'Your avatar, name, and online status appear at the bottom. In the real app, this updates across all users.',
    emoji: '🧑',
    position: 'right' as const,
    highlight: 'profile',
  },
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Tour state
  const [tourStep, setTourStep] = useState(-1);
  const [tourVisible, setTourVisible] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(true);

  const channel = DEMO_CHANNELS.find(c => c.id === activeChannel)!;
  const channelMessages = messages[activeChannel] || [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [channelMessages.length]);

  // Simulate typing
  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    TYPING_SEQUENCES.forEach((seq, i) => {
      timeouts.push(setTimeout(() => { if (activeChannel === '1') setTypingUser(seq.user); }, seq.delay));
      timeouts.push(setTimeout(() => {
        setTypingUser(null);
        if (activeChannel === '1') {
          setMessages(prev => ({
            ...prev,
            '1': [...(prev['1'] || []), {
              id: `sim-${i}`, user: seq.user, body: seq.message,
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
      id: Date.now() + i, x: Math.random() * 100,
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

  function addMessage(body: string) {
    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), {
        id: `you-${Date.now()}`, user: -1, body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }],
    }));
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');

    if (body === '/confetti' || body === '/celebrate') { triggerConfetti(); addMessage('🎉🎊 Let\'s celebrate! 🎊🎉'); return; }
    if (body === '/party') { triggerConfetti(); triggerEmojiRain('🎉'); addMessage('🥳🪩 PARTY MODE ACTIVATED 🪩🥳'); return; }
    if (body === '/hearts') { triggerEmojiRain('❤️'); addMessage('❤️💕 Sending love! 💕❤️'); return; }
    if (body === '/rockets') { triggerConfetti(); triggerEmojiRain('🚀'); addMessage('🚀🚀🚀 TO THE MOON! 🚀🚀🚀'); return; }
    if (body === '/help' || body === '/commands') { addMessage('✨ Commands: /confetti · /party · /hearts · /rockets'); return; }
    if (body.toLowerCase().includes('shipped') || body.toLowerCase().includes('launched')) triggerConfetti();

    addMessage(body);

    // Simulate reply
    setTimeout(() => {
      setTypingUser(Math.floor(Math.random() * 4) + 1);
      setTimeout(() => {
        setTypingUser(null);
        const replies = ['Nice! 🔥', 'Love it!', 'Great work! 🚀', 'Awesome 👏', '💯', 'Ship it!', 'Let\'s gooo 🎉'];
        setMessages(prev => ({
          ...prev,
          [activeChannel]: [...(prev[activeChannel] || []), {
            id: `reply-${Date.now()}`, user: Math.floor(Math.random() * 4) + 1,
            body: replies[Math.floor(Math.random() * replies.length)],
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }],
        }));
      }, 2000);
    }, 1000);
  }

  // Tour navigation
  function startTour() {
    setShowTourPrompt(false);
    setTourStep(0);
    setTourVisible(true);
  }
  function nextStep() {
    const next = tourStep + 1;
    if (next >= TOUR_STEPS.length) { setTourVisible(false); setTourStep(-1); triggerConfetti(); return; }
    // Auto-actions for certain steps
    if (TOUR_STEPS[next].highlight === 'members') setShowMembers(true);
    setTourStep(next);
  }
  function prevStep() { if (tourStep > 0) setTourStep(tourStep - 1); }
  function endTour() { setTourVisible(false); setTourStep(-1); }

  const currentTour = tourVisible && tourStep >= 0 ? TOUR_STEPS[tourStep] : null;

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
      {emojiRain.map(d => (
        <div key={d.id} className="emoji-rain" style={{ left: `${d.left}%`, animationDuration: `${d.duration}s` }}>{d.emoji}</div>
      ))}

      {/* Tour overlay */}
      {tourVisible && (
        <div className="fixed inset-0 z-[80] pointer-events-none" style={{ background: 'rgba(0,0,0,0.5)' }} />
      )}

      {/* Tour welcome prompt */}
      {showTourPrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="max-w-sm w-full rounded-2xl border p-8 text-center animate-pop-in"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
            <div className="text-5xl mb-4">🎓</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to Cohort Comms!</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Want a quick guided tour of the features? It takes about 30 seconds.
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={startTour}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white hover:scale-[1.02] active:scale-[0.98] transition-transform"
                style={{ background: 'var(--gradient-1)' }}>
                🚀 Take the tour (30 sec)
              </button>
              <button onClick={() => setShowTourPrompt(false)}
                className="w-full py-2 rounded-xl text-sm hover:underline"
                style={{ color: 'var(--text-muted)' }}>
                Skip — I'll explore on my own
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tour tooltip */}
      {currentTour && <TourTooltip step={currentTour} stepNum={tourStep} total={TOUR_STEPS.length} onNext={nextStep} onPrev={prevStep} onEnd={endTour} />}

      {/* Demo banner */}
      <div className="fixed top-0 left-0 right-0 z-[70] text-center py-1.5 text-xs font-semibold text-white flex items-center justify-center gap-2"
        style={{ background: 'var(--gradient-1)' }}>
        <span>🎮 Interactive Demo</span>
        {!tourVisible && !showTourPrompt && (
          <button onClick={startTour} className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 hover:bg-white/30 transition-colors">
            🎓 Restart tour
          </button>
        )}
        <button onClick={() => router.push('/auth')}
          className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-white/20 hover:bg-white/30 transition-colors">
          Sign up for real →
        </button>
      </div>

      {/* Mobile sidebar toggle */}
      <button onClick={() => setShowMobileSidebar(!showMobileSidebar)}
        className="md:hidden fixed top-10 left-3 z-50 p-2 rounded-xl" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Sidebar */}
      <div id="tour-sidebar"
        className={`${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-[85] w-64 h-full flex flex-col border-r transition-transform pt-8 ${currentTour?.highlight === 'sidebar' || currentTour?.highlight === 'channels' ? 'ring-2 ring-purple-400 rounded-r-xl' : ''}`}
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
            <button key={ch.id} id={ch.id === '1' ? 'tour-channel-general' : undefined}
              onClick={() => { setActiveChannel(ch.id); setShowMobileSidebar(false); }}
              className={`w-full text-left px-2 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${currentTour?.highlight === 'channels' ? 'animate-slideIn' : ''}`}
              style={{
                background: activeChannel === ch.id ? 'var(--accent-light)' : 'transparent',
                color: activeChannel === ch.id ? 'var(--accent-hover)' : 'var(--text-secondary)',
                animationDelay: `${DEMO_CHANNELS.indexOf(ch) * 0.08}s`,
              }}>
              <span className="text-base">{ch.emoji}</span>
              <span className="truncate">{ch.name}</span>
              {ch.type !== 'chat' && (
                <span className="text-[8px] ml-auto px-1 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>
                  {ch.type === 'announcement' ? 'ANN' : 'THR'}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Demo user profile */}
        <div id="tour-profile"
          className={`p-3 border-t flex items-center gap-2 ${currentTour?.highlight === 'profile' ? 'ring-2 ring-purple-400 rounded-b-xl' : ''}`}
          style={{ borderColor: 'var(--border)' }}>
          <div className="relative">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--accent)' }}>Y</div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{ borderColor: 'var(--bg-sidebar)', background: 'var(--success)' }} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>You (Demo)</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Online</p>
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
          <button id="tour-members" onClick={() => setShowMembers(!showMembers)}
            className={`p-1.5 rounded-lg hover:opacity-80 ${currentTour?.highlight === 'members' ? 'ring-2 ring-purple-400' : ''}`}
            style={{ color: 'var(--text-muted)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Messages area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div id="tour-messages"
              className={`flex-1 overflow-y-auto px-4 py-3 ${currentTour?.highlight === 'messages' ? 'ring-2 ring-purple-400 ring-inset rounded-lg' : ''}`}>
              {channelMessages.map((msg, i) => {
                const isYou = msg.user === -1;
                const u = isYou ? { name: 'You', color: 'var(--accent)' } : DEMO_USERS[msg.user];
                const showAvatar = i === 0 || channelMessages[i - 1]?.user !== msg.user;
                const isSpecial = msg.body.includes('🎉') || msg.body.includes('🚀') || msg.body.includes('🥳');

                return (
                  <div key={msg.id} className={`group flex gap-2 ${showAvatar ? 'mt-4' : 'mt-0.5'} animate-fadeIn msg-hover rounded-lg px-1 -mx-1`}>
                    {showAvatar ? (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5 ${isSpecial ? 'animate-wiggle' : ''}`}
                        style={{ background: u.color }}>{u.name[0]}</div>
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

                      {msg.reactions && (
                        <div id={i === 0 ? 'tour-reactions' : undefined}
                          className={`flex flex-wrap gap-1 mt-1 ${currentTour?.highlight === 'reactions' && i === 0 ? 'ring-2 ring-purple-400 rounded-lg p-0.5' : ''}`}>
                          {msg.reactions.map((r, ri) => (
                            <button key={ri} onClick={triggerConfetti}
                              className="text-xs px-1.5 py-0.5 rounded-full border transition-colors hover:scale-110 active:scale-90 reaction-btn"
                              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                              {r.emoji} {r.count}
                            </button>
                          ))}
                        </div>
                      )}

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
            <div id="tour-typing" className={currentTour?.highlight === 'typing' ? 'ring-2 ring-purple-400 ring-inset rounded-lg mx-2' : ''}>
              {typingUser !== null ? (
                <div className="px-4 pb-1 text-xs flex items-center gap-1 animate-fadeIn" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.4s' }} />
                  </span>
                  {DEMO_USERS[typingUser].name} is typing
                </div>
              ) : currentTour?.highlight === 'typing' ? (
                <div className="px-4 pb-1 text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--accent)', animationDelay: '0.4s' }} />
                  </span>
                  Priya Sharma is typing
                </div>
              ) : null}
            </div>

            {/* Input */}
            <form id="tour-input" onSubmit={handleSend}
              className={`p-3 border-t ${currentTour?.highlight === 'input' ? 'ring-2 ring-purple-400 ring-inset rounded-b-lg' : ''}`}
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder={input.startsWith('/') ? 'Try: /confetti /party /hearts /rockets' : `Message #${channel.name}... (try it!)`}
                  className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                <button type="submit" disabled={!input.trim()}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-30 hover:scale-105 active:scale-95 transition-transform"
                  style={{ background: 'var(--gradient-1)' }}>Send</button>
              </div>
              <p className="text-[9px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
                Type / for commands · Say "shipped" for confetti · Messages are local demo only
              </p>
            </form>
          </div>

          {/* Members panel */}
          {showMembers && (
            <div className={`w-60 border-l flex-col flex-shrink-0 hidden md:flex ${currentTour?.highlight === 'members' ? 'ring-2 ring-purple-400 ring-inset rounded-r-lg' : ''}`}
              style={{ borderColor: 'var(--border)', background: 'var(--bg-sidebar)' }}>
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
                              style={{ borderColor: 'var(--bg-sidebar)', background: status === 'online' ? 'var(--success)' : status === 'away' ? 'var(--warning)' : 'var(--text-muted)' }} />
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

      {/* Mobile sidebar overlay */}
      {showMobileSidebar && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setShowMobileSidebar(false)} />}
    </div>
  );
}

/* ---- Tour Tooltip Component ---- */
function TourTooltip({ step, stepNum, total, onNext, onPrev, onEnd }: {
  step: typeof TOUR_STEPS[0]; stepNum: number; total: number;
  onNext: () => void; onPrev: () => void; onEnd: () => void;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(step.target);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tw = 300;
    const th = 200;

    let top = 0, left = 0;
    switch (step.position) {
      case 'right':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.right + 16;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.left - tw - 16;
        break;
      case 'top':
        top = rect.top - th - 16;
        left = rect.left + rect.width / 2 - tw / 2;
        break;
      default:
        top = rect.bottom + 16;
        left = rect.left + rect.width / 2 - tw / 2;
    }

    // Keep in bounds
    top = Math.max(40, Math.min(top, window.innerHeight - th - 20));
    left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));
    setPos({ top, left });
  }, [step]);

  return (
    <div ref={tooltipRef} className="fixed z-[95] animate-pop-in" style={{ top: pos.top, left: pos.left, width: 300 }}>
      <div className="rounded-2xl border-2 p-5 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--accent)' }}>
        {/* Progress bar */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: total }, (_, i) => (
            <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
              style={{ background: i <= stepNum ? 'var(--accent)' : 'var(--border)' }} />
          ))}
        </div>

        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{step.emoji}</span>
          <div>
            <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{step.title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{step.body}</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{stepNum + 1} of {total}</span>
          <div className="flex gap-2">
            <button onClick={onEnd} className="text-[10px] px-2 py-1 rounded-lg hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}>Skip</button>
            {stepNum > 0 && (
              <button onClick={onPrev} className="text-[10px] px-2 py-1 rounded-lg border hover:opacity-80"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>← Back</button>
            )}
            <button onClick={onNext}
              className="text-[10px] px-3 py-1 rounded-lg font-semibold text-white hover:scale-105 active:scale-95 transition-transform"
              style={{ background: 'var(--gradient-1)' }}>
              {stepNum === total - 1 ? 'Finish 🎉' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
