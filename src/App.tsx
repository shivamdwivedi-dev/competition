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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden">
      
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

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Backend Error / Connection Banner */}
        {serverError && (
          <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-600/70 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-sm">Authoritative Backend Notice</p>
                <p className="text-xs text-amber-300/80 font-mono mt-0.5">{serverError}</p>
              </div>
            </div>
            <button
              onClick={() => retryConnection()}
              className="px-3 py-1.5 rounded-xl bg-amber-900/80 hover:bg-amber-800 text-amber-100 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors cursor-pointer self-end sm:self-center"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Loading / Offline Connecting State */}
        {!auction ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-5 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-2xl">
              {isLoading ? (
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-amber-400" />
              )}
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-base font-bold text-slate-200">
                {isLoading ? 'Connecting to Authoritative Backend' : 'Waiting for Backend Connection'}
              </h3>
              <p className="font-mono text-xs text-slate-400 leading-relaxed">
                Target Backend: <span className="text-cyan-400">http://localhost:5001</span><br />
                Target Auction ID: <span className="text-slate-300 font-mono">{currentAuctionId || '8281326b-58ca-4f4a-9bb2-845927b0667a'}</span>
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                Auto-reconnecting every 3.5 seconds...
              </p>
            </div>
            <button
              onClick={() => retryConnection()}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-colors cursor-pointer flex items-center space-x-2 shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection Now</span>
            </button>
          </div>
        ) : (
          <>
            {/* Auction Product Header */}
            <AuctionHeader auction={auction} />

            {/* Core Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              
              {/* Left Column: Bidding Controls (7 Cols) */}
              <div className="lg:col-span-7 space-y-4 sm:space-y-6">
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

              {/* Right Column: Live Feed (5 Cols) */}
              <div className="lg:col-span-5 space-y-4 sm:space-y-6">
                <LiveBidFeed
                  bids={bids}
                  currentUserId={user.id}
                />
              </div>

            </div>

            {/* Telemetry Stats */}
            <SystemStatusCard telemetry={telemetry} />
          </>
        )}

      </main>

      {/* Auction Winner Overlay Modal */}
      {auction && (
        <WinnerModal
          auction={auction}
          user={user}
          onReset={() => refreshAuthoritativeAuction(currentAuctionId)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-[11px] font-mono text-slate-500">
        Team 4-WARRIORS • SYNORA Pitstop 01 • Real-Time Auction Engine
      </footer>

    </div>
  );
}

export default App;
