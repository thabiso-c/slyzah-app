import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Lock, Mail, User, Phone, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface AuthProps {
  onSuccess?: () => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess?.();
      } else if (mode === 'register') {
        if (!displayName.trim() || !phone.trim()) {
          throw new Error("Full Name and Phone Number are required");
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName });
        
        // Save client profile to Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName,
          phone,
          role: 'client',
          hasAcceptedTerms: false,
          createdAt: serverTimestamp()
        });

        onSuccess?.();
      } else if (mode === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg("Password reset email sent! Please check your inbox.");
        setTimeout(() => setMode('login'), 4000);
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || "An authentication error occurred.";
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        msg = "Invalid email or password.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "This email is already in use.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 font-sans">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-navy-800 bg-navy-950 p-8 shadow-2xl shadow-black/50">
        
        {/* Header logo / slogan */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-navy-850 border border-gold-500/30 text-gold-500">
            <span className="font-display text-2xl font-black tracking-tighter">S</span>
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-white font-display uppercase">
            SLYZAH <span className="text-gold-500">CLIENT</span>
          </h2>
          <p className="mt-2 text-xs font-bold tracking-widest text-gold-500/80 uppercase">
            {mode === 'login' && "Access South Africa's Elite Pros"}
            {mode === 'register' && "Join the Premium Service Network"}
            {mode === 'forgot' && "Recover Your Access Credential"}
          </p>
        </div>

        {/* Message banners */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleAuth}>
          {mode === 'register' && (
            <>
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-gold-500 focus:bg-navy-900"
                />
              </div>

              <div className="relative">
                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                <input
                  type="tel"
                  required
                  placeholder="Phone Number (e.g., 082 123 4567)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-gold-500 focus:bg-navy-900"
                />
              </div>
            </>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
            <input
              type="email"
              required
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-gold-500 focus:bg-navy-900"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-gold-500 focus:bg-navy-900"
              />
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-xs font-semibold text-gold-500 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-500 py-4 font-display text-sm font-black tracking-widest text-navy-950 uppercase transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : (
              <>
                {mode === 'login' && "LOGIN TO ACCOUNT"}
                {mode === 'register' && "REGISTER NOW"}
                {mode === 'forgot' && "SEND RESET LINK"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          {mode === 'login' ? (
            <p>
              New to Slyzah?{" "}
              <button
                onClick={() => setMode('register')}
                className="font-bold text-gold-500 hover:underline"
              >
                Register a client account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => setMode('login')}
                className="font-bold text-gold-500 hover:underline"
              >
                Back to login
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
