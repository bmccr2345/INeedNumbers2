import React, { useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isIOSApp } from '../utils/platform';
import Footer from '../components/Footer';
import './HomePageRedesign.css';

// Navigation component (preserved from existing app)
const Navigation = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const iosRestricted = isIOSApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
              alt="I Need Numbers" 
              className="h-8 w-auto"
            />
            <span className="text-lg font-bold text-[#2FA163] tracking-wide" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
              I NEED NUMBERS
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <button onClick={() => navigate('/features')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Features</button>
            {!iosRestricted && <button onClick={() => navigate('/pricing')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Pricing</button>}
            <button onClick={() => navigate('/blog')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Blog</button>
            <button onClick={() => navigate('/support')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Support</button>
            {user ? (
              <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Dashboard</button>
            ) : (
              <>
                <button onClick={() => navigate('/auth/login')} className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">Sign In</button>
                {!iosRestricted && (
                  <button onClick={() => navigate('/auth/register')} className="bg-[#16a34a] hover:bg-[#0d7a36] text-white font-semibold px-5 py-2 rounded-lg transition-all">
                    Get Started
                  </button>
                )}
              </>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            className="md:hidden p-2 text-gray-700 hover:text-gray-900 focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white shadow-lg">
          <div className="container mx-auto px-6 py-4 space-y-3">
            <button 
              onClick={() => { navigate('/features'); setMobileMenuOpen(false); }}
              className="block w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 py-3 px-2 text-lg font-medium rounded-md transition-colors"
            >
              Features
            </button>
            {!iosRestricted && (
              <button 
                onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 py-3 px-2 text-lg font-medium rounded-md transition-colors"
              >
                Pricing
              </button>
            )}
            <button 
              onClick={() => { navigate('/blog'); setMobileMenuOpen(false); }}
              className="block w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 py-3 px-2 text-lg font-medium rounded-md transition-colors"
            >
              Blog
            </button>
            <button 
              onClick={() => { navigate('/support'); setMobileMenuOpen(false); }}
              className="block w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 py-3 px-2 text-lg font-medium rounded-md transition-colors"
            >
              Support
            </button>
            {user ? (
              <button 
                onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                className="block w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 py-3 px-2 text-lg font-medium rounded-md transition-colors"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button 
                  onClick={() => { navigate('/auth/login'); setMobileMenuOpen(false); }}
                  className="block w-full text-left text-gray-700 hover:text-gray-900 hover:bg-gray-50 py-3 px-2 text-lg font-medium rounded-md transition-colors"
                >
                  Sign In
                </button>
                {!iosRestricted && (
                  <button 
                    onClick={() => { navigate('/auth/register'); setMobileMenuOpen(false); }}
                    className="block w-full bg-[#16a34a] hover:bg-[#0d7a36] text-white font-semibold py-3 px-4 rounded-lg text-center text-lg mt-2 transition-colors"
                  >
                    Get Started
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const HomePageRedesign = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const iosRestricted = isIOSApp();
  
  const heroDemoRef = useRef(null);
  const sidebarRef = useRef(null);
  const contentRef = useRef(null);
  const cursorRef = useRef(null);
  const viewLabelRef = useRef(null);

  // Redirect logged in users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Intersection Observer for fade-up animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  // Hero dashboard click-through demo animation
  useEffect(() => {
    const app = heroDemoRef.current;
    const sidebar = sidebarRef.current;
    const contentArea = contentRef.current;
    const cursor = cursorRef.current;
    const viewLabel = viewLabelRef.current;

    if (!app || !sidebar || !contentArea || !cursor) return;

    const panels = contentArea.querySelectorAll('.hm-panel');
    const navItems = sidebar.querySelectorAll('.hm-nav-item[data-panel]');

    const sequence = [0, 1, 2, 3, 4];
    const viewNames = ['Dashboard', 'P&L Tracker', 'Action Tracker', 'Cap Tracker', 'Goal Settings'];
    let seqIdx = 0;
    let timer = null;
    let paused = false;

    function showPanel(idx) {
      panels.forEach((p) => p.classList.remove('active'));
      navItems.forEach((n) => n.classList.remove('active'));
      const panel = contentArea.querySelector(`.hm-panel[data-panel="${idx}"]`);
      const navItem = sidebar.querySelector(`.hm-nav-item[data-panel="${idx}"]`);
      if (panel) panel.classList.add('active');
      if (navItem) navItem.classList.add('active');
      if (viewLabel) {
        const nameIdx = sequence.indexOf(idx);
        viewLabel.innerHTML = `Viewing: <span>${viewNames[nameIdx !== -1 ? nameIdx : idx] || 'Dashboard'}</span>`;
      }
    }

    function animateClick(targetNavItem, panelIdx, callback) {
      const appRect = app.getBoundingClientRect();
      const itemRect = targetNavItem.getBoundingClientRect();
      const targetX = itemRect.left - appRect.left + itemRect.width * 0.4;
      const targetY = itemRect.top - appRect.top + itemRect.height * 0.3;

      cursor.style.left = `${targetX}px`;
      cursor.style.top = `${targetY}px`;
      cursor.classList.add('visible');

      setTimeout(() => {
        if (paused) return;
        targetNavItem.classList.add('clicking');

        setTimeout(() => {
          targetNavItem.classList.remove('clicking');
          showPanel(panelIdx);
          if (callback) callback();
        }, 200);
      }, 650);
    }

    function nextStep() {
      if (paused) return;
      seqIdx = (seqIdx + 1) % sequence.length;
      const nextPanel = sequence[seqIdx];
      const targetNav = sidebar.querySelector(`.hm-nav-item[data-panel="${nextPanel}"]`);
      if (!targetNav) {
        seqIdx = 0;
        return;
      }

      animateClick(targetNav, nextPanel, () => {
        timer = setTimeout(nextStep, 3000);
      });
    }

    function startDemo() {
      if (timer) clearTimeout(timer);
      showPanel(sequence[0]);
      seqIdx = 0;
      cursor.classList.remove('visible');
      timer = setTimeout(nextStep, 3500);
    }

    const handleMouseEnter = () => {
      paused = true;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      cursor.classList.remove('visible');
    };

    const handleMouseLeave = () => {
      paused = false;
      timer = setTimeout(nextStep, 1500);
    };

    app.addEventListener('mouseenter', handleMouseEnter);
    app.addEventListener('mouseleave', handleMouseLeave);

    startDemo();

    return () => {
      if (timer) clearTimeout(timer);
      app.removeEventListener('mouseenter', handleMouseEnter);
      app.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* HERO */}
      <section className="hero-redesign">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-ai-badge">
              <span className="sparkle">✨</span> Powered by AI that knows your business
            </div>
            <h1>
              <span className="hero-hook">You're a real estate agent.</span>
              <span className="hero-hook">You're busy all day.</span>
              <span className="hero-punch">But are you profitable?</span>
            </h1>
            <p className="hero-subtitle">
              Tell <span className="brand-name-light">I Need Numbers</span> your annual goal. Our AI Coach breaks it into daily actions, tracks your real income, and tells you exactly what to focus on — every single day.
            </p>
            <div className="hero-cta-group">
              {!iosRestricted && (
                <button onClick={() => navigate('/auth/register')} className="btn-primary" data-testid="hero-cta-btn">
                  Start Your Free Trial →
                </button>
              )}
              <a href="#ai-coach" className="btn-secondary-redesign">Meet your AI Coach ↓</a>
            </div>
            {!iosRestricted && (
              <p className="hero-price-note">7-day free trial · Then $49.99/mo · Cancel anytime · <span className="app-store">iOS app included</span></p>
            )}
          </div>
          <div className="hero-visual">
            <div className="hero-mockup" ref={heroDemoRef} id="heroDemoApp">
              <div className="hm-topbar">
                <div className="hm-logo">
                  <div className="hm-logo-dot">$</div>
                  <span className="brand-name">I Need Numbers</span>
                </div>
                <div className="hm-badge">PRO</div>
              </div>
              <div className="hm-body">
                <div className="hm-sidebar" ref={sidebarRef} id="demoSidebar">
                  <div className="hm-nav-section">Dashboard</div>
                  <div className="hm-nav-item active" data-panel="0">📊 Overview</div>
                  <div className="hm-nav-section">Plan &amp; Track</div>
                  <div className="hm-nav-item" data-panel="2">⚪ Action Tracker</div>
                  <div className="hm-nav-item" data-panel="4">📈 Goal Settings</div>
                  <div className="hm-nav-item" data-panel="3">◯ Cap Tracker</div>
                  <div className="hm-nav-section">Work Deals</div>
                  <div className="hm-nav-item">$ Commission Split</div>
                  <div className="hm-nav-item">📄 Seller Net Sheet</div>
                  <div className="hm-nav-section">Finances</div>
                  <div className="hm-nav-item" data-panel="1">📈 P&amp;L Tracker</div>
                </div>
                <div className="hm-content-area" ref={contentRef} id="demoContent">
                  {/* Panel 0: Dashboard + AI Coach */}
                  <div className="hm-panel active" data-panel="0">
                    <div className="hm-title">Dashboard Overview</div>
                    <div className="hm-sub">Welcome back! Here's what's happening with your business.</div>
                    <div className="hm-actions">
                      <div className="hm-action-btn" style={{ background: 'var(--purple)' }}>✨ Refresh AI Coach</div>
                      <div className="hm-action-btn" style={{ background: 'var(--green-primary)' }}>🏠 Add Deal</div>
                      <div className="hm-action-btn" style={{ background: 'var(--blue)' }}>📈 Log Activity</div>
                    </div>
                    <div className="hm-ai-card">
                      <div className="hm-ai-header">
                        <div className="hm-ai-icon">✨</div>
                        <div>
                          <div className="hm-ai-title">Fairy AI Coach</div>
                          <div className="hm-ai-subtitle">Your personalized AI-powered business insights</div>
                        </div>
                      </div>
                      <div className="hm-priority">
                        <div className="hm-priority-title">✅ Priority Actions</div>
                        <div className="hm-priority-item">1. Focus on social media marketing to attract more sellers</div>
                        <div className="hm-priority-item">2. Increase your prospecting hours to fill your pipeline</div>
                        <div className="hm-priority-item">3. Reach out to past clients for referrals</div>
                      </div>
                      <div style={{ height: '0.35rem' }}></div>
                      <div className="hm-time-sensitive">
                        <div className="hm-ts-title">⚠ Time-Sensitive</div>
                        <div className="hm-ts-item">Follow up with those 15 appointments to convert to deals</div>
                      </div>
                    </div>
                    <div className="hm-finance-row">
                      <div className="hm-fin-card"><div className="hm-fin-label">Profit</div><div className="hm-fin-value" style={{ color: 'var(--green-primary)' }}>$20,825</div><div className="hm-fin-sub">This Month</div></div>
                      <div className="hm-fin-card"><div className="hm-fin-label">Activity</div><div className="hm-fin-bar"><div className="hm-fin-fill" style={{ width: '100%', background: 'var(--blue)' }}></div></div><div className="hm-fin-sub">100% to goal</div></div>
                      <div className="hm-fin-card"><div className="hm-fin-label">Income</div><div className="hm-fin-bar"><div className="hm-fin-fill" style={{ width: '100%', background: 'var(--green-primary)' }}></div></div><div className="hm-fin-sub">$22K of $20K</div></div>
                      <div className="hm-fin-card"><div className="hm-fin-label">Cap</div><div className="hm-fin-bar"><div className="hm-fin-fill" style={{ width: '11%', background: 'var(--orange)' }}></div></div><div className="hm-fin-sub">11% to cap</div></div>
                    </div>
                  </div>
                  {/* Panel 1: P&L Tracker */}
                  <div className="hm-panel" data-panel="1">
                    <div className="hm-title">Agent P&amp;L Tracker</div>
                    <div className="hm-sub">Professional P&amp;L format: Income → Expenses → Net Income</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <div style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--gray-200)', textAlign: 'center' }}><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)' }}>Total Income</div><div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--green-primary)' }}>$22,075</div></div>
                      <div style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--gray-200)', textAlign: 'center' }}><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)' }}>Total Expenses</div><div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--red)' }}>$1,250</div></div>
                      <div style={{ padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--gray-200)', textAlign: 'center' }}><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)' }}>Net Income</div><div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--green-primary)' }}>$20,825</div></div>
                    </div>
                    <table style={{ width: '100%', fontSize: '0.55rem', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr><th style={{ textAlign: 'left', padding: '0.3rem', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: '0.5rem' }}>Property</th><th style={{ padding: '0.3rem', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: '0.5rem' }}>Sale Price</th><th style={{ padding: '0.3rem', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: '0.5rem' }}>Comm.</th><th style={{ padding: '0.3rem', borderBottom: '1px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: '0.5rem' }}>Income</th></tr>
                        <tr><td style={{ padding: '0.3rem', borderBottom: '1px solid var(--gray-100)' }}>432 W Longstreet</td><td style={{ padding: '0.3rem', borderBottom: '1px solid var(--gray-100)' }}>$611,000</td><td style={{ padding: '0.3rem', borderBottom: '1px solid var(--gray-100)' }}>1.6%</td><td style={{ padding: '0.3rem', borderBottom: '1px solid var(--gray-100)', color: 'var(--green-primary)', fontWeight: 700 }}>$9,580</td></tr>
                        <tr><td style={{ padding: '0.3rem' }}>111 W Jackson St</td><td style={{ padding: '0.3rem' }}>$425,000</td><td style={{ padding: '0.3rem' }}>3%</td><td style={{ padding: '0.3rem', color: 'var(--green-primary)', fontWeight: 700 }}>$12,495</td></tr>
                      </tbody>
                    </table>
                    <div style={{ background: 'var(--green-muted)', border: '1px solid var(--green-primary)', borderRadius: '8px', padding: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--green-dark)' }}>Commission Cap Progress</div>
                      <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--green-primary)' }}>11.4% · $1,027 / $9,000</div>
                    </div>
                  </div>
                  {/* Panel 2: Action Tracker */}
                  <div className="hm-panel" data-panel="2">
                    <div className="hm-title">Action Tracker</div>
                    <div className="hm-sub">Distinguish productivity from busyness with daily action tracking</div>
                    <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray-900)', margin: '0.5rem 0' }}>Goal this month: <span style={{ color: 'var(--green-primary)' }}>$20,000</span></div>
                    <table style={{ width: '100%', fontSize: '0.6rem', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr><th style={{ textAlign: 'left', padding: '0.35rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: '0.5rem' }}>Activity</th><th style={{ padding: '0.35rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: '0.5rem' }}>Needed</th><th style={{ padding: '0.35rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: '0.5rem' }}>Done</th><th style={{ padding: '0.35rem', borderBottom: '2px solid var(--gray-200)', color: 'var(--gray-500)', fontSize: '0.5rem' }}>Gap</th></tr>
                        <tr><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)' }}>Conversations</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}>6</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}>0</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}><span style={{ background: 'var(--red)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700 }}>6</span></td></tr>
                        <tr><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)' }}>Appointments</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}>1</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}>0</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}><span style={{ background: 'var(--gold)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700 }}>1</span></td></tr>
                        <tr><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)' }}>Offers Written</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}>1</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}>0</td><td style={{ padding: '0.35rem', borderBottom: '1px solid var(--gray-100)', textAlign: 'center' }}><span style={{ background: 'var(--gold)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700 }}>1</span></td></tr>
                        <tr><td style={{ padding: '0.35rem' }}>Listings Taken</td><td style={{ padding: '0.35rem', textAlign: 'center' }}>1</td><td style={{ padding: '0.35rem', textAlign: 'center' }}>0</td><td style={{ padding: '0.35rem', textAlign: 'center' }}><span style={{ background: 'var(--gold)', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 700 }}>1</span></td></tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Panel 3: Cap Tracker */}
                  <div className="hm-panel" data-panel="3">
                    <div className="hm-title">Commission Cap Tracker</div>
                    <div className="hm-sub">Track your annual commission cap progress</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem', margin: '0.75rem 0' }}>
                      <div style={{ padding: '0.6rem', background: 'var(--gray-50)', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--green-primary)' }}>11.41%</div><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)' }}>Progress</div></div>
                      <div style={{ padding: '0.6rem', background: 'var(--gray-50)', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--green-dark)' }}>$1K</div><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)' }}>Paid</div></div>
                      <div style={{ padding: '0.6rem', background: 'var(--gray-50)', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--red)' }}>$8K</div><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)' }}>Left</div></div>
                    </div>
                    <div style={{ background: 'var(--gray-200)', borderRadius: '6px', height: '10px', overflow: 'hidden', marginBottom: '0.4rem' }}><div style={{ height: '100%', width: '11.4%', background: 'var(--blue)', borderRadius: '6px' }}></div></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', color: 'var(--gray-500)', marginBottom: '0.75rem' }}><span>$1,027 / $9,000</span><span>3 deals contributing</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                      <div style={{ background: 'var(--gray-50)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '0.45rem', color: 'var(--gray-500)' }}>Cap Amount</div><div style={{ fontWeight: 700, fontSize: '0.7rem' }}>$9,000</div></div>
                      <div style={{ background: 'var(--gray-50)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '0.45rem', color: 'var(--gray-500)' }}>Cap % Per Deal</div><div style={{ fontWeight: 700, fontSize: '0.7rem' }}>2%</div></div>
                    </div>
                  </div>
                  {/* Panel 4: Goal Settings */}
                  <div className="hm-panel" data-panel="4">
                    <div className="hm-title">Goal Settings</div>
                    <div className="hm-sub">Configure your monthly goals and targets</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)', marginBottom: '0.15rem' }}>Goal Type</div><div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.6rem', color: 'var(--gray-700)' }}>GCI (Gross Commission Income)</div></div>
                      <div><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)', marginBottom: '0.15rem' }}>Annual GCI Goal</div><div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--green-primary)' }}>250,000</div></div>
                      <div><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)', marginBottom: '0.15rem' }}>Monthly GCI Target</div><div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-900)' }}>20,833</div></div>
                      <div><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)', marginBottom: '0.15rem' }}>Avg GCI per Closing</div><div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-900)' }}>8,000</div></div>
                      <div><div style={{ fontSize: '0.5rem', color: 'var(--gray-500)', marginBottom: '0.15rem' }}>Working Days This Month</div><div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--gray-900)' }}>20</div></div>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}><div style={{ background: 'var(--green-primary)', color: 'white', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.5rem', fontWeight: 700, display: 'inline-block' }}>💾 Save Goal Settings</div></div>
                  </div>
                </div>
              </div>
              <svg className="fake-cursor" ref={cursorRef} id="fakeCursor" viewBox="0 0 24 24" fill="none">
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z" fill="#222" stroke="#fff" strokeWidth="1.5"></path>
              </svg>
              <div className="hero-view-label" ref={viewLabelRef} id="demoViewLabel">Viewing: <span>Dashboard</span></div>
            </div>
          </div>
        </div>
        <div className="scroll-indicator">Scroll to explore<span>↓</span></div>
      </section>

      {/* iOS APP BANNER */}
      <div className="ios-banner">
        <div className="ios-banner-inner">
          <div className="ios-banner-phone"><div className="ios-banner-phone-screen"></div></div>
          <div className="ios-banner-copy">
            <div className="ios-banner-headline">I Need Numbers is now on iPhone.</div>
            <div className="ios-banner-sub">Your AI Coach, P&amp;L, and every calculator — in your pocket.</div>
          </div>
          <a href="https://apps.apple.com/us/app/my-real-estate-coach-inn/id6759263228" target="_blank" rel="noopener noreferrer" className="ios-banner-badge">
            <svg viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            Download on the App Store
          </a>
        </div>
      </div>

      {/* AI COACH SPOTLIGHT */}
      <section className="ai-spotlight" id="ai-coach">
        <div className="ai-spotlight-inner fade-up">
          <div className="ai-spotlight-badge">✨ AI-Powered</div>
          <h2>Set Your Annual Goal.<br />AI Breaks It Down Daily.</h2>
          <p className="ai-spotlight-desc">
            Tell the AI Coach you want to make $250K this year. It calculates your monthly GCI target, figures out how many deals you need, and breaks it into the exact daily activities — conversations, appointments, offers, listings — to get there. Then it tracks everything and adjusts as you go.
          </p>
          <div className="goal-flow">
            <div className="goal-step">
              <div className="goal-step-label">Annual Goal</div>
              <div className="goal-step-value">$250,000</div>
              <div className="goal-step-sub">GCI Target</div>
            </div>
            <div className="goal-arrow">→</div>
            <div className="goal-step">
              <div className="goal-step-label">Monthly Target</div>
              <div className="goal-step-value">$20,833</div>
              <div className="goal-step-sub">Per Month</div>
            </div>
            <div className="goal-arrow">→</div>
            <div className="goal-step">
              <div className="goal-step-label">Deals Needed</div>
              <div className="goal-step-value">~3/mo</div>
              <div className="goal-step-sub">At $8K avg GCI</div>
            </div>
            <div className="goal-arrow">→</div>
            <div className="goal-step ai">
              <div className="goal-step-label">✨ AI Daily Plan</div>
              <div className="goal-step-value">6 calls, 1 appt, 1 offer, 1 listing</div>
              <div className="goal-step-sub">Today's actions</div>
            </div>
          </div>
          <div className="ai-features">
            <div className="ai-feature-card">
              <div className="ai-feature-icon" style={{ background: 'var(--purple-bg)' }}>🎯</div>
              <h4>Daily Priority Actions</h4>
              <p>Your AI Coach surfaces the 3 most important things to do today based on your pipeline, goals, and recent activity.</p>
            </div>
            <div className="ai-feature-card">
              <div className="ai-feature-icon" style={{ background: '#fef3c7' }}>⚠️</div>
              <h4>Time-Sensitive Alerts</h4>
              <p>Due diligence deadlines, follow-up reminders, and pipeline gaps — flagged before they become problems.</p>
            </div>
            <div className="ai-feature-card">
              <div className="ai-feature-icon" style={{ background: 'var(--green-light)' }}>📈</div>
              <h4>Business Health Summary</h4>
              <p>A plain-English analysis of your income, expenses, cap progress, and what to adjust to hit your annual goal.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN 1: Don't know what you're making */}
      <section className="pain-section" id="features">
        <div className="pain-inner">
          <div className="fade-up">
            <div className="pain-number">1</div>
            <div className="pain-label">The Problem</div>
            <h2 className="pain-headline">You don't know what you're actually making.</h2>
            <p className="pain-description">You track GCI and celebrate big commission checks. But after splits, fees, marketing costs, and taxes — do you know what's left? Most agents can't answer that question.</p>
            <div className="solution-label">The Fix</div>
            <p className="solution-text">The <strong>Agent P&amp;L Tracker</strong> shows your real profit — not vanity metrics. Track every dollar in, every expense out, and know your actual take-home by month.</p>
            <div className="ai-note"><span className="sparkle">✨</span> <span>The AI Coach reads your P&amp;L data and tells you if you're on track for your annual goal — or what to change.</span></div>
            <Link to="/features/pnl-tracker" className="pain-feature-link">Learn more about the P&amp;L Tracker →</Link>
          </div>
          <div className="fade-up feature-visual" style={{ transitionDelay: '0.2s' }}>
            <div className="fv-title-bar">
              <div className="fv-dot fv-dot-r"></div><div className="fv-dot fv-dot-y"></div><div className="fv-dot fv-dot-g"></div>
              <div className="fv-tab">Agent P&amp;L Tracker — April 2026</div>
              <div className="fv-ai-badge">✨ AI</div>
            </div>
            <div className="pl-summary-row">
              <div className="pl-summary-card"><div className="pl-summary-label">Total Income</div><div className="pl-summary-value" style={{ color: 'var(--green-primary)' }}>$22,075</div></div>
              <div className="pl-summary-card"><div className="pl-summary-label">Total Expenses</div><div className="pl-summary-value" style={{ color: 'var(--red)' }}>$1,250</div></div>
              <div className="pl-summary-card"><div className="pl-summary-label">Net Income</div><div className="pl-summary-value" style={{ color: 'var(--green-primary)' }}>$20,825</div></div>
            </div>
            <table className="pl-deals-table">
              <tbody>
                <tr><th>Property</th><th>Sale Price</th><th>Commission</th><th>Final Income</th><th>Status</th></tr>
                <tr><td>432 West Longstreet</td><td>$611,000</td><td>1.6%</td><td className="income">$9,580</td><td className="status">3 days left</td></tr>
                <tr><td>111 West Jackson St</td><td>$425,000</td><td>3%</td><td className="income">$12,495</td><td className="status">0 days</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* PAIN 2: Cap progress */}
      <section className="pain-section reverse">
        <div className="pain-inner">
          <div className="fade-up">
            <div className="pain-number">2</div>
            <div className="pain-label">The Problem</div>
            <h2 className="pain-headline">You don't know how close you are to capping.</h2>
            <p className="pain-description">Your brokerage tells you after you've capped. But by then, you've missed weeks where you could have pushed harder — knowing every deal would go straight to your pocket.</p>
            <div className="solution-label">The Fix</div>
            <p className="solution-text">The <strong>Commission Cap Tracker</strong> monitors your progress in real-time. See exactly how much you've paid, how much remains, and when you'll hit 100% splits.</p>
            <div className="ai-note"><span className="sparkle">✨</span> <span>The AI Coach factors your cap progress into daily priorities — when you're close, it pushes you to close that next deal.</span></div>
            <Link to="/features/cap-report" className="pain-feature-link">Learn more about the Cap Tracker →</Link>
          </div>
          <div className="fade-up feature-visual" style={{ transitionDelay: '0.2s' }}>
            <div className="fv-title-bar">
              <div className="fv-dot fv-dot-r"></div><div className="fv-dot fv-dot-y"></div><div className="fv-dot fv-dot-g"></div>
              <div className="fv-tab">Commission Cap Tracker</div>
            </div>
            <div className="cap-mock">
              <div className="cap-stats">
                <div className="cap-stat"><div className="cap-stat-value" style={{ color: 'var(--green-primary)' }}>11.41%</div><div className="cap-stat-label">Progress</div></div>
                <div className="cap-stat"><div className="cap-stat-value" style={{ color: 'var(--green-dark)' }}>$1,027</div><div className="cap-stat-label">Paid</div></div>
                <div className="cap-stat"><div className="cap-stat-value" style={{ color: 'var(--red)' }}>$7,973</div><div className="cap-stat-label">Remaining</div></div>
              </div>
              <div className="cap-progress-bar"><div className="cap-progress-fill" style={{ width: '11.4%' }}></div></div>
              <div className="cap-progress-text"><span>$1,027 / $9,000</span><span>3 deals contributing</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
                <div style={{ background: 'var(--gray-50)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '0.6rem', color: 'var(--gray-500)' }}>Cap Amount</div><div style={{ fontWeight: 700 }}>$9,000</div></div>
                <div style={{ background: 'var(--gray-50)', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}><div style={{ fontSize: '0.6rem', color: 'var(--gray-500)' }}>Cap % Per Deal</div><div style={{ fontWeight: 700 }}>2%</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN 3: Affordability */}
      <section className="pain-section">
        <div className="pain-inner">
          <div className="fade-up">
            <div className="pain-number">3</div>
            <div className="pain-label">The Problem</div>
            <h2 className="pain-headline">Your buyers don't know what they can afford.</h2>
            <p className="pain-description">They guess. They use generic online calculators. They fall in love with homes outside their range. Then deals fall apart — and everyone's time is wasted.</p>
            <div className="solution-label">The Fix</div>
            <p className="solution-text">The <strong>Mortgage &amp; Affordability Calculator</strong> gives buyers instant clarity — with real tax rates, insurance, PMI, HOA, and DTI qualification. Branded with your info.</p>
            <Link to="/features/mortgage-calculator" className="pain-feature-link">Learn more about the Mortgage Calculator →</Link>
          </div>
          <div className="fade-up feature-visual" style={{ transitionDelay: '0.2s' }}>
            <div className="fv-title-bar">
              <div className="fv-dot fv-dot-r"></div><div className="fv-dot fv-dot-y"></div><div className="fv-dot fv-dot-g"></div>
              <div className="fv-tab">Mortgage &amp; Affordability Calculator</div>
            </div>
            <div className="afford-mockup">
              <div className="afford-input-group">
                <div className="afford-input"><div className="afford-input-label">Home Price</div><div className="afford-input-value">$400,000</div></div>
                <div className="afford-input"><div className="afford-input-label">Down Payment</div><div className="afford-input-value">$80,000 (20%)</div></div>
                <div className="afford-input"><div className="afford-input-label">Interest Rate</div><div className="afford-input-value">7.5%</div></div>
                <div className="afford-input"><div className="afford-input-label">Loan Term</div><div className="afford-input-value">30 years</div></div>
                <div className="afford-input"><div className="afford-input-label">Property Tax (Annual)</div><div className="afford-input-value">$8,000</div></div>
                <div className="afford-input"><div className="afford-input-label">Insurance (Annual)</div><div className="afford-input-value">$1,200</div></div>
              </div>
              <div className="afford-result">
                <div className="afford-result-label">Monthly Payment (PITI)</div>
                <div className="afford-result-value">$3,003</div>
                <div className="afford-result-sub">Principal, Interest, Taxes &amp; Insurance</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN 4: Seller Net Sheet */}
      <section className="pain-section reverse">
        <div className="pain-inner">
          <div className="fade-up">
            <div className="pain-number">4</div>
            <div className="pain-label">The Problem</div>
            <h2 className="pain-headline">Your sellers are shocked at closing.</h2>
            <p className="pain-description">The house sells for $450K. They expect $420K. They get $387K. The surprise — and the blame — lands on you.</p>
            <div className="solution-label">The Fix</div>
            <p className="solution-text">The <strong>Seller Net Sheet</strong> shows sellers exactly what they'll walk away with — before they sign. Every deduction itemized, multiple scenarios, branded with your info.</p>
            <Link to="/features/net-sheet" className="pain-feature-link">Learn more about the Seller Net Sheet →</Link>
          </div>
          <div className="fade-up" style={{ transitionDelay: '0.2s' }}>
            <div className="net-sheet-mockup">
              <div className="net-sheet-header"><span className="net-sheet-title">Seller Net Sheet Estimator</span><span className="net-sheet-branded">Your Name | Brokerage</span></div>
              <div className="net-sheet-body">
                <div className="ns-row"><span className="ns-label">Expected Sale Price</span><span className="ns-value">$500,000</span></div>
                <div className="ns-row"><span className="ns-label">First Mortgage Payoff</span><span className="ns-value">-$250,000</span></div>
                <div className="ns-row"><span className="ns-label">Commission (6%)</span><span className="ns-value" style={{ color: 'var(--red)' }}>-$30,000</span></div>
                <div className="ns-row"><span className="ns-label">Title/Escrow/Attorney</span><span className="ns-value">-$2,500</span></div>
                <div className="ns-row"><span className="ns-label">Transfer Tax</span><span className="ns-value">-$1,000</span></div>
                <div className="ns-row"><span className="ns-label">Recording + Doc Stamps</span><span className="ns-value">-$1,250</span></div>
                <div className="ns-row"><span className="ns-label">Prorated Taxes</span><span className="ns-value">-$2,000</span></div>
                <div className="ns-row"><span className="ns-label">Seller Concessions</span><span className="ns-value">-$5,000</span></div>
              </div>
              <div className="ns-total"><span className="ns-total-label">Estimated Seller Net</span><span className="ns-total-value">$208,250</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN 5: Commission confusion */}
      <section className="pain-section">
        <div className="pain-inner">
          <div className="fade-up">
            <div className="pain-number">5</div>
            <div className="pain-label">The Problem</div>
            <h2 className="pain-headline">Commission splits make your eyes cross.</h2>
            <p className="pain-description">Total commission, listing split, buyer split, brokerage cut, team splits, transaction fees... By the time you work through all the layers, you've lost the client's attention.</p>
            <div className="solution-label">The Fix</div>
            <p className="solution-text">The <strong>Commission Split Calculator</strong> breaks it all down instantly — every layer, every fee, your real take-home. Share the breakdown with clients to build trust.</p>
            <Link to="/features/commission-calculator" className="pain-feature-link">Learn more about the Commission Calculator →</Link>
          </div>
          <div className="fade-up feature-visual" style={{ transitionDelay: '0.2s' }}>
            <div className="fv-title-bar">
              <div className="fv-dot fv-dot-r"></div><div className="fv-dot fv-dot-y"></div><div className="fv-dot fv-dot-g"></div>
              <div className="fv-tab">Commission Split Calculator</div>
            </div>
            <div className="calc-mockup">
              <div className="calc-row"><span className="calc-label">Sale Price</span><span className="calc-value">$500,000</span></div>
              <div className="calc-row"><span className="calc-label">Total Commission (6%)</span><span className="calc-value">$30,000</span></div>
              <div className="calc-row"><span className="calc-label">Your Side (Listing 50%)</span><span className="calc-value">$15,000</span></div>
              <div className="calc-row"><span className="calc-label">Brokerage Split (70%)</span><span className="calc-value">-$4,500</span></div>
              <div className="calc-row"><span className="calc-label">Transaction Fee</span><span className="calc-value">-$500</span></div>
              <div className="calc-row"><span className="calc-label">Franchise/Royalty Fee</span><span className="calc-value">-$250</span></div>
              <div className="calc-total"><span className="calc-total-label">Your Take-Home</span><span className="calc-total-value">$9,750</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN 6: Investor clients */}
      <section className="pain-section reverse">
        <div className="pain-inner">
          <div className="fade-up">
            <div className="pain-number">6</div>
            <div className="pain-label">The Problem</div>
            <h2 className="pain-headline">Investor clients need numbers you don't have.</h2>
            <p className="pain-description">They ask about cap rates, cash-on-cash return, and cash flow. You scramble for a spreadsheet — or worse, admit you don't have those numbers. They call the next agent.</p>
            <div className="solution-label">The Fix</div>
            <p className="solution-text">The <strong>Investor Deal Generator</strong> creates professional investment analysis with cash flow, ROI, cap rates, and property details — branded and ready to share as a PDF.</p>
            <Link to="/features/deal-analyzer" className="pain-feature-link">Learn more about the Investor Deal Analyzer →</Link>
          </div>
          <div className="fade-up feature-visual" style={{ transitionDelay: '0.2s' }}>
            <div className="fv-title-bar">
              <div className="fv-dot fv-dot-r"></div><div className="fv-dot fv-dot-y"></div><div className="fv-dot fv-dot-g"></div>
              <div className="fv-tab">Investor Deal Generator</div>
            </div>
            <div className="inv-mockup">
              <div className="inv-property">
                <div className="inv-address">123 Main Street, Austin TX — Duplex</div>
                <div className="inv-metrics">
                  <div className="inv-metric"><div className="inv-metric-label">Cap Rate</div><div className="inv-metric-value positive">7.2%</div></div>
                  <div className="inv-metric"><div className="inv-metric-label">Cash-on-Cash</div><div className="inv-metric-value positive">9.4%</div></div>
                  <div className="inv-metric"><div className="inv-metric-label">Monthly CF</div><div className="inv-metric-value positive">+$623</div></div>
                </div>
              </div>
              <div className="inv-verdict">✅ Strong investment — above-market returns with positive cash flow</div>
              <div className="calc-row"><span className="calc-label">Purchase Price</span><span className="calc-value">$450,000</span></div>
              <div className="calc-row"><span className="calc-label">Monthly Rent</span><span className="calc-value">$2,800</span></div>
              <div className="calc-row"><span className="calc-label">Monthly Expenses</span><span className="calc-value">-$2,177</span></div>
              <div className="calc-total"><span className="calc-total-label">Annual Cash Flow</span><span className="calc-total-value">$7,476</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN 7: Busy not strategic */}
      <section className="pain-section">
        <div className="pain-inner">
          <div className="fade-up">
            <div className="pain-number">7</div>
            <div className="pain-label">The Problem</div>
            <h2 className="pain-headline">You're busy all day but your pipeline is empty.</h2>
            <p className="pain-description">You answered 30 emails, organized your CRM, and posted on social media. But you didn't make a single prospecting call. At the end of the month, nothing closed.</p>
            <div className="solution-label">The Fix</div>
            <p className="solution-text">The <strong>Action Tracker</strong> shows exactly what activities you need today based on your goal. Conversations, appointments, offers, listings — with a gap column showing what's left.</p>
            <div className="ai-note"><span className="sparkle">✨</span> <span>The AI Coach combines your action tracker data with your P&amp;L to give you a complete daily business briefing.</span></div>
            <Link to="/features/action-tracker" className="pain-feature-link">Learn more about the Action Tracker →</Link>
          </div>
          <div className="fade-up feature-visual" style={{ transitionDelay: '0.2s' }}>
            <div className="fv-title-bar">
              <div className="fv-dot fv-dot-r"></div><div className="fv-dot fv-dot-y"></div><div className="fv-dot fv-dot-g"></div>
              <div className="fv-tab">Action Tracker — Today</div>
              <div className="fv-ai-badge">✨ AI</div>
            </div>
            <div className="at-mockup">
              <div className="at-goal">Goal this month: <span>$20,000</span></div>
              <table className="at-table">
                <tbody>
                  <tr><th>Activity</th><th>Needed Today</th><th>Completed</th><th>Gap</th></tr>
                  <tr><td>Conversations</td><td>6</td><td>2</td><td><span className="at-gap red">4</span></td></tr>
                  <tr><td>Appointments</td><td>1</td><td>1</td><td><span className="at-gap green">0</span></td></tr>
                  <tr><td>Offers Written</td><td>1</td><td>0</td><td><span className="at-gap yellow">1</span></td></tr>
                  <tr><td>Listings Taken</td><td>1</td><td>0</td><td><span className="at-gap yellow">1</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN 8: Closing dates */}
      <section className="pain-section reverse">
        <div className="pain-inner">
          <div className="fade-up">
            <div className="pain-number">8</div>
            <div className="pain-label">The Problem</div>
            <h2 className="pain-headline">You lose track of deadlines after the contract is signed.</h2>
            <p className="pain-description">Due diligence periods, closing dates, contingency deadlines — they all blur together when you're juggling multiple deals. Miss one and it costs your client money, or worse, the deal.</p>
            <div className="solution-label">The Fix</div>
            <p className="solution-text">The <strong>Closing Date Calculator</strong> tracks every active deal after contract signature. See closing dates, due diligence countdowns, and get alerts before deadlines slip past you.</p>
            <div className="ai-note"><span className="sparkle">✨</span> <span>The AI Coach monitors your deal timelines and flags time-sensitive deadlines in your daily briefing — so nothing falls through the cracks.</span></div>
            <Link to="/features/closing-date" className="pain-feature-link">Learn more about the Closing Date Calculator →</Link>
          </div>
          <div className="fade-up feature-visual" style={{ transitionDelay: '0.2s' }}>
            <div className="fv-title-bar">
              <div className="fv-dot fv-dot-r"></div><div className="fv-dot fv-dot-y"></div><div className="fv-dot fv-dot-g"></div>
              <div className="fv-tab">Active Deals</div>
              <div className="fv-ai-badge">✨ AI</div>
            </div>
            <div className="deal-tracker-mockup">
              <div className="deal-header">
                <div className="deal-header-title">📈 Active Deals</div>
                <div className="deal-header-count">2 deals</div>
              </div>
              <div className="deal-card">
                <div className="deal-card-left">
                  <div className="deal-address">432 West Longstreet</div>
                  <div className="deal-date">📅 Closing Date: Apr 21, 2026</div>
                  <div className="deal-warning">⏱ Due diligence ending soon!</div>
                </div>
                <div className="deal-card-right">
                  <div className="deal-dd-label">Due Diligence:</div>
                  <div className="deal-dd-value urgent">3 days left</div>
                </div>
              </div>
              <div className="deal-card">
                <div className="deal-card-left">
                  <div className="deal-address">111 West Jackson St</div>
                  <div className="deal-date">📅 Closing Date: Apr 29, 2026</div>
                </div>
                <div className="deal-card-right">
                  <div className="deal-dd-label">Due Diligence:</div>
                  <div className="deal-dd-value critical">0 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE APP BANNER */}
      <section className="mobile-banner">
        <div className="mobile-inner">
          <div className="mobile-text">
            <h2>Your Numbers. In Your Pocket.</h2>
            <p>Pull up any calculator at a listing appointment. Check your P&amp;L from the car. Get your AI Coach briefing over coffee. The <span className="brand-name-white">I Need Numbers</span> iOS app puts your entire business dashboard in your pocket.</p>
            <a href="https://apps.apple.com/us/app/my-real-estate-coach-inn/id6759263228" target="_blank" rel="noopener noreferrer" className="app-store-btn">
              <span className="app-store-icon"></span>
              <span>Download on the App Store</span>
            </a>
            <p style={{ marginTop: '0.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Search "My Real Estate Coach - INN" on the App Store</p>
          </div>
          <div className="mobile-phone">
            <div className="phone-frame">
              <div className="phone-notch"></div>
              <div className="phone-screen">
                <div className="phone-header"><span className="brand-name" style={{ fontSize: 'inherit' }}>I Need Numbers</span></div>
                <div className="phone-card">
                  <div className="phone-card-title">Net Profit</div>
                  <div className="phone-card-value">$20,825</div>
                  <div className="phone-card-sub">April 2026</div>
                </div>
                <div className="phone-ai">
                  <div className="phone-ai-title">✨ AI Coach</div>
                  <div className="phone-ai-text">Focus on prospecting today. You need 4 more conversations to stay on track for your monthly goal.</div>
                </div>
                <div className="phone-card">
                  <div className="phone-card-title">Cap Progress</div>
                  <div className="phone-card-value">11.4%</div>
                  <div className="phone-card-sub">$1,027 of $9,000</div>
                </div>
                <div className="phone-card" style={{ background: '#f3e8ff' }}>
                  <div className="phone-card-title" style={{ color: 'var(--purple)' }}>Active Deals</div>
                  <div className="phone-card-value">2</div>
                  <div className="phone-card-sub">432 W Longstreet • 111 W Jackson</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING - hide on iOS */}
      {!iosRestricted && (
        <section className="pricing-section-redesign" id="pricing">
          <div className="fade-up">
            <h2 className="pricing-headline">One Plan. Everything Included.</h2>
            <p className="pricing-sub">No tiers. No upsells. No confusion.</p>
            <div className="pricing-card">
              <div className="pricing-amount">$49.99<span> / month</span></div>
              <p className="pricing-tagline">7-day free trial. Cancel anytime. No contracts. iOS app included.</p>
              <div className="pricing-features">
                <div className="pricing-feature"><div className="pricing-check">✓</div>AI Coach</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Mortgage Calculator</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Agent P&amp;L Tracker</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Seller Net Sheet</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Commission Cap Tracker</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Commission Split Calc</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Action Tracker</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Closing Date Calculator</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Branded PDF Reports</div>
                <div className="pricing-feature"><div className="pricing-check">✓</div>Investor Deal Generator</div>
              </div>
              <button onClick={() => navigate('/auth/register')} className="btn-pricing" data-testid="pricing-cta-btn">Start Your 7-Day Free Trial</button>
              <p className="pricing-note">Join agents already using <span className="brand-name-light">I Need Numbers</span> to grow their business</p>
            </div>
          </div>
        </section>
      )}

      {/* TRUST */}
      <section className="trust-section">
        <div className="fade-up">
          <h2 className="trust-headline">Built by Agents. For Agents.</h2>
          <p className="trust-sub">We built what we wished existed. No spreadsheets. No guessing. Just clarity.</p>
          <div className="trust-points">
            <div className="trust-point"><div className="trust-icon">✨</div><div className="trust-point-title">AI-Powered</div><div className="trust-point-desc">Your AI Coach analyzes your business daily and tells you what to focus on.</div></div>
            <div className="trust-point"><div className="trust-icon">📱</div><div className="trust-point-title">iOS App</div><div className="trust-point-desc">Full access from your phone. Every calculator, your P&amp;L, and AI Coach on the go.</div></div>
            <div className="trust-point"><div className="trust-icon">🎨</div><div className="trust-point-title">Your Branding</div><div className="trust-point-desc">Every report and PDF carries your name, logo, and brand colors.</div></div>
            <div className="trust-point"><div className="trust-icon">🔒</div><div className="trust-point-title">Private &amp; Secure</div><div className="trust-point-desc">Your financial data stays yours. Always encrypted, never shared.</div></div>
          </div>
        </div>
      </section>

      {/* FINAL CTA - hide on iOS */}
      {!iosRestricted && (
        <section className="final-cta">
          <div className="fade-up">
            <h2>Stop Guessing. Start Knowing.</h2>
            <p>Join the agents who run their business with clarity, AI coaching, and real numbers.</p>
            <button onClick={() => navigate('/auth/register')} className="btn-white" data-testid="final-cta-btn">Start Your Free Trial →</button>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
};

export default HomePageRedesign;
