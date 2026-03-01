import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ChevronDown, ChevronRight, Check, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Screenshot URLs for accordion sections
const SCREENSHOTS = {
  aiCoach: 'https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/79m97ybe_IMG_2414.jpeg',
  pnl: 'https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/crhcbw0w_IMG_2418.jpeg',
  commissionCap: 'https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/fmwl2ef7_IMG_2421.jpeg',
  calculators: 'https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/q857eg03_IMG_2420.jpeg',
  actionTracker: 'https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/mg1mhuv0_IMG_2419.jpeg',
};

// Hero image - clean generated image without text
const HERO_IMAGE = 'https://static.prod-images.emergentagent.com/jobs/f9bdf638-ae2b-47cf-8725-a262363e948c/images/fe4a77dd4d441e710bd6fe670b69ae561f0cc424e1a4456eee44d797e8483048.png';

// Built by agents image
const BUILT_BY_AGENTS_IMAGE = 'https://static.prod-images.emergentagent.com/jobs/f9bdf638-ae2b-47cf-8725-a262363e948c/images/98af7eea5f7f459100cc711a0280fc964378e004c6e1a8fc3fa7bcb22db75ca5.png';

// Pain points for rotating carousel
const PAIN_POINTS = [
  "You don't know what to focus on today.",
  "You don't know what you're making this month.",
  "You don't know how close you are to capping.",
  "You guess during listing appointments.",
  "You stay busy but not strategic.",
];

// Solution mapping data
const SOLUTIONS = [
  {
    pain: "You don't know what to focus on today.",
    title: "AI Coach",
    description: "Your business analyzed daily. Clear priorities. Goal tracking. Risk alerts.",
    screenshot: SCREENSHOTS.aiCoach,
  },
  {
    pain: "You don't know what you're making this month.",
    title: "Agent P&L Tracker",
    description: "Know your real profit — not just GCI. Month & YTD KPIs. Burn rate. Tax set-aside hints.",
    screenshot: SCREENSHOTS.pnl,
  },
  {
    pain: "You don't know how close you are to capping.",
    title: "Commission Cap Report",
    description: "Track progress toward cap automatically. No more guessing what you owe.",
    screenshot: SCREENSHOTS.commissionCap,
  },
  {
    pain: "You guess during listing appointments.",
    title: "Client Calculators",
    description: "Affordability. Seller net sheet. ROI scenarios. Instant clarity for buyers and sellers.",
    screenshot: SCREENSHOTS.calculators,
  },
  {
    pain: "You stay busy but not strategic.",
    title: "Action Tracker",
    description: "Convert monthly goals to daily targets. Log calls. Track conversations. Measure revenue drivers.",
    screenshot: SCREENSHOTS.actionTracker,
  },
];

// Tools data
const DEAL_CLIENT_TOOLS = [
  { name: "Mortgage & Affordability Calculator", description: "Help buyers understand their purchasing power" },
  { name: "Seller Net Sheet Estimator", description: "Show sellers their true proceeds" },
  { name: "Commission Split Calculator", description: "Calculate splits and payouts instantly" },
  { name: "Closing Date Calculator", description: "Plan transaction timelines accurately" },
  { name: "Investor Deal PDF Generator", description: "Professional branded investment packets" },
];

