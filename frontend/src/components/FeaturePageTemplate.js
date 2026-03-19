import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/Footer';

// Screenshot placeholder component
const ScreenshotPlaceholder = ({ label }) => (
  <div className="bg-gray-100 border border-gray-200 rounded-lg p-8 flex items-center justify-center min-h-[200px] md:min-h-[280px]">
    <p className="text-gray-500 text-sm text-center">Feature Screenshot Coming Soon</p>
  </div>
);

const FeaturePageTemplate = ({
  // Hero
  heroHeadline,
  heroSubheadline,
  ctaText,
  
  // Problem
  problemText,
  
  // Root Cause
  rootCauseText,
  
  // Solution
  solutionIntro,
  solutionBullets,
  
  // Transformation
  beforeItems,
  afterItems,
  
  // Proof
  proofText,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
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
                onClick={() => navigate('/features')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                All Features
              </Button>
              
              <div className="flex items-center space-x-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_f9bdf638-ae2b-47cf-8725-a262363e948c/artifacts/s0f7rwx0_INN%20App%20Icon.png" 
                  alt="I Need Numbers" 
                  className="h-8 w-8 rounded-lg"
                />
                <span 
                  className="text-lg font-semibold text-gray-900 hidden sm:block"
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

      {/* Hero Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h1 
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                {heroHeadline}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-6">
                {heroSubheadline}
              </p>
              <Button
                onClick={handleCTA}
                size="lg"
                className="bg-[#2FA163] hover:bg-[#268a54] text-white px-8"
              >
                {ctaText}
              </Button>
            </div>
            <div>
              <ScreenshotPlaceholder label="Hero" />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <ScreenshotPlaceholder label="Problem" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 
                className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                The Problem
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                {problemText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Root Cause Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 
              className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
              style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              The Root Cause
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              {rootCauseText}
            </p>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 
                className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                The Solution
              </h2>
              <p className="text-gray-600 text-lg mb-6">
                {solutionIntro}
              </p>
              <ul className="space-y-3">
                {solutionBullets.map((bullet, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-[#2FA163] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <ScreenshotPlaceholder label="Solution" />
            </div>
          </div>
        </div>
      </section>

      {/* Transformation Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 
            className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center"
            style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
          >
            The Transformation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border border-gray-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-500 mb-4">Before</h3>
                <ul className="space-y-2">
                  {beforeItems.map((item, index) => (
                    <li key={index} className="text-gray-600 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border border-[#2FA163] bg-[#2FA163]/5">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[#2FA163] mb-4">After</h3>
                <ul className="space-y-2">
                  {afterItems.map((item, index) => (
                    <li key={index} className="text-gray-700 flex items-center space-x-2">
                      <Check className="w-4 h-4 text-[#2FA163]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Proof Section */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-gray-600 text-lg italic">
              {proofText}
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 md:py-20 bg-[#2FA163]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 
                className="text-2xl md:text-3xl font-bold text-white mb-4"
                style={{ fontFamily: 'Playfair Display, Georgia, serif' }}
              >
                Ready to take control?
              </h2>
              <p className="text-white/90 text-lg mb-6">
                {heroSubheadline}
              </p>
              <Button
                onClick={handleCTA}
                size="lg"
                className="bg-white text-[#2FA163] hover:bg-gray-100 px-8"
              >
                {ctaText}
              </Button>
            </div>
            <div>
              <ScreenshotPlaceholder label="CTA" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FeaturePageTemplate;
