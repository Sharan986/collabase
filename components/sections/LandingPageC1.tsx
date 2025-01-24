// LANDING PAGE - GEN-Z AESTHETIC

"use client";

import { CrowdCanvas } from "@/components/ui/skiper39";
import { useAuth } from "@/lib/firebase-context";
import { useState } from "react";

const LandingPageC1 = () => {
  const { signInWithGoogle, user, loading } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  const handleSignInClick = () => {
    setShowWarning(true);
  };

  const handleProceed = () => {
    setShowWarning(false);
    signInWithGoogle();
  };

  return (
    <div className="relative min-h-screen w-full snap-y snap-mandatory overflow-y-scroll overflow-x-hidden h-screen">
      {/* Email Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <div className="backdrop-blur-xl bg-white/95 p-8 sm:p-10 md:p-12 rounded-3xl border-2 border-black/20 max-w-lg w-full shadow-2xl">
            <h3 className="font-[family-name:var(--font-pixel)] text-2xl sm:text-3xl mb-6 text-center tracking-wider">
              IMPORTANT NOTICE
            </h3>
            <div className="space-y-4 mb-8">
              <p className="font-sans text-lg sm:text-xl text-black/80 text-center leading-relaxed">
                Only <span className="font-bold text-black">ARKA JAIN UNIVERSITY students</span> are allowed to use this platform.
              </p>
              <p className="font-sans text-lg sm:text-xl text-black/80 text-center leading-relaxed">
                You <span className="font-bold text-black">must</span> sign in with your college email:
              </p>
              <p className="font-mono text-base sm:text-lg text-center bg-black/5 py-3 px-4 rounded-lg border border-black/10">
                @arkajainuniversity.ac.in
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 bg-white text-black px-6 py-4 rounded-full font-display text-lg font-semibold border-2 border-black/20 hover:bg-black/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleProceed}
                className="flex-1 bg-black text-white px-6 py-4 rounded-full font-display text-lg font-semibold hover:bg-black/90 transition-all hover:scale-105 active:scale-95 shadow-xl"
              >
                Proceed →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Background - CrowdCanvas */}
      <div className="fixed inset-0 z-0 opacity-30">
        <CrowdCanvas src="/hero-peeps.png" rows={15} cols={7} />
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10">
        {/* Section 1: Hero */}
        <section className="flex h-screen w-full items-center justify-center px-4 sm:px-6 snap-start snap-always overflow-hidden relative">
          <div className="mx-auto max-w-7xl text-center w-full -mt-100 lg:-mt-55  sm:-mt-16 md:-mt-12 lg:-mt-8">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <p className="font-mono text-[0.625rem] sm:text-xs md:text-sm font-medium text-black/40 uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                Lost in the crowd?
              </p>
              <h1 className="font-[family-name:var(--font-pixel)] text-[clamp(1.75rem,9vw,7rem)] tracking-[0.05em] sm:tracking-[0.1em] leading-tight px-2 whitespace-nowrap lg:-mb-2">
                COLLABASE
              </h1>
              <p className="font-sans text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-light text-black/70 max-w-5xl mx-auto leading-relaxed px-4">
                Stop wasting time. Find your perfect hackathon team in <span className="font-semibold text-black">minutes</span>.
              </p>
            </div>
          </div>
          
          {/* Scroll Indicator */}
          <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
            <span className="font-mono text-[0.625rem] sm:text-xs text-black/40 uppercase tracking-[0.2em]">
              Scroll
            </span>
            <div className="w-6 h-10 sm:w-7 sm:h-12 rounded-full border-2 border-black/30 flex items-start justify-center p-1.5 sm:p-2">
              <div className="w-1.5 h-2.5 sm:w-2 sm:h-3 bg-black/40 rounded-full animate-[scrollPulse_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        </section>

        {/* Section 2: Problem */}
        <section className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-16 sm:py-20 md:py-32 snap-start snap-always">
          <div className="mx-auto max-w-7xl w-full">
            <h2 className="font-[family-name:var(--font-pixel)] text-[clamp(1.5rem,6vw,4rem)] mb-12 sm:mb-16 md:mb-20 text-center tracking-[0.1em] leading-tight px-2">
              Why Teams Fail?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 max-w-6xl mx-auto">
              <div className="backdrop-blur-lg bg-white/70 p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl sm:rounded-3xl border border-black/10 hover:border-black/20 transition-all hover:scale-[1.02] group">
                <div className="font-mono text-xs sm:text-sm text-black/40 mb-3 sm:mb-4 uppercase tracking-wider">01</div>
                <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 leading-tight">Last-minute panic</h3>
                <p className="font-sans text-base sm:text-lg md:text-xl text-black/60 leading-relaxed">
                  Scrambling to find teammates hours before submission. Sound familiar?
                </p>
              </div>
              <div className="backdrop-blur-lg bg-white/70 p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl sm:rounded-3xl border border-black/10 hover:border-black/20 transition-all hover:scale-[1.02] group">
                <div className="font-mono text-xs sm:text-sm text-black/40 mb-3 sm:mb-4 uppercase tracking-wider">02</div>
                <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 leading-tight">Skill overlap</h3>
                <p className="font-sans text-base sm:text-lg md:text-xl text-black/60 leading-relaxed">
                  Three frontend devs, zero designers. Or worse—all ideas, no execution.
                </p>
              </div>
              <div className="backdrop-blur-lg bg-white/70 p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl sm:rounded-3xl border border-black/10 hover:border-black/20 transition-all hover:scale-[1.02] group">
                <div className="font-mono text-xs sm:text-sm text-black/40 mb-3 sm:mb-4 uppercase tracking-wider">03</div>
                <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 leading-tight">Ghost teammates</h3>
                <p className="font-sans text-base sm:text-lg md:text-xl text-black/60 leading-relaxed">
                  Joined the team. Never showed up. Left you to carry everything.
                </p>
              </div>
              <div className="backdrop-blur-lg bg-white/70 p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl sm:rounded-3xl border border-black/10 hover:border-black/20 transition-all hover:scale-[1.02] group">
                <div className="font-mono text-xs sm:text-sm text-black/40 mb-3 sm:mb-4 uppercase tracking-wider">04</div>
                <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4 leading-tight">Energy mismatch</h3>
                <p className="font-sans text-base sm:text-lg md:text-xl text-black/60 leading-relaxed">
                  You're here to win. They're here for free pizza. Not the same vibe.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Solution */}
        <section className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-16 sm:py-20 md:py-32 snap-start snap-always">
          <div className="mx-auto max-w-6xl w-full">
            <h2 className="font-[family-name:var(--font-pixel)] text-[clamp(1.5rem,6vw,4rem)] mb-12 sm:mb-16 md:mb-20 text-center tracking-[0.1em] leading-tight px-2">
              How It Works!
            </h2>
            <div className="backdrop-blur-xl bg-white/80 p-8 sm:p-10 md:p-12 lg:p-16 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] border border-black/10 max-w-5xl mx-auto">
              <div className="space-y-8 sm:space-y-10 md:space-y-12">
                {/* Step 1 */}
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 md:gap-8 group">
                  <div className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold text-black/20 group-hover:text-black/40 transition-colors min-w-[3rem] sm:min-w-[4rem]">01</div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 leading-tight">Verify with college email</h3>
                    <p className="font-sans text-base sm:text-lg md:text-xl lg:text-2xl text-black/60 leading-relaxed">
                      Use your college email <span className="font-mono text-sm sm:text-base md:text-lg text-black/40">@arkajainuniversity.ac.in</span> to join your hackathon's pool.
                    </p>
                  </div>
                </div>
                
                <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
                
                {/* Step 2 */}
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 md:gap-8 group">
                  <div className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold text-black/20 group-hover:text-black/40 transition-colors min-w-[3rem] sm:min-w-[4rem]">02</div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 leading-tight">Pick your side</h3>
                    <p className="font-sans text-base sm:text-lg md:text-xl lg:text-2xl text-black/60 leading-relaxed">
                      Looking for a team? Creating one? We match based on what you need.
                    </p>
                  </div>
                </div>
                
                <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
                
                {/* Step 3 */}
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 md:gap-8 group">
                  <div className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold text-black/20 group-hover:text-black/40 transition-colors min-w-[3rem] sm:min-w-[4rem]">03</div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 leading-tight">Show your stack</h3>
                    <p className="font-sans text-base sm:text-lg md:text-xl lg:text-2xl text-black/60 leading-relaxed">
                      Skills. Availability. Ambition level. No fluff. Just what matters.
                    </p>
                  </div>
                </div>
                
                <div className="h-px bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
                
                {/* Step 4 */}
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 md:gap-8 group">
                  <div className="font-mono text-2xl sm:text-3xl md:text-4xl font-bold text-black/20 group-hover:text-black/40 transition-colors min-w-[3rem] sm:min-w-[4rem]">04</div>
                  <div className="flex-1">
                    <h3 className="font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 leading-tight">Match & move</h3>
                    <p className="font-sans text-base sm:text-lg md:text-xl lg:text-2xl text-black/60 leading-relaxed">
                      Find your people. Accept. Swap to Discord. Collabase is done.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-center mt-8 sm:mt-10 md:mt-12 font-sans text-base sm:text-lg md:text-xl lg:text-2xl text-black/50 italic px-4">
              We exist to solve one problem. Then we get out of your way.
            </p>
          </div>
        </section>

        {/* Section 4: CTA */}
        <section className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 py-16 sm:py-20 md:py-32 snap-start snap-always">
          <div className="mx-auto max-w-5xl w-full text-center">
            <div className="space-y-6 sm:space-y-8 md:space-y-10 lg:space-y-12">
              <h2 className="font-[family-name:var(--font-pixel)] text-[clamp(2rem,8vw,5rem)] tracking-[0.1em] leading-none px-2 mb-8 sm:mb-10">
                Ready?
              </h2>
              
              {/* Enhanced COLLAB BUILD WIN section */}
              <div className="backdrop-blur-lg bg-white/70 p-6 sm:p-8 md:p-10 rounded-3xl border border-black/10 mx-4 lg:-mx-10">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-10 lg:gap-12 font-[family-name:var(--font-pixel)] text-[clamp(1.5rem,6vw,3rem)] tracking-[0.1em]">
                  <div className="flex flex-col items-center">
                    <span className="text-black/90">COLLAB</span>
                    <div className="h-1 w-16 sm:w-20 bg-black/20 mt-2 sm:mt-3 rounded-full"></div>
                  </div>
                  <span className="hidden sm:inline text-black/30 text-2xl md:text-3xl lg:text-4xl">→</span>
                  <div className="flex flex-col items-center">
                    <span className="text-black/90">BUILD</span>
                    <div className="h-1 w-16 sm:w-20 bg-black/20 mt-2 sm:mt-3 rounded-full"></div>
                  </div>
                  <span className="hidden sm:inline text-black/30 text-2xl md:text-3xl lg:text-4xl">→</span>
                  <div className="flex flex-col items-center">
                    <span className="text-black/90">WIN</span>
                    <div className="h-1 w-16 sm:w-20 bg-black/20 mt-2 sm:mt-3 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced CTA button */}
              <div className="pt-6 sm:pt-8 md:pt-10 px-4">
                <button 
                  onClick={handleSignInClick}
                  disabled={loading || !!user}
                  className="w-full sm:w-auto bg-black text-white px-12 sm:px-16 md:px-20 lg:px-24 py-5 sm:py-6 md:py-7 lg:py-8 rounded-full font-display text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold hover:bg-black/90 transition-all hover:scale-105 shadow-2xl active:scale-95 border-4 border-black/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Loading...' : user ? 'Signed In →' : 'Sign In with Google →'}
                </button>
              </div>
              
              {/* Enhanced tagline */}
              <div className="pt-6 sm:pt-8 px-4">
                <div className="backdrop-blur-sm bg-white/40 p-4 sm:p-5 rounded-2xl border border-black/5 inline-block">
                  <p className="font-mono text-[0.65rem] sm:text-xs md:text-sm text-black/40 uppercase tracking-[0.25em] font-semibold">
                    One hackathon. One team. One shot.
                  </p>
                </div>
              </div>

              {/* Support Email */}
              <div className="pt-8 sm:pt-10 px-4">
                <p className="font-mono text-[0.625rem] sm:text-xs text-black/30">
                  Need help? Contact us at{' '}
                  <a 
                    href="mailto:code.computesociety@gmail.com" 
                    className="text-black/50 hover:text-black transition-colors underline underline-offset-2"
                  >
                    code.computesociety@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPageC1;