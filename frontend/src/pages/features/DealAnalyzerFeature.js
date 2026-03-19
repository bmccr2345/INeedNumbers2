import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const DealAnalyzerFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="Stop guessing if a deal is good."
      heroSubheadline="Break down investment deals instantly with professional analysis."
      ctaText="Analyze This Deal"
      
      // Problem
      problemText="Numbers look good… until they don't. You want to work with investors but lack the tools to analyze deals quickly and professionally."
      
      // Root Cause
      rootCauseText="You're not analyzing deals with a consistent system."
      
      // Solution
      solutionIntro="Break down deals instantly."
      solutionBullets={[
        "Cap rate and cash flow analysis",
        "Multi-unit support",
        "Clean investor PDF reports",
        "Professional presentation"
      ]}
      
      // Transformation
      beforeItems={["Uncertainty", "Guessing", "Unprofessional"]}
      afterItems={["Confident decisions", "Clear analysis", "Investor-ready"]}
      
      // Proof
      proofText="Know the numbers before you commit."
    />
  );
};

export default DealAnalyzerFeature;
