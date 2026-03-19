import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const MortgageCalculatorFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="Stop losing deals to unqualified buyers."
      heroSubheadline="Show them exactly what they can afford."
      ctaText="Show Buyer Numbers"
      
      // Problem
      problemText="Buyers guess. You guess. Then the deal falls apart after weeks of work. You lose time, energy, and commission on deals that were never going to close."
      
      // Root Cause
      rootCauseText="There's no clear, simple way to present real numbers upfront."
      
      // Solution
      solutionIntro="Create clear affordability breakdowns in seconds."
      solutionBullets={[
        "Accurate monthly payment estimates",
        "Clean, client-friendly PDF exports",
        "Save and reuse scenarios",
        "Build buyer confidence instantly"
      ]}
      
      // Transformation
      beforeItems={["Uncertainty", "Wasted time", "Deals falling apart"]}
      afterItems={["Clarity", "Stronger offers", "Confident buyers"]}
      
      // Proof
      proofText="Built specifically for real estate agents who want to qualify buyers the right way."
    />
  );
};

export default MortgageCalculatorFeature;
