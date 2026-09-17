import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, Clock, Tag, Image, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { AuctionItem } from '../types/auction';

interface HostAuctionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuctionCreated: (params: {
    title: string;
    startingPrice: number;
    durationSeconds: number;
    imageUrl?: string;
    description?: string;
  }) => Promise<AuctionItem>;
}

const PRESET_IMAGES = [
  {
    name: 'Mechanical Watch',
    url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Custom Keyboard',
    url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Retro Sneaker',
    url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Vintage Camera',
    url: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1200&q=80',
  },
];

const DURATION_OPTIONS = [
  { label: '2 mins (Fast Test)', seconds: 120 },
  { label: '5 mins (Standard)', seconds: 300 },
  { label: '10 mins', seconds: 600 },
  { label: '15 mins', seconds: 900 },
  { label: '30 mins', seconds: 1800 },
];

export const HostAuctionModal: React.FC<HostAuctionModalProps> = ({
  isOpen,
  onClose,
  onAuctionCreated,
}) => {
  const [title, setTitle] = useState('');
  const [startingPrice, setStartingPrice] = useState('500');
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file must be under 5MB.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please provide an auction item title.');
      return;
    }

    const priceNum = parseFloat(startingPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Starting price must be a valid positive number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAuctionCreated({
        title: trimmedTitle,
        startingPrice: priceNum,
        durationSeconds,
        imageUrl: imageUrl || PRESET_IMAGES[0].url,
        description: description.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        // Reset form
        setTitle('');
        setStartingPrice('500');
        setDurationSeconds(300);
        setDescription('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to create auction on backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl my-6 rounded-3xl glass-strong p-5 sm:p-7 shadow-2xl shadow-black/80 border border-white/10 z-10 space-y-5 text-slate-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20 flex-shrink-0">
              <div className="w-full h-full bg-[#060b18] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-300" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                Host / Create New Auction
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Atomic Redis Lua Hash · Broadcasts Live Instantly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl glass hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 font-mono animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Auction Created Successfully! Switching view now...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Item Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Item Title *</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cyberpunk Custom Mechanical Keyboard"
              className="w-full glass border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 placeholder:text-slate-600 transition-all"
            />
          </div>

          {/* Item Image Upload & Presets */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-purple-400" />
              <span>Item Photo / Image</span>
            </label>

            <div className="flex flex-col sm:flex-row gap-3 items-start">
              {/* Preview Thumbnail */}
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden glass border border-white/15 flex-shrink-0 shadow-lg group">
                <img
                  src={imageUrl}
                  alt="Auction Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] font-mono text-white font-bold">
                  Preview
                </div>
              </div>

              {/* Upload & Choice Controls */}
              <div className="flex-1 space-y-2 w-full">
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2.5 px-3 rounded-xl glass hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Upload Image File</span>
                  </button>
                </div>

                {/* Preset Chips */}
                <div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                    Or select quick preset:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setImageUrl(preset.url)}
                        className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-medium border transition-all truncate cursor-pointer ${
                          imageUrl === preset.url
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                            : 'glass border-white/5 text-slate-400 hover:text-white hover:border-white/15'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Starting Price & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Starting Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Starting Price (₹) *</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">₹</span>
                <input
                  type="number"
                  required
                  min={1}
                  step={10}
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  placeholder="500"
                  className="w-full glass border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 placeholder:text-slate-600 transition-all"
                />
              </div>

              {/* Price shortcut pills */}
              <div className="flex gap-1 pt-1">
                {[500, 1000, 2500, 5000].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setStartingPrice(String(p))}
                    className="flex-1 py-1 rounded-lg glass border border-white/5 text-[10px] font-mono text-slate-400 hover:text-white hover:border-cyan-400/40 transition-colors cursor-pointer"
                  >
                    ₹{p}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Auction Duration</span>
              </label>
              <select
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="w-full glass border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 bg-slate-900 cursor-pointer"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.seconds} value={opt.seconds} className="bg-slate-950 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 font-mono">
                Countdown timer runs atomically from end time.
              </p>
            </div>

          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide condition, features, or verification notes..."
              className="w-full glass border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 resize-none font-sans"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-3 rounded-2xl glass hover:bg-white/10 border border-white/10 text-slate-300 font-mono text-xs font-bold transition-all cursor-pointer flex-shrink-0"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || success}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 text-white font-mono text-sm font-extrabold tracking-wide flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.01] active:scale-[0.99] border border-white/15 transition-all cursor-pointer disabled:opacity-50 min-h-[48px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Committing to Redis Lua...</span>
                </>
              ) : success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Auction Live!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Launch Live Auction</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
