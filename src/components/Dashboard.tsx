import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { 
  collection, query, where, orderBy, onSnapshot, 
  doc, updateDoc, setDoc, addDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { 
  Calendar, Clock, ShieldCheck, Star, MessageSquare, 
  User, CheckCircle, Mail, AlertCircle, FileText, ChevronRight, X 
} from 'lucide-react';

interface DashboardProps {
  onOpenChat: (chatId: string) => void;
}

export default function Dashboard({ onOpenChat }: DashboardProps) {
  const [user, setUser] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab/view toggles
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'messages' | 'support'>('active');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  // Rejection/Selection Modal
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [targetVendor, setTargetVendor] = useState<{ id: string; name: string; amount?: number } | null>(null);

  // Review Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewLead, setReviewLead] = useState<any>(null);

  // Support
  const [supportText, setSupportText] = useState("");
  const [supportSuccess, setSupportSuccess] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // Listen to Leads in real-time
        const qLeads = query(
          collection(db, "leads"),
          where("customerId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const unsubLeads = onSnapshot(qLeads, (snapshot) => {
          setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        }, (err) => {
          console.error("Leads listening error:", err);
          setLoading(false);
        });

        // Listen to Chats in real-time
        const qChats = query(
          collection(db, "chats"),
          where("customerId", "==", currentUser.uid),
          orderBy("updatedAt", "desc")
        );
        const unsubChats = onSnapshot(qChats, (snapshot) => {
          setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (err) => {
          console.error("Chats listening error:", err);
        });

        return () => {
          unsubLeads();
          unsubChats();
        };
      } else {
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  const handleSelectWinner = (lead: any, vendorId: string, vendorName: string, amount?: number) => {
    setSelectedLead(lead);
    setTargetVendor({ id: vendorId, name: vendorName, amount });
    setShowSelectModal(true);
  };

  const submitWinnerSelection = async () => {
    if (!selectedLead || !targetVendor || !user) return;

    try {
      const chatId = `${selectedLead.id}_${targetVendor.id}`;

      // 1. Update Lead Status
      await updateDoc(doc(db, "leads", selectedLead.id), {
        status: "assigned",
        winnerId: targetVendor.id,
        rejectionFeedback: rejectionReason,
        assignedAt: serverTimestamp() || new Date(),
        reviewEmailSent: false
      });

      // 2. Initialize Chat Document
      await setDoc(doc(db, "chats", chatId), {
        id: chatId,
        leadId: selectedLead.id,
        customerId: user.uid,
        vendorId: targetVendor.id,
        vendorName: targetVendor.name,
        customerName: user.displayName || "Customer",
        lastMessage: "Winner selected! You can now start chatting.",
        lastSenderId: "system",
        updatedAt: serverTimestamp() || new Date(),
        createdAt: serverTimestamp() || new Date(),
        customerUnreadCount: 1,
        vendorUnreadCount: 0,
      }, { merge: true });

      // 3. Send Notification to Professional subcollection
      await addDoc(collection(db, "professionals", targetVendor.id, "notifications"), {
        type: "won",
        notificationMessage: `You won the lead! ${user.displayName || "Customer"} selected you.`,
        status: "unread",
        createdAt: serverTimestamp() || new Date(),
        leadId: selectedLead.id
      });

      alert(`Successfully selected ${targetVendor.name}! You can now chat in the messages tab.`);
      setShowSelectModal(false);
      setRejectionReason("");
      setSelectedLead(null);
      setTargetVendor(null);
      setActiveTab("messages");
    } catch (e: any) {
      console.error(e);
      alert("Error finalizing vendor selection: " + e.message);
    }
  };

  const handleOpenReview = (lead: any) => {
    setReviewLead(lead);
    setRating(5);
    setComment("");
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!reviewLead || !user) return;

    try {
      // 1. Create review document
      await addDoc(collection(db, "reviews"), {
        vendorId: reviewLead.winnerId,
        comment: comment,
        rating: rating,
        customerName: user.displayName || "Slyzah User",
        createdAt: serverTimestamp() || new Date(),
        leadId: reviewLead.id
      });

      // 2. Mark lead reviewed
      await updateDoc(doc(db, "leads", reviewLead.id), {
        hasReviewed: true,
        status: "completed"
      });

      alert("Thank you for your rating and feedback!");
      setShowReviewModal(false);
      setReviewLead(null);
    } catch (e: any) {
      console.error(e);
      alert("Error submitting review: " + e.message);
    }
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportText.trim() || !user) return;

    try {
      await addDoc(collection(db, "support_requests"), {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Client",
        message: supportText,
        status: "open",
        createdAt: serverTimestamp() || new Date()
      });
      setSupportSuccess(true);
      setSupportText("");
      setTimeout(() => setSupportSuccess(false), 5000);
    } catch (e) {
      console.error(e);
      alert("Failed to send support request. Check your connection.");
    }
  };

  const activeLeads = leads.filter(l => l.status !== 'completed' && l.status !== 'closed');
  const pastLeads = leads.filter(l => l.status === 'completed' || l.status === 'closed');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 font-sans">
      
      {/* Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-black font-display text-white uppercase tracking-tight">
          MY REQUEST DASHBOARD
        </h2>
        <p className="text-sm text-gold-500 font-bold uppercase tracking-widest mt-1">
          MANAGE YOUR ACTIVE QUOTES &amp; JOBS
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-navy-900 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => { setActiveTab('active'); setSelectedLead(null); }}
          className={`pb-4 px-4 font-bold text-sm tracking-wider uppercase whitespace-nowrap transition border-b-2 ${
            activeTab === 'active' 
              ? 'border-gold-500 text-gold-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Active Requests ({activeLeads.length})
        </button>
        <button
          onClick={() => { setActiveTab('history'); setSelectedLead(null); }}
          className={`pb-4 px-4 font-bold text-sm tracking-wider uppercase whitespace-nowrap transition border-b-2 ${
            activeTab === 'history' 
              ? 'border-gold-500 text-gold-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          History ({pastLeads.length})
        </button>
        <button
          onClick={() => { setActiveTab('messages'); setSelectedLead(null); }}
          className={`pb-4 px-4 font-bold text-sm tracking-wider uppercase whitespace-nowrap transition border-b-2 ${
            activeTab === 'messages' 
              ? 'border-gold-500 text-gold-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Direct Messages ({chats.length})
        </button>
        <button
          onClick={() => { setActiveTab('support'); setSelectedLead(null); }}
          className={`pb-4 px-4 font-bold text-sm tracking-wider uppercase whitespace-nowrap transition border-b-2 ${
            activeTab === 'support' 
              ? 'border-gold-500 text-gold-500' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Support Hub
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: LISTS */}
        <div className={`lg:col-span-1 space-y-4 ${selectedLead ? 'hidden lg:block' : 'block'}`}>
          
          {/* Active Tab List */}
          {activeTab === 'active' && (
            activeLeads.length > 0 ? (
              activeLeads.map((lead) => (
                <div 
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-5 rounded-2xl border transition cursor-pointer ${
                    selectedLead?.id === lead.id 
                      ? 'bg-navy-900 border-gold-500' 
                      : 'bg-navy-950 border-navy-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black tracking-widest text-gold-500 uppercase">{lead.category}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      lead.status === 'assigned' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gold-500/10 text-gold-500'
                    }`}>
                      {lead.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm line-clamp-1">{lead.issueDescription}</h4>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5" /> {lead.town || lead.region}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {Object.keys(lead.quotes || {}).length} quotes</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 rounded-3xl bg-navy-950 border border-navy-850">
                <FileText className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No active quote requests.</p>
              </div>
            )
          )}

          {/* History Tab List */}
          {activeTab === 'history' && (
            pastLeads.length > 0 ? (
              pastLeads.map((lead) => (
                <div 
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`p-5 rounded-2xl border transition cursor-pointer ${
                    selectedLead?.id === lead.id 
                      ? 'bg-navy-900 border-gold-500' 
                      : 'bg-navy-950 border-navy-850 hover:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black tracking-widest text-gold-500 uppercase">{lead.category}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-800 text-slate-400">
                      {lead.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm line-clamp-1">{lead.issueDescription}</h4>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Completed</span>
                    {lead.hasReviewed ? (
                      <span className="flex items-center gap-0.5 text-emerald-400 font-bold"><Star className="h-3 w-3 fill-emerald-400" /> Reviewed</span>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenReview(lead); }}
                        className="text-gold-500 font-bold hover:underline"
                      >
                        Rate Pro
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 rounded-3xl bg-navy-950 border border-navy-850">
                <Calendar className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No past service requests.</p>
              </div>
            )
          )}

          {/* Messages List */}
          {activeTab === 'messages' && (
            chats.length > 0 ? (
              chats.map((chat) => (
                <div 
                  key={chat.id}
                  onClick={() => onOpenChat(chat.id)}
                  className="p-5 rounded-2xl border border-navy-850 bg-navy-950 hover:border-slate-800 transition cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <h4 className="font-bold text-white text-sm">{chat.vendorName || "Verified Professional"}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-1">{chat.lastMessage}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {chat.customerUnreadCount > 0 && (
                      <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-gold-500 text-[10px] font-black text-navy-950">
                        {chat.customerUnreadCount}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 rounded-3xl bg-navy-950 border border-navy-850">
                <MessageSquare className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">No chats initiated yet.</p>
              </div>
            )
          )}

          {/* Support Tab Content */}
          {activeTab === 'support' && (
            <div className="p-6 rounded-3xl bg-navy-950 border border-navy-850 space-y-6 lg:col-span-3">
              <div>
                <h4 className="text-lg font-black font-display text-white uppercase">Slyzah Support Center</h4>
                <p className="text-xs text-slate-400 mt-1">Need assistance with your quote or vendor? Our South African response team is here to help.</p>
              </div>

              {supportSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-xs flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Support ticket created successfully! We will get back to you shortly.
                </div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <textarea
                  required
                  rows={4}
                  placeholder="How can we assist you? Describe your issue in detail..."
                  value={supportText}
                  onChange={(e) => setSupportText(e.target.value)}
                  className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 p-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900 resize-none"
                />
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gold-500 text-navy-950 font-display font-black text-xs uppercase tracking-widest transition hover:scale-[1.01]"
                >
                  SUBMIT HELP REQUEST
                </button>
              </form>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: WORKSPACE DETAILS */}
        <div className="lg:col-span-2">
          {selectedLead ? (
            <div className="rounded-3xl bg-navy-950 border border-navy-850 p-6 md:p-8 space-y-6">
              
              {/* Back button for mobile */}
              <button 
                onClick={() => setSelectedLead(null)}
                className="lg:hidden flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to list
              </button>

              <div className="flex justify-between items-start border-b border-navy-900 pb-5">
                <div>
                  <span className="text-xs font-black tracking-widest text-gold-500 uppercase">{selectedLead.category}</span>
                  <h3 className="text-xl font-bold text-white mt-1">{selectedLead.issueDescription}</h3>
                  <p className="text-xs text-slate-400 mt-1">📍 {selectedLead.town || selectedLead.region}</p>
                </div>
                <span className="text-xs bg-navy-900 text-slate-400 px-3 py-1 rounded-xl font-bold uppercase shrink-0 border border-navy-800">
                  {selectedLead.status}
                </span>
              </div>

              {selectedLead.imageUrl && (
                <div>
                  <span className="text-xs text-slate-500 block mb-2">REFERENCE ATTACHED IMAGE</span>
                  <img src={selectedLead.imageUrl} className="max-h-64 rounded-2xl object-cover" alt="Service attachment" />
                </div>
              )}

              {/* Matched Quotes Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  {selectedLead.status === 'assigned' ? "AWARDED VENDOR" : "MATCHED ESTIMATES &amp; QUOTES"}
                </h4>

                {/* If already assigned */}
                {selectedLead.status === 'assigned' && selectedLead.winnerId ? (
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-emerald-400 font-black tracking-widest uppercase">Assigned Professional</span>
                      <h5 className="font-bold text-white mt-1">
                        {selectedLead.quotes?.[selectedLead.winnerId]?.vendorName || "Matched Pro"}
                      </h5>
                      <p className="text-xs text-slate-400 mt-1">
                        Quote Amount: <span className="font-bold text-gold-500">R{selectedLead.quotes?.[selectedLead.winnerId]?.price || "TBD"}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => onOpenChat(`${selectedLead.id}_${selectedLead.winnerId}`)}
                      className="flex items-center gap-2 rounded-2xl bg-gold-500 hover:bg-gold-600 px-6 py-3 text-xs font-black font-display text-navy-950 uppercase transition"
                    >
                      <MessageSquare className="h-4 w-4" />
                      OPEN SECURE CHAT
                    </button>
                  </div>
                ) : (
                  /* Show potential quotes from pros */
                  Object.keys(selectedLead.quotes || {}).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(selectedLead.quotes).map(([vendorId, quoteObj]: [string, any]) => (
                        <div key={vendorId} className="p-5 rounded-2xl bg-navy-900/40 border border-navy-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div>
                            <h5 className="font-bold text-white">{quoteObj.vendorName || "Certified Pro"}</h5>
                            <p className="text-xs text-slate-400 mt-1">
                              Duration: <span className="text-slate-200 font-semibold">{quoteObj.duration || "N/A"}</span>
                            </p>
                            {quoteObj.comment && (
                              <p className="text-xs text-slate-300 italic mt-2">"{quoteObj.comment}"</p>
                            )}
                          </div>
                          <div className="flex flex-col md:items-end gap-2 shrink-0">
                            <span className="text-lg font-black text-gold-500">R {quoteObj.price || "0"}</span>
                            <button
                              onClick={() => handleSelectWinner(selectedLead, vendorId, quoteObj.vendorName, quoteObj.price)}
                              className="px-5 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-navy-950 text-xs font-black font-display uppercase tracking-widest transition"
                            >
                              ACCEPT QUOTE
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl border border-navy-900 bg-navy-900/20 text-center">
                      <Clock className="mx-auto h-8 w-8 text-slate-700 animate-pulse mb-2" />
                      <p className="text-sm text-slate-400 font-semibold">Waiting for estimates...</p>
                      <p className="text-xs text-slate-600 mt-1">Verified professionals matching your region are reviewing the lead details.</p>
                    </div>
                  )
                )}
              </div>

            </div>
          ) : (
            activeTab !== 'support' && (
              <div className="hidden lg:flex flex-col items-center justify-center rounded-3xl bg-navy-950 border border-navy-850 p-20 text-center min-h-[400px]">
                <FileText className="h-14 w-14 text-slate-700 mb-4" />
                <h4 className="text-lg font-bold text-white">No Request Selected</h4>
                <p className="text-sm text-slate-500 max-w-xs mt-1">Select a service quote request from the left sidebar to view matched bids, estimates, and chat logs.</p>
              </div>
            )
          )}
        </div>

      </div>

      {/* WINNER SELECTION MODAL */}
      {showSelectModal && targetVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-navy-950 border border-navy-850 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black font-display text-white uppercase">Accept Quote</h3>
              <button onClick={() => setShowSelectModal(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <p className="text-sm text-slate-300">
              You are selecting <span className="font-bold text-gold-500">{targetVendor.name}</span> for your request. 
              A secure direct chat channel will open immediately.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Feedback / Reason (Optional)</label>
              <textarea
                rows={3}
                placeholder="Let them know why you chose them, or provide scheduling preferences..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 p-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900 resize-none"
              />
            </div>

            <button
              onClick={submitWinnerSelection}
              className="w-full py-4 rounded-2xl bg-gold-500 text-navy-950 font-display font-black text-sm uppercase tracking-widest transition hover:scale-[1.01]"
            >
              CONFIRM &amp; ASSIGN PRO
            </button>
          </div>
        </div>
      )}

      {/* LEAVE REVIEW MODAL */}
      {showReviewModal && reviewLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-navy-950 border border-navy-850 rounded-3xl p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black font-display text-white uppercase">Leave Review</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Rate Your Pro</p>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition transform hover:scale-110"
                  >
                    <Star className={`h-8 w-8 ${star <= rating ? 'text-gold-500 fill-gold-500' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Your Review Comment</label>
              <textarea
                rows={4}
                required
                placeholder="Share your experience working with this pro..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 p-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900 resize-none"
              />
            </div>

            <button
              onClick={submitReview}
              className="w-full py-4 rounded-2xl bg-gold-500 text-navy-950 font-display font-black text-sm uppercase tracking-widest transition hover:scale-[1.01]"
            >
              SUBMIT RATING
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// Minimal MapPin Icon helper to avoid additional imports
function MapPinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={props.className || "w-4 h-4"}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}
