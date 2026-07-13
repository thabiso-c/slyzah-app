import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { FileText, ShieldAlert, CheckCircle } from 'lucide-react';

interface TermsProps {
  userId: string;
  onAccepted: () => void;
}

export default function Terms({ userId, onAccepted }: TermsProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        hasAcceptedTerms: true
      });
      onAccepted();
    } catch (e) {
      console.error(e);
      alert("Error saving terms agreement. Please check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 font-sans">
      <div className="w-full max-w-2xl space-y-6 rounded-3xl border border-navy-800 bg-navy-950 p-8 shadow-2xl">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gold-500" />
          <h2 className="mt-4 font-display text-2xl font-black text-white uppercase tracking-tight">
            Terms &amp; Service Agreement
          </h2>
          <p className="mt-1 text-xs text-gold-500 font-bold uppercase tracking-wider">
            Slyzah Client Ecosystem Guidelines
          </p>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-2xl border border-navy-900 bg-navy-900/40 p-5 text-sm leading-relaxed text-slate-300 space-y-4">
          <p className="font-bold text-white text-base">Welcome to Slyzah</p>
          <p>
            By joining Slyzah, you agree to connect with registered, independent service professionals in South Africa.
            Slyzah operates solely as an interactive directory, connection facilitator, and quote engine.
          </p>
          <p className="font-bold text-gold-500">1. Verification Policy</p>
          <p>
            While Slyzah validates certain professional credentials (such as PIRB, Wireman, or NHBRC memberships), 
            we strongly advise clients to perform standard due diligence before issuing payments or granting 
            access to private properties.
          </p>
          <p className="font-bold text-gold-500">2. Real-time Lead Submissions</p>
          <p>
            When you request a quote, your project description, locality, and selected visuals will be forwarded 
            to approved professionals matching your criteria. Service quotes will be updated live in your dashboard.
          </p>
          <p className="font-bold text-gold-500">3. Secure Communications</p>
          <p>
            All chats, images, and quotes shared inside the platform are confidential and protected. You agree to 
            interact respectfully and avoid sharing unsolicited external content.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-gold-500/10 bg-gold-500/5 p-4">
          <ShieldAlert className="h-5 w-5 text-gold-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-400">
            Slyzah is built for trustworthy community commerce. Any reports of fraudulent behavior or 
            unprofessional activity will result in immediate termination of account privileges.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="agree-checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-5 w-5 rounded border-navy-800 bg-navy-900 text-gold-500 focus:ring-gold-500 cursor-pointer accent-gold-500"
          />
          <label htmlFor="agree-checkbox" className="text-sm font-semibold text-slate-300 cursor-pointer select-none">
            I agree to the terms, conditions, and community safety guidelines of Slyzah.
          </label>
        </div>

        <button
          onClick={handleAccept}
          disabled={!agreed || loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 py-4 font-display text-sm font-black tracking-widest text-navy-950 uppercase transition-all duration-200 hover:scale-[1.01] disabled:opacity-30 disabled:hover:scale-100"
        >
          {loading ? "SAVING DECISION..." : "I ACCEPT THE TERMS"}
          <CheckCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
