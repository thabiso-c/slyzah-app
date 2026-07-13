import React, { useState, useRef } from 'react';
import { db, storage, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  ArrowLeft, ArrowRight, ShieldCheck, Upload, Trash2, 
  User, Phone, Mail, MapPin, FileText, AlertTriangle 
} from 'lucide-react';

interface RequestQuoteProps {
  category: string;
  userRegion: string;
  selectedVendorIds?: string[];
  onBack: () => void;
  onSubmitSuccess: () => void;
}

export default function RequestQuote({ 
  category, 
  userRegion, 
  selectedVendorIds = [], 
  onBack, 
  onSubmitSuccess 
}: RequestQuoteProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [name, setName] = useState(auth.currentUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(auth.currentUser?.email || '');
  const [address, setAddress] = useState('');
  const [town, setTown] = useState(userRegion || '');
  const [issue, setIssue] = useState('');
  const [urgency, setUrgency] = useState<'urgent' | 'standard' | 'comparing'>('standard');
  const [agreed, setAgreed] = useState(false);
  
  // Image uploading
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setImagePreview(URL.createObjectURL(selectedFile));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    }
  };

  const removeFile = () => {
    setFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(prev => prev + 1);
      return;
    }

    if (!agreed) {
      alert("Please agree to the terms to submit your request.");
      return;
    }

    setLoading(true);
    const user = auth.currentUser;
    
    try {
      let imageUrl = '';
      if (file && user) {
        try {
          const storageRef = ref(storage, `leads/${user.uid}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          imageUrl = await getDownloadURL(snapshot.ref);
        } catch (storageErr) {
          console.warn("[Firebase Storage] Upload failed, falling back to local object URL mock", storageErr);
          imageUrl = imagePreview || '';
        }
      }

      const leadData = {
        customerId: user?.uid || 'guest_user',
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
        issueDescription: issue,
        address: address,
        imageUrl: imageUrl,
        town: town || userRegion,
        category: category,
        region: userRegion,
        urgency: urgency,
        vendorIds: selectedVendorIds,
        status: "open",
        createdAt: serverTimestamp() || new Date(),
        quotes: {}
      };

      // Write request to Firestore
      await addDoc(collection(db, "leads"), leadData);
      
      // Also write simple system notification/lead trigger for matched professionals
      // In Slyzah, matched pros listen to the 'leads' collection directly or via cloud function
      
      alert("Quote request submitted successfully!");
      onSubmitSuccess();
    } catch (err: any) {
      console.error(err);
      alert("Failed to submit request: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 font-sans">
      
      {/* Upper Navigation Indicator */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </button>
        <div className="text-right">
          <span className="text-xs font-black tracking-widest text-gold-500 uppercase">
            STEP {step} OF 3
          </span>
          <p className="text-sm font-bold text-white">
            {step === 1 && "Contact Information"}
            {step === 2 && "Describe Your Need"}
            {step === 3 && "Review & Complete"}
          </p>
        </div>
      </div>

      {/* Progress Line */}
      <div className="h-1.5 w-full bg-navy-950 rounded-full mb-8 overflow-hidden">
        <div 
          className="h-full bg-gold-500 transition-all duration-300" 
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-navy-950 border border-navy-850 rounded-3xl p-6 md:p-8 shadow-xl">
        
        {/* STEP 1: CONTACT DETAILS */}
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-black font-display text-white uppercase tracking-tight">
              Where &amp; Who are you?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g., 082 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Town / Suburb</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Town or suburb (e.g., Bellville)"
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Street Address (Optional)</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Street name & number"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DESCRIBE THE NEED */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-black font-display text-white uppercase tracking-tight">
              Request Details for <span className="text-gold-500">{category}</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Describe the issue / work needed</label>
              <div className="relative">
                <FileText className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                <textarea
                  required
                  rows={4}
                  placeholder="Please describe what needs to be fixed or installed as clearly as possible. E.g., Burst pipe under the kitchen sink, leaking actively."
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="w-full rounded-2xl border border-navy-800 bg-navy-900/60 py-3.5 pl-12 pr-4 text-sm text-white placeholder-slate-500 outline-none focus:border-gold-500 focus:bg-navy-900 resize-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Job Urgency</label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setUrgency('urgent')}
                  className={`py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider transition ${
                    urgency === 'urgent' 
                      ? 'bg-red-500/20 border-red-500 text-red-400' 
                      : 'border-navy-800 hover:border-slate-700 bg-navy-900/30 text-slate-300'
                  }`}
                >
                  ⚡ URGENT (Active Leak/Danger)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('standard')}
                  className={`py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider transition ${
                    urgency === 'standard' 
                      ? 'bg-gold-500/15 border-gold-500 text-gold-500' 
                      : 'border-navy-800 hover:border-slate-700 bg-navy-900/30 text-slate-300'
                  }`}
                >
                  ⏳ STANDARD (Few days)
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('comparing')}
                  className={`py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider transition ${
                    urgency === 'comparing' 
                      ? 'bg-blue-500/20 border-blue-500 text-blue-400' 
                      : 'border-navy-800 hover:border-slate-700 bg-navy-900/30 text-slate-300'
                  }`}
                >
                  📊 COMPARING RATES
                </button>
              </div>
            </div>

            {/* Drag & Drop File Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Reference Image (Optional)</label>
              
              {!imagePreview ? (
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-navy-800 hover:border-gold-500/40 bg-navy-900/30 rounded-2xl p-6 text-center cursor-pointer transition"
                >
                  <Upload className="h-8 w-8 text-slate-500 mb-2" />
                  <p className="text-sm text-slate-300 font-semibold">Drag &amp; drop an image here, or click to browse</p>
                  <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, or WEBP (Max 5MB)</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-navy-800 max-h-60 flex items-center justify-center bg-black/40">
                  <img src={imagePreview} alt="Reference Preview" className="max-h-60 object-contain" />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-3 right-3 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition shadow-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & TERMS */}
        {step === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-black font-display text-white uppercase tracking-tight">
              Review Your Quote Request
            </h3>

            <div className="rounded-2xl bg-navy-900/50 border border-navy-900 p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500 block">SERVICE CATEGORY</span>
                  <span className="font-bold text-gold-500">{category}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">URGENCY</span>
                  <span className={`font-bold uppercase ${urgency === 'urgent' ? 'text-red-400' : urgency === 'standard' ? 'text-gold-500' : 'text-blue-400'}`}>
                    {urgency}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">CUSTOMER</span>
                  <span className="font-bold text-white">{name} ({phone})</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">TOWN / REGION</span>
                  <span className="font-bold text-white">{town || userRegion}</span>
                </div>
              </div>
              
              <div className="border-t border-navy-850 pt-3">
                <span className="text-xs text-slate-500 block">ISSUE DESCRIPTION</span>
                <p className="text-slate-300 leading-relaxed italic">"{issue}"</p>
              </div>

              {imagePreview && (
                <div className="border-t border-navy-850 pt-3">
                  <span className="text-xs text-slate-500 block mb-2">REFERENCE IMAGE ATTACHED</span>
                  <img src={imagePreview} className="h-20 rounded-lg object-cover" alt="Attached Ref" />
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-gold-500/15 bg-gold-500/5 p-4">
              <AlertTriangle className="h-5 w-5 text-gold-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                By submitting this lead, you understand that your contact info (Name, Phone, Email) will be shared 
                exclusively with approved Slyzah vendors to facilitate your quotes. This is secure and CIPC-compliant.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="agree-lead-terms"
                required
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="h-5 w-5 rounded border-navy-800 bg-navy-900 text-gold-500 focus:ring-gold-500 cursor-pointer accent-gold-500"
              />
              <label htmlFor="agree-lead-terms" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                I authorize Slyzah to share my request details with certified local professionals.
              </label>
            </div>
          </div>
        )}

        {/* Form Action Buttons */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-navy-900">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(prev => prev - 1)}
              className="px-6 py-3 border border-navy-800 hover:border-slate-700 bg-navy-900/40 text-sm font-semibold text-slate-300 rounded-2xl transition"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={loading || (step === 3 && !agreed)}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-8 py-3.5 font-display text-sm font-black tracking-widest text-navy-950 uppercase transition hover:scale-[1.02] disabled:opacity-30 disabled:hover:scale-100"
          >
            {loading ? "SUBMITTING..." : (
              <>
                {step < 3 ? "Next Step" : "SUBMIT REQUEST"}
                {step < 3 ? <ArrowRight className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
