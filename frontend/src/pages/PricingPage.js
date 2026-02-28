import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Check, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

// What's included - organized
const AI_BUSINESS_INTELLIGENCE = [
  "AI Coach",
  "Agent P&L Tracker", 
  "Commission Cap Report",
  "Action Tracker",
];

const CLIENT_DEAL_TOOLS = [
  "Mortgage Calculator",
  "Seller Net Sheet",
  "Commission Split Calculator",
  "Closing Date Calculator",
  "Investor Deal Generator",
];

const PricingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartNow = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/auth/register');
    }
  };

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
                  My Account
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/auth/login')}
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => navigate('/auth/register')}
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

      {/* Pricing Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              One Plan. Everything Included.
            </h1>
            <p 
              className="text-xl md:text-2xl text-gray-600 mb-12"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              No tiers. No upsells. No confusion.
            </p>

            {/* Price card */}
            <div className="bg-white rounded-3xl shadow-2xl p-10 md:p-12 max-w-lg mx-auto border border-gray-100">
              <div className="mb-8">
                <div className="flex items-baseline justify-center">
                  <span 
                    className="text-6xl md:text-7xl font-bold text-gray-900"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    $49.99
                  </span>
                  <span className="text-2xl text-gray-500 ml-2">/ month</span>
                </div>
              </div>
              
              <Button 
                onClick={handleStartNow}
                size="lg"
                className="w-full bg-[#2FA163] hover:bg-[#268a54] text-white text-xl py-7 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 mb-6"
                data-testid="pricing-cta-btn"
              >
                Start Now
              </Button>
              
              <p className="text-gray-500 text-sm">
                Cancel anytime. No contracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 md:py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 
              className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              What's Included
            </h2>

            <div className="grid md:grid-cols-2 gap-12 md:gap-16">
              {/* AI & Business Intelligence */}
              <div>
                <h3 
                  className="text-xl font-bold text-[#2FA163] mb-6 pb-2 border-b border-gray-200"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  AI & Business Intelligence
                </h3>
                <ul className="space-y-4">
                  {AI_BUSINESS_INTELLIGENCE.map((item, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-[#2FA163]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-[#2FA163]" />
                      </div>
                      <span 
                        className="text-gray-700 text-lg"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Client & Deal Tools */}
              <div>
                <h3 
                  className="text-xl font-bold text-[#2FA163] mb-6 pb-2 border-b border-gray-200"
                  style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
                >
                  Client & Deal Tools
                </h3>
                <ul className="space-y-4">
                  {CLIENT_DEAL_TOOLS.map((item, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-[#2FA163]/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-[#2FA163]" />
                      </div>
                      <span 
                        className="text-gray-700 text-lg"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 md:py-32 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-6"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Stop Guessing. Start Knowing.
            </h2>
            <Button 
              onClick={handleStartNow}
              size="lg"
              className="bg-[#2FA163] hover:bg-[#268a54] text-white text-xl px-12 py-7 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              data-testid="bottom-cta-btn"
            >
              Hire My AI Coach
            </Button>
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
    </div>
  );
};

export default PricingPage;
