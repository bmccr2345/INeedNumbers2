import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

// Feature cards data - 1-2 pain points per feature
const featureCards = [
  // AI Coach
  {
    id: 'ai-coach-1',
    pain: "I don't know what I should be doing every day",
    description: "Get daily direction based on your actual business and deals.",
    feature: "AI Coach",
    slug: "ai-coach"
  },
  {
    id: 'ai-coach-2',
    pain: "I feel busy but not productive",
    description: "Connect your activity to real outcomes and stop spinning your wheels.",
    feature: "AI Coach",
    slug: "ai-coach"
  },
  // Mortgage Calculator
  {
    id: 'mortgage-1',
    pain: "My buyers don't know what they can afford",
    description: "Show them exactly what they can afford with clear, professional breakdowns.",
    feature: "Mortgage Calculator",
    slug: "mortgage-calculator"
  },
  {
    id: 'mortgage-2',
    pain: "I'm losing deals because buyers aren't prepared",
    description: "Qualify buyers upfront and stop wasting time on deals that fall apart.",
    feature: "Mortgage Calculator",
    slug: "mortgage-calculator"
  },
  // Seller Net Sheet
  {
    id: 'net-sheet-1',
    pain: "Sellers don't know what they'll walk away with",
    description: "Generate clear seller proceeds instantly and build immediate trust.",
    feature: "Seller Net Sheet",
    slug: "net-sheet"
  },
  // Commission Calculator
  {
    id: 'commission-1',
    pain: "I don't know how much I'll actually make",
    description: "Calculate your real commission instantly, factoring in splits and fees.",
    feature: "Commission Calculator",
    slug: "commission-calculator"
  },
  // Closing Date Calculator
  {
    id: 'closing-1',
    pain: "Clients don't understand the closing timeline",
    description: "Generate a clear closing timeline that reduces confusion instantly.",
    feature: "Closing Date Calculator",
    slug: "closing-date"
  },
  // Investor Deal Analyzer
  {
    id: 'deal-analyzer-1',
    pain: "I don't know if this deal is actually good",
    description: "Break down deals instantly with cap rate and cash flow analysis.",
    feature: "Investor Deal Analyzer",
    slug: "deal-analyzer"
  },
  {
    id: 'deal-analyzer-2',
    pain: "I want to work with investors but lack tools",
    description: "Stand out as an investor-friendly agent with professional analysis.",
    feature: "Investor Deal Analyzer",
    slug: "deal-analyzer"
  },
  // Agent P&L Tracker
  {
    id: 'pnl-1',
    pain: "I don't know my real profit",
    description: "Track real business performance, not just GCI.",
    feature: "Agent P&L Tracker",
    slug: "pnl-tracker"
  },
  {
    id: 'pnl-2',
    pain: "I feel broke even with closings",
    description: "See where your money actually goes and take control.",
    feature: "Agent P&L Tracker",
    slug: "pnl-tracker"
  },
  // Commission Cap Report
  {
    id: 'cap-1',
    pain: "I don't know where I stand on my cap",
    description: "Track cap progress automatically with real-time updates.",
    feature: "Commission Cap Report",
    slug: "cap-report"
  },
  // Action Tracker
  {
    id: 'action-1',
    pain: "I don't actually know what I did today",
    description: "Track what actually drives results and identify patterns.",
    feature: "Action Tracker",
    slug: "action-tracker"
  },
  {
    id: 'action-2',
    pain: "I'm inconsistent with my activities",
    description: "Build accountability and feed insights into AI Coach.",
    feature: "Action Tracker",
    slug: "action-tracker"
  },
];

// Screenshot placeholder component
const ScreenshotPlaceholder = ({ feature }) => (
  <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 flex items-center justify-center min-h-[120px]">
    <p className="text-gray-500 text-sm text-center">Feature Screenshot Coming Soon</p>
  </div>
);

const FeaturesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              
              <div className="flex items-center space-x-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/s0f7rwx0_INN%20App%20Icon.png" 
                  alt="I Need Numbers" 
                  className="h-8 w-8 rounded-lg"
                />
                <span 
                  className="text-lg font-semibold text-gray-900"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  I NEED NUMBERS
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <Button
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="border-[#2FA163] text-[#2FA163] hover:bg-[#2FA163] hover:text-white"
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/auth/login')}
                    className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium hidden sm:block"
                  >
                    Sign In
                  </button>
                  <Button
                    onClick={() => navigate('/pricing')}
                    className="bg-[#2FA163] hover:bg-[#268a54] text-white"
                  >
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-6 text-center">
          <h1 
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            Stop guessing. Know your numbers.
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            Every tool below solves a specific financial problem real estate agents deal with every day.
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((card) => (
              <Card 
                key={card.id}
                className="border border-gray-200 hover:border-[#2FA163] hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/features/${card.slug}`)}
              >
                <CardContent className="p-6">
                  {/* Screenshot Placeholder */}
                  <div className="mb-4">
                    <ScreenshotPlaceholder feature={card.feature} />
                  </div>
                  
                  {/* Pain Headline */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-[#2FA163] transition-colors">
                    {card.pain}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4">
                    {card.description}
                  </p>
                  
                  {/* Feature Label */}
                  <p className="text-xs text-gray-500 mb-4">
                    Powered by: <span className="font-medium text-[#2FA163]">{card.feature}</span>
                  </p>
                  
                  {/* CTA Button */}
                  <Button 
                    variant="outline"
                    className="w-full border-[#2FA163] text-[#2FA163] hover:bg-[#2FA163] hover:text-white group-hover:bg-[#2FA163] group-hover:text-white transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/features/${card.slug}`);
                    }}
                  >
                    Learn More
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturesPage;
