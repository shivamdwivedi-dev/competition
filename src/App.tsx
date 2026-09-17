import { useAuction } from './hooks/useAuction';
import { Navbar } from './components/Navbar';
import { AuctionHeader } from './components/AuctionHeader';
import { CurrentBidCard } from './components/CurrentBidCard';
import { BidForm } from './components/BidForm';
import { LiveBidFeed } from './components/LiveBidFeed';
import { SystemStatusCard } from './components/SystemStatusCard';
import { DemoToolbar } from './components/DemoToolbar';
import { WinnerModal } from './components/WinnerModal';

export function App() {
  const {
    auction,
    bids,
    user,
    telemetry,
    isConnected,
    isSubmitting,
    lastBidError,
    outbidAlert,
    highBidFlash,
    isSimulatingLoad,
    setOutbidAlert,
    submitBid,
    toggleLoadSimulation,
    extendAuctionTime,
    resetAuction,
    switchUser,
  } = useAuction();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      
      <Navbar
        isConnected={isConnected}
        user={user}
        onSwitchUser={switchUser}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        <DemoToolbar
          isSimulatingLoad={isSimulatingLoad}
          onToggleLoadSimulation={toggleLoadSimulation}
          onExtendTime={extendAuctionTime}
          onResetAuction={resetAuction}
        />

        <AuctionHeader auction={auction} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 space-y-6">
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

          <div className="lg:col-span-5 space-y-6">
            <LiveBidFeed
              bids={bids}
              currentUserId={user.id}
            />
          </div>

        </div>

        <SystemStatusCard telemetry={telemetry} />

      </main>

      <WinnerModal
        auction={auction}
        user={user}
        onReset={resetAuction}
      />

      <footer className="border-t border-slate-900 py-4 text-center text-xs font-mono text-slate-500">
        Team 4-WARRIORS • SYNORA Pitstop 01 • Frontend UI-UX by Piyush
      </footer>

    </div>
  );
}

export default App;
