import { useAuction } from './hooks/useAuction';
import { Navbar } from './components/Navbar';
import { AuctionHeader } from './components/AuctionHeader';
import { CurrentBidCard } from './components/CurrentBidCard';
import { BidForm } from './components/BidForm';
import { LiveBidFeed } from './components/LiveBidFeed';
import { SystemStatusCard } from './components/SystemStatusCard';
import { WinnerModal } from './components/WinnerModal';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';

export function App() {
  const {
    auction,
    bids,
    user,
    telemetry,
    availableAuctions,
    currentAuctionId,
    isConnected,
    isLoading,
    serverError,
    isSubmitting,
    lastBidError,
    outbidAlert,
    highBidFlash,
    setOutbidAlert,
    submitBid,
    switchAuction,
    switchUser,
    refreshAuthoritativeAuction,
    retryConnection,
  } = useAuction();

  return (
    <div className="min-h-screen bg-[#060b18] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden relative">

      {/* Animated Background Orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Top Navigation */}
      <Navbar
        isConnected={isConnected}
        user={user}
        availableAuctions={availableAuctions}
        currentAuctionId={currentAuctionId}
        onSwitchAuction={switchAuction}
        onSwitchUser={switchUser}
        onRefresh={() => retryConnection()}
      />

      {/* Main Content */}
      <main className="relative flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5 sm:space-y-6 z-10">

        {/* Backend Error Banner */}
        {serverError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-200">Backend Notice</p>
                <p className="text-xs text-amber-400/70 font-mono mt-0.5">{serverError}</p>
              </div>
            </div>
            <button
              onClick={() => retryConnection()}
              className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-amber-500/25 hover:border-amber-400/40 self-end sm:self-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Offline / Loading State */}
        {!auction ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-6 text-center px-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400/20 to-indigo-600/20 blur-xl scale-110 pointer-events-none" />
              <div className="relative w-20 h-20 rounded-3xl glass-strong border border-white/10 flex items-center justify-center shadow-2xl">
                {isLoading ? (
                  <Loader2 className="w-9 h-9 text-cyan-400 animate-spin" />
                ) : (
                  <AlertTriangle className="w-9 h-9 text-amber-400" />
                )}
              </div>
            </div>
            <div className="max-w-md space-y-2.5">
              <h3 className="text-xl font-black text-white">
                {isLoading ? 'Connecting to Backend...' : 'Waiting for Connection'}
              </h3>
              <p className="font-mono text-sm text-slate-400 leading-relaxed">
                <span className="text-slate-500">Backend: </span>
                <span className="text-cyan-400">http://localhost:5001</span>
              </p>
              <p className="text-[11px] text-slate-600 font-mono">
                Auto-reconnecting every 3.5s
              </p>
            </div>
            <button
              onClick={() => retryConnection()}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-mono text-sm font-bold transition-all cursor-pointer flex items-center gap-2.5 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Now</span>
            </button>
          </div>
        ) : (
          <>
            {/* Auction Header */}
            <AuctionHeader auction={auction} />

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">

              {/* Left: Bid Controls */}
              <div className="lg:col-span-7 space-y-5 sm:space-y-6">
                <CurrentBidCard
                  auction={auction}
                  user={user}
                  highBidFlash={highBidFlash}
                  outbidAlert={outbidAlert}
                  onDismissAlert={() => setOutbidAlert(false)}
                />
                <BidForm
                  auction={auction}
                  user={user}
                  isSubmitting={isSubmitting}
                  lastError={lastBidError}
                  onSubmitBid={submitBid}
                />
              </div>

              {/* Right: Live Feed */}
              <div className="lg:col-span-5">
                <LiveBidFeed
                  bids={bids}
                  currentUserId={user.id}
                />
              </div>

            </div>

            {/* System Telemetry */}
            <SystemStatusCard telemetry={telemetry} />
          </>
        )}

      </main>

      {/* Winner Modal */}
      {auction && (
        <WinnerModal
          auction={auction}
          user={user}
          onReset={() => refreshAuthoritativeAuction(currentAuctionId)}
        />
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-4 text-center text-[11px] font-mono text-slate-600">
        Team 4-WARRIORS &nbsp;•&nbsp; SYNORA Pitstop 01 &nbsp;•&nbsp; Real-Time Auction Engine
      </footer>

    </div>
  );
}

export default App;