const BUSINESS_INTELLIGENCE_TOOLS = [
  { name: "AI Coach", description: "Daily personalized business insights" },
  { name: "Agent P&L Tracker", description: "Real profit tracking, not just GCI" },
  { name: "Commission Cap Report", description: "Automatic cap progress monitoring" },
  { name: "Action Tracker", description: "Goal-to-activity conversion system" },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPainIndex, setCurrentPainIndex] = useState(0);
  const [activeSolution, setActiveSolution] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef(null);

  // Rotate pain points every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPainIndex((prev) => (prev + 1) % PAIN_POINTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // If user is logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleStartCoach = () => {
    navigate('/auth/register');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 bg-transparent">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/o3s06xdg_IMG_1529.jpeg" 
                alt="I Need Numbers" 
                className="h-10 w-auto rounded-lg"
              />
            </div>
            
            {/* Desktop nav */}
            <div className="hidden md:flex items-center space-x-6">
              <button 
                onClick={() => navigate('/pricing')}
                className="text-white/90 hover:text-white transition-colors text-sm font-medium"
              >
                Pricing
              </button>
              <button 
                onClick={() => navigate('/auth/login')}
                className="text-white/90 hover:text-white transition-colors text-sm font-medium"
              >
                Sign In
              </button>
              <Button 
                onClick={handleStartCoach}
                className="bg-white text-[#2FA163] hover:bg-white/90 font-medium px-6"
                size="sm"
              >
                Hire My AI Coach
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden text-white p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#1a5c3a]/95 backdrop-blur-sm border-t border-white/10">
            <div className="container mx-auto px-6 py-4 space-y-4">
              <button 
                onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-white/90 hover:text-white py-2 text-lg"
              >
                Pricing
              </button>
              <button 
                onClick={() => { navigate('/auth/login'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-white/90 hover:text-white py-2 text-lg"
              >
                Sign In
              </button>
              <Button 
                onClick={() => { handleStartCoach(); setMobileMenuOpen(false); }}
                className="w-full bg-white text-[#2FA163] hover:bg-white/90 font-medium"
              >
                Hire My AI Coach
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* SECTION 1: HERO (PAIN FIRST) */}
      <section 
        ref={heroRef}
        className="relative min-h-[50vh] flex items-center overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a5c3a 0%, #2FA163 50%, #3db574 100%)',
        }}
      >
        {/* Hero background image - positioned on right side only */}
        <div 
          className="absolute inset-0 bg-cover bg-right bg-no-repeat hidden lg:block"
          style={{
            backgroundImage: `url(${HERO_IMAGE})`,
            backgroundPosition: 'right center',
            maskImage: 'linear-gradient(to left, black 50%, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to left, black 50%, transparent 80%)',
          }}
        />
        
        {/* Gradient overlay for mobile and text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a5c3a] via-[#2FA163]/90 to-[#2FA163]/70 lg:to-transparent" />

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[50vh] py-20">
            {/* Left side - Text content */}
            <div className="space-y-8 max-w-xl">
              {/* Stacked headline */}
              <div className="space-y-2">
                <p className="text-white/90 text-2xl md:text-3xl font-light italic" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                  You're a real estate agent.
                </p>
                <p className="text-white/90 text-2xl md:text-3xl font-light italic" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                  You're busy all day.
                </p>
                <p className="text-white text-3xl md:text-4xl font-semibold mt-4" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                  But...
                </p>
              </div>

              {/* Rotating pain point */}
              <div className="min-h-[120px]">
                <p 
                  key={currentPainIndex}
                  className="text-white text-3xl md:text-4xl lg:text-5xl font-bold leading-tight animate-fade-in"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  {PAIN_POINTS[currentPainIndex]}
                </p>
                
                {/* Progress indicator */}
                <div className="flex space-x-2 mt-6">
                  {PAIN_POINTS.map((_, index) => (
                    <div 
                      key={index}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        index === currentPainIndex 
                          ? 'w-8 bg-[#D4AF37]' 
                          : 'w-2 bg-white/40'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="pt-4">
                <Button 
                  onClick={handleStartCoach}
                  size="lg"
                  className="bg-white text-[#2FA163] hover:bg-white/95 text-lg px-10 py-6 font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
                  data-testid="hero-cta-btn"
                >
                  Hire My AI Coach
                </Button>
              </div>
            </div>

            {/* Right side - Image is in background */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </section>

      {/* SECTION 2: SOLUTION MAPPING */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container mx-auto px-6">
          {/* Section header */}
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Clarity Changes Everything.
            </h2>
            <p className="text-xl text-gray-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Here's what happens when you stop guessing.
            </p>
          </div>

          {/* Desktop: Two-column layout */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
            {/* Left column - Pain points */}
            <div className="space-y-4">
              {SOLUTIONS.map((solution, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSolution(index)}
                  className={`w-full text-left p-6 rounded-xl transition-all duration-300 ${
                    activeSolution === index 
                      ? 'bg-[#2FA163] text-white shadow-lg' 
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                  data-testid={`solution-tab-${index}`}
                >
                  <p className="text-lg font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {solution.pain}
                  </p>
                  {activeSolution === index && (
                    <ChevronRight className="inline-block ml-2 w-5 h-5" />
                  )}
                </button>
              ))}
            </div>

            {/* Right column - Active solution */}
            <div className="sticky top-8">
              {activeSolution >= 0 && SOLUTIONS[activeSolution] && (
                <div className="bg-gray-50 rounded-2xl p-8 shadow-sm">
                  <h3 
                    className="text-2xl font-bold text-[#2FA163] mb-3"
                    style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                  >
                    {SOLUTIONS[activeSolution].title}
                  </h3>
                  <p className="text-gray-600 text-lg mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {SOLUTIONS[activeSolution].description}
                  </p>
                  <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200">
                    <img 
                      src={SOLUTIONS[activeSolution].screenshot}
                      alt={SOLUTIONS[activeSolution].title}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Accordion */}
          <div className="lg:hidden space-y-4">
            {SOLUTIONS.map((solution, index) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setActiveSolution(activeSolution === index ? -1 : index)}
                  className={`w-full text-left p-5 flex items-center justify-between transition-colors ${
                    activeSolution === index ? 'bg-[#2FA163] text-white' : 'bg-white text-gray-900'
                  }`}
                  data-testid={`accordion-${index}`}
                >
                  <span className="font-medium pr-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    {solution.pain}
                  </span>
                  <ChevronDown 
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
                      activeSolution === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {activeSolution === index && (
                  <div className="p-5 bg-gray-50 animate-slide-down">
                    <h4 
                      className="text-xl font-bold text-[#2FA163] mb-2"
                      style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                    >
                      {solution.title}
                    </h4>
                    <p className="text-gray-600 mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {solution.description}
                    </p>
                    <div className="rounded-lg overflow-hidden shadow-md">
                      <img 
                        src={solution.screenshot}
                        alt={solution.title}
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: ALL TOOLS */}
      <section className="py-20 md:py-32 bg-gray-50">
        <div className="container mx-auto px-6">
          {/* Section header */}
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              All the Tools You Need. One Platform.
            </h2>
          </div>

          <div className="max-w-5xl mx-auto">
            {/* Group 1: Deal & Client Tools */}
            <div className="mb-16">
              <div className="mb-8">
                <h3 
                  className="text-2xl font-bold text-gray-900 mb-2"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  Deal & Client Tools
                </h3>
                <p className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Everything you need to guide clients confidently.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DEAL_CLIENT_TOOLS.map((tool, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-[#2FA163]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-[#2FA163]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {tool.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group 2: Business Intelligence */}
            <div className="mb-16">
              <div className="mb-8">
                <h3 
                  className="text-2xl font-bold text-gray-900 mb-2"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  Business Intelligence
                </h3>
                <p className="text-gray-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Run your business like a business.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {BUSINESS_INTELLIGENCE_TOOLS.map((tool, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-[#2FA163]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-4 h-4 text-[#2FA163]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {tool.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-900 mb-6" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                Everything Included. <span className="text-[#2FA163]">$49.99/month</span>
              </p>
              <Button 
                onClick={handleStartCoach}
                size="lg"
                className="bg-[#2FA163] hover:bg-[#268a54] text-white text-lg px-10 py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="tools-cta-btn"
              >
                Hire My AI Coach
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: BUILT BY AGENTS */}
      <section className="py-20 md:py-32 bg-white overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Image */}
            <div className="order-2 lg:order-1">
              <div className="relative">
                <img 
                  src={BUILT_BY_AGENTS_IMAGE}
                  alt="Real estate agent meeting clients at front door"
                  className="rounded-2xl shadow-2xl w-full h-auto"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2 space-y-6">
              <h2 
                className="text-4xl md:text-5xl font-bold text-gray-900"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Built by Agents.<br />For Agents.
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                We built what we wished existed.<br />
                No spreadsheets. No guessing. No blind spots.<br />
                <span className="font-semibold text-gray-900">Just clarity.</span>
              </p>
              <div className="pt-4">
                <Button 
                  onClick={handleStartCoach}
                  size="lg"
                  className="bg-[#2FA163] hover:bg-[#268a54] text-white text-lg px-10 py-6 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  data-testid="built-by-agents-cta-btn"
                >
                  Hire My AI Coach
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/s0f7rwx0_INN%20App%20Icon.png" 
                  alt="I Need Numbers" 
                  className="h-10 w-10 rounded-xl"
                />
                <span className="font-semibold" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                  I Need Numbers
                </span>
              </div>
              <p className="text-gray-400 text-sm">
                The AI-powered business system for real estate agents.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><button onClick={() => navigate('/pricing')} className="hover:text-white transition-colors">Pricing</button></li>
                <li><button onClick={() => navigate('/calculator')} className="hover:text-white transition-colors">Calculator</button></li>
                <li><button onClick={() => navigate('/glossary')} className="hover:text-white transition-colors">Glossary</button></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><button onClick={() => navigate('/support')} className="hover:text-white transition-colors">Help Center</button></li>
                <li><a href="mailto:support@ineednumbers.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><button onClick={() => navigate('/legal/privacy')} className="hover:text-white transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => navigate('/legal/terms')} className="hover:text-white transition-colors">Terms of Service</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 I Need Numbers, LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-down {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 1000px; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
