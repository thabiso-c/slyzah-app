import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { 
  doc, onSnapshot, collection, query, orderBy, addDoc, 
  updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { 
  ArrowLeft, Send, ShieldCheck, User, Sparkles, Clock 
} from 'lucide-react';

interface ChatProps {
  chatId: string;
  onBack: () => void;
}

export default function Chat({ chatId, onBack }: ChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [chatMeta, setChatMeta] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (!u) return;
      setUser(u);

      // Listen to Chat metadata
      const unsubMeta = onSnapshot(doc(db, "chats", chatId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setChatMeta(data);
          setLoading(false);

          // Check other typing status
          if (data.typingStatus) {
            const isOtherTyping = Object.entries(data.typingStatus).some(
              ([uid, status]) => uid !== u.uid && status === true
            );
            setIsTyping(isOtherTyping);
          }
        } else {
          alert("Chat session not found.");
          onBack();
        }
      });

      // Listen to Message items
      const qMsgs = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("timestamp", "asc")
      );
      const unsubMsgs = onSnapshot(qMsgs, (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubMeta();
        unsubMsgs();
      };
    });

    return () => unsubAuth();
  }, [chatId]);

  // Mark messages as read on entry & new messages
  useEffect(() => {
    if (!chatId || !user || !chatMeta) return;

    const markRead = async () => {
      await updateDoc(doc(db, "chats", chatId), {
        customerLastRead: serverTimestamp() || new Date(),
        customerUnreadCount: 0
      });
    };
    markRead();
  }, [messages.length, chatId, user, chatMeta]);

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTypingStatus = async (status: boolean) => {
    if (!user || !chatId) return;
    try {
      await updateDoc(doc(db, "chats", chatId), {
        [`typingStatus.${user.uid}`]: status
      });
    } catch (err) {
      console.warn("Error updating typing indicator:", err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !chatMeta) return;

    const text = newMessage.trim();
    setNewMessage("");
    handleTypingStatus(false);

    try {
      // 1. Add Message Doc
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text,
        senderId: user.uid,
        senderName: user.displayName || "Customer",
        timestamp: serverTimestamp() || new Date(),
      });

      // 2. Update Chat Meta last message
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text,
        lastSenderId: user.uid,
        updatedAt: serverTimestamp() || new Date(),
        vendorUnreadCount: (chatMeta.vendorUnreadCount || 0) + 1
      });

      // 3. Queue vendor notification
      await addDoc(collection(db, "professionals", chatMeta.vendorId, "notifications"), {
        type: "message",
        notificationMessage: `New message from ${user.displayName || "Customer"}`,
        status: "unread",
        createdAt: serverTimestamp() || new Date(),
        chatId: chatId
      });

    } catch (e) {
      console.error(e);
      alert("Error sending message. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-slate-950 min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  const otherName = chatMeta?.vendorName || "Verified Professional";

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-950 text-white font-sans">
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between border-b border-navy-900 bg-navy-950/80 px-4 py-4 md:px-8 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-navy-900 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-navy-900 to-navy-850 border border-gold-500/30 text-gold-500 font-bold uppercase shadow-md shadow-black/30">
              {otherName.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-white text-sm md:text-base">{otherName}</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] md:text-xs text-slate-400 font-medium">Secure Connected Line</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/5 px-3 py-1 text-emerald-400 shrink-0">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">Protected</span>
        </div>
      </div>

      {/* MESSAGES SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        
        {/* Connection Notice */}
        <div className="mx-auto max-w-sm rounded-2xl border border-navy-900 bg-navy-950/40 p-4 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-gold-500 mb-1" />
          <p className="text-xs font-bold text-slate-300">Direct Chat Connected</p>
          <p className="text-[10px] text-slate-500 mt-1">Quotes, schedules, and arrangements made here are stored securely inside the Slyzah Client Vault.</p>
        </div>

        {/* Message bubbles */}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          
          return (
            <div 
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-lg ${
                isMe 
                  ? 'bg-gold-500 text-navy-950 rounded-tr-none font-medium' 
                  : 'bg-navy-900 text-slate-100 rounded-tl-none border border-navy-850'
              }`}>
                {!isMe && (
                  <span className="text-[10px] text-gold-500 font-bold uppercase tracking-wider block mb-1">
                    {otherName}
                  </span>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                
                <div className={`flex items-center gap-1 mt-1.5 justify-end text-[9px] ${
                  isMe ? 'text-navy-900/60' : 'text-slate-500'
                }`}>
                  <Clock className="h-2.5 w-2.5" />
                  <span>
                    {msg.timestamp?.seconds 
                      ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator bubble */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="rounded-2xl p-4 bg-navy-900 border border-navy-850 rounded-tl-none flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM CONTAINER */}
      <form 
        onSubmit={handleSend}
        className="border-t border-navy-900 bg-navy-950 p-4 md:px-8 shrink-0"
      >
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onFocus={() => handleTypingStatus(true)}
            onBlur={() => handleTypingStatus(false)}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTypingStatus(e.target.value.trim().length > 0);
            }}
            className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-4 pl-5 pr-16 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 p-2.5 rounded-xl bg-gold-500 text-navy-950 hover:bg-gold-600 active:scale-95 disabled:opacity-40 disabled:hover:bg-gold-500 transition shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

    </div>
  );
}
