import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Search,
  ArrowLeft,
  Mail,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  CreditCard,
  Calculator,
  FileText,
  Users,
  Share2,
  Settings,
  AlertTriangle,
  Shield,
  XCircle
} from 'lucide-react';
import Footer from '../components/Footer';
import { useAuth } from '../contexts/AuthContext';
import { navigateToHome } from '../utils/navigation';

const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [openAccordion, setOpenAccordion] = useState(null);

  // SEO Meta tags
  useEffect(() => {
    document.title = 'Support & FAQs — I Need Numbers';
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Help for agents: billing, calculators, branded PDFs, tools (commission split, seller net sheet, affordability), and cancellation policy. Contact support@ineednumbers.com.');
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = 'Help for agents: billing, calculators, branded PDFs, tools (commission split, seller net sheet, affordability), and cancellation policy. Contact support@ineednumbers.com.';
      document.head.appendChild(newMeta);
    }

    // Analytics page view
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'support_view');
    }

    return () => {
      document.title = 'I Need Numbers';
    };
  }, []);

  // Quick link categories with icons
  const quickLinks = [
    { title: "Getting started", icon: <PlayCircle className="w-5 h-5" />, id: "getting-started" },
    { title: "Account & billing", icon: <CreditCard className="w-5 h-5" />, id: "account-billing" },
    { title: "Calculators & PDFs", icon: <Calculator className="w-5 h-5" />, id: "calculators-pdfs" },
    { title: "Branding & agent info", icon: <Users className="w-5 h-5" />, id: "branding-agent" },
    { title: "Sharing & portfolios", icon: <Share2 className="w-5 h-5" />, id: "sharing-portfolios" },
    { title: "Agent tools: Split / Net Sheet / Affordability", icon: <Settings className="w-5 h-5" />, id: "agent-tools" },
    { title: "Troubleshooting", icon: <AlertTriangle className="w-5 h-5" />, id: "troubleshooting" },
    { title: "Privacy & data", icon: <Shield className="w-5 h-5" />, id: "privacy-data" },
    { title: "Cancellation Policy", icon: <XCircle className="w-5 h-5" />, id: "cancellation-policy" }
  ];

  // FAQ Data organized by categories
  const faqData = {
    "getting-started": {
      title: "Getting started",
      questions: [
        {
          q: "What is I Need Numbers?",
          a: "I Need Numbers is an all-in-one toolkit built for real estate agents. It takes the math, reports, and financial tracking you deal with every day and makes them simple. With calculators (Mortgage, Commission Split, Seller Net Sheet), investor-ready PDF packets, and a personal Profit & Loss tracker, you can run your business with clarity and confidence. Whether you're answering a client's \"What will I net?\" question on the spot or keeping tabs on your own income and expenses, I Need Numbers gives you fast, professional tools in one easy platform."
        },
        {
          q: "How much does it cost?",
          a: "I Need Numbers is $49.99/month. One plan, everything included. No tiers, no upsells, no confusion. You get full access to all features: AI Coach, Agent P&L Tracker, Commission Cap Report, Action Tracker, all calculators, branded PDFs, unlimited saves, and more. Cancel anytime."
        },
        {
          q: "What's included in the subscription?",
          a: "Everything! AI Coach for daily business insights, Agent P&L Tracker, Commission Cap Report, Action Tracker, Mortgage Calculator, Seller Net Sheet, Commission Split Calculator, Closing Date Calculator, Investor Deal Generator, unlimited saves, branded PDFs, share links, and portfolios."
        }
      ]
    },
    "account-billing": {
      title: "Account & billing",
      questions: [
        {
          q: "How do I cancel?",
          a: "Go to My Account → Manage Billing to open the Stripe Customer Portal. You can cancel any time; your plan stays active until the end of your current billing period, and you won't be charged for subsequent months."
        },
        {
          q: "What happens to my account after I cancel?",
          a: "You'll keep access until the current period ends. After that, your account becomes inactive. Your data isn't deleted unless you request it, so you can reactivate anytime."
        },
        {
          q: "Do you offer refunds?",
          a: "Subscriptions are billed in advance. If you believe you were charged in error or experienced a billing issue, email support@ineednumbers.com and we'll help."
        },
        {
          q: "Where are my invoices/receipts?",
          a: "In the Stripe Customer Portal (My Account → Manage Billing)."
        },
        {
          q: "Can I change my email or password?",
          a: "Yes—My Account has profile and password settings. If you're locked out, use \"Forgot password.\""
        },
        {
          q: "Cancellation Policy",
          a: "Cancel via My Account → Manage Billing (Stripe Customer Portal), or email support@ineednumbers.com and we'll assist.\n\nYour plan remains active until the end of your current billing period.\n\nYou will not be charged for subsequent months after cancellation.\n\nYou can re-activate your subscription at any time in the Customer Portal."
        }
      ]
    },
    "calculators-pdfs": {
      title: "Calculators & PDFs (core investor math)",
      questions: [
        {
          q: "Which KPIs do you support?",
          a: "Cap Rate, Cash-on-Cash (CoC), DSCR, IRR (5-year), Monthly Cash Flow, Break-even Occupancy."
        },
        {
          q: "My numbers look off—what should I check first?",
          a: "Verify vacancy, management %, taxes/insurance, and financing inputs."
        },
        {
          q: "What's in a branded PDF?",
          a: "Your name, brokerage, logo, and contact details on every page."
        },
        {
          q: "PDF won't generate or is missing branding.",
          a: "Ensure required agent fields (Full Name and Brokerage) are filled. If it still fails, try a fresh tab and email support@ineednumbers.com with the deal link."
        }
      ]
    },
    "branding-agent": {
      title: "Branding & agent info",
      questions: [
        {
          q: "Where do I add my branding?",
          a: "On the calculator page, in the Agent Personalization section above the action bar."
        },
        {
          q: "Logo guidelines?",
          a: "Transparent PNG recommended; ~800px wide; file size under ~500 KB."
        }
      ]
    },
    "sharing-portfolios": {
      title: "Sharing & portfolios",
      questions: [
        {
          q: "How do share links work?",
          a: "Create a public link to the investor-facing deal page that you can share with clients and investors."
        },
        {
          q: "Can I organize multiple deals?",
          a: "Yes—use Portfolios for weighted IRR, average cap rate, and totals. Unlimited portfolios included."
        }
      ]
    },
    "agent-tools": {
      title: "Agent tools: Split / Net Sheet / Affordability",
      questions: [
        {
          q: "Commission Split—how is take-home calculated?",
          a: "We compute GCI, apply your side (listing/buyer/dual) and brokerage split, then subtract referrals, team splits, and fixed fees to show Net to Agent."
        },
        {
          q: "Seller Net Sheet—are the costs exact?",
          a: "They're editable estimates. Actual title/recording/transfer fees vary by state and vendor—confirm with title/attorney."
        },
        {
          q: "Affordability—does this equal loan approval?",
          a: "No. It estimates PITI (PI, taxes, insurance, PMI if any, HOA) and checks DTI/LTV. It's not a credit decision."
        }
      ]
    },
    "privacy-data": {
      title: "URL prefill & data",
      questions: [
        {
          q: "Which listing sites can I paste for prefill?",
          a: "You can paste popular public listing URLs. If a field looks wrong, override manually."
        },
        {
          q: "Is my data private?",
          a: "Saved deals and PDFs live in your account. We use HTTPS and industry-standard practices. Don't upload sensitive personal info."
        },
        {
          q: "Can I delete my data?",
          a: "Yes—delete saved items from their page or email support@ineednumbers.com with your account email."
        }
      ]
    },
    "troubleshooting": {
      title: "Troubleshooting",
      questions: [
        {
          q: "KPIs aren't updating.",
          a: "Refresh and recheck required fields (price, rent, financing). If it persists, try another browser."
        },
        {
          q: "PDF looks blurry or too big.",
          a: "Use high-contrast logos and reasonable image sizes. Investor PDFs are typically ≤ 3 pages (main calc) or 1 page (tools)."
        },
        {
          q: "Billing failed.",
          a: "Update your payment method in Manage Billing. If you still see errors, email us with the error message and timestamp."
        }
      ]
    }
  };

  // Filter FAQs based on search query
  const filteredFAQs = Object.entries(faqData).reduce((acc, [categoryId, category]) => {
    if (!searchQuery) return { ...acc, [categoryId]: category };
    
    const filteredQuestions = category.questions.filter(
      item => 
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filteredQuestions.length > 0) {
      acc[categoryId] = { ...category, questions: filteredQuestions };
    }
    
    return acc;
  }, {});

  const handleEmailClick = () => {
    // Analytics event
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'support_click_email');
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Analytics event
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'support_search', {
        search_term: e.target.value
      });
    }
  };

  const toggleAccordion = (categoryId) => {
    setOpenAccordion(openAccordion === categoryId ? null : categoryId);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-light via-white to-neutral-medium">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-neutral-medium/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigateToHome(navigate, user)}
                className="text-deep-forest hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Home
              </Button>
              
              <div className="flex items-center space-x-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_agent-portal-27/artifacts/azdcmpew_Logo_with_brown_background-removebg-preview.png" 
                  alt="I Need Numbers" 
                  className="h-8 w-auto"
                />
                <span className="text-lg font-bold text-primary font-poppins">I NEED NUMBERS</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/account')}
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                My Account
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        {/* Breadcrumbs */}
        <div className="mb-8">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-sm text-neutral-dark">
              <li>
                <button onClick={() => navigate('/')} className="hover:text-primary">
                  Home
                </button>
              </li>
              <li>
                <ChevronRight className="w-4 h-4" />
              </li>
              <li className="text-deep-forest font-medium">Support</li>
            </ol>
          </nav>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl lg:text-5xl font-bold text-deep-forest mb-4 font-poppins">
            How can we help?
          </h1>
          <p className="text-xl text-neutral-dark mb-8 max-w-2xl mx-auto">
            Answers for real estate agents using I Need Numbers.
          </p>
          
          {/* Search Input */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-dark w-5 h-5" />
            <Input
              type="text"
              placeholder="Search FAQs (e.g., cap rate, PDFs, billing)…"
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-12 pr-4 py-3 text-lg border-2 border-neutral-medium focus:border-primary"
            />
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-deep-forest mb-8 text-center">Browse by topic</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {quickLinks.map((link, index) => (
              <Card 
                key={index}
                className="hover:shadow-lg transition-shadow cursor-pointer group border border-neutral-medium/20"
                onClick={() => scrollToSection(link.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {link.icon}
                    </div>
                    <h3 className="font-semibold text-deep-forest group-hover:text-primary transition-colors">
                      {link.title}
                    </h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-deep-forest mb-8 text-center">Frequently asked questions</h2>
          <div className="max-w-4xl mx-auto space-y-8">
            {Object.entries(filteredFAQs).map(([categoryId, category]) => (
              <div key={categoryId} id={categoryId} className="space-y-4">
                <h3 className="text-xl font-bold text-deep-forest border-b border-neutral-medium pb-2">
                  {category.title}
                </h3>
                <div className="space-y-3">
                  {category.questions.map((item, index) => (
                    <Card key={index} className="border border-neutral-medium/20">
                      <button
                        className="w-full text-left p-4 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                        onClick={() => toggleAccordion(`${categoryId}-${index}`)}
                        aria-expanded={openAccordion === `${categoryId}-${index}`}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-deep-forest pr-4">
                            {item.q}
                          </h4>
                          <ChevronDown 
                            className={`w-5 h-5 text-neutral-dark transition-transform ${
                              openAccordion === `${categoryId}-${index}` ? 'rotate-180' : ''
                            }`} 
                          />
                        </div>
                      </button>
                      {openAccordion === `${categoryId}-${index}` && (
                        <div className="px-4 pb-4">
                          <div className="text-gray-700 whitespace-pre-line">
                            {item.a}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standalone Cancellation Policy Section */}
        <div id="cancellation-policy" className="mb-16">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-900">
                  <XCircle className="w-5 h-5" />
                  <span>Cancellation Policy</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-red-800 space-y-3">
                <p><strong>You can cancel your subscription at any time.</strong></p>
                <p>Cancel via My Account → Manage Billing (Stripe Customer Portal), or email support@ineednumbers.com and we'll assist.</p>
                <p>Your subscription remains active until the end of your current billing period.</p>
                <p><strong>You will not be charged for subsequent months after cancellation.</strong></p>
                <p>After the period ends, your account becomes inactive. Your data isn't deleted, so you can reactivate anytime.</p>
                <p>You can re-activate your subscription at any time in the Customer Portal.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mb-16">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2 text-primary">
                  <Mail className="w-5 h-5" />
                  <span>Contact Support</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div>
                  <p className="text-lg font-semibold text-deep-forest mb-2">Email:</p>
                  <a 
                    href="mailto:support@ineednumbers.com"
                    onClick={handleEmailClick}
                    className="text-primary hover:text-secondary font-medium text-lg underline"
                  >
                    support@ineednumbers.com
                  </a>
                </div>
                <p className="text-sm text-neutral-dark">
                  We typically reply within 1–2 business days (Mon–Fri). Please include your account email, 
                  a link to the deal or tool, steps to reproduce, and screenshots/PDF if possible.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Status */}
        <div className="mb-16">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-lg font-semibold text-deep-forest mb-4">System Status</h3>
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="w-4 h-4 mr-2" />
              All systems operational
            </Badge>
          </div>
        </div>

        {/* Legal Note */}
        <div className="max-w-4xl mx-auto">
          <Card className="border border-amber-200 bg-amber-50">
            <CardContent className="p-6 text-center">
              <p className="text-amber-800 text-sm">
                <strong>Legal note:</strong> I Need Numbers provides educational estimates. 
                Not legal, tax, or lending advice. Always verify numbers before offers or commitments.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default SupportPage;