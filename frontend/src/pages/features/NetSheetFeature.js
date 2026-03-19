import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const NetSheetFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="Stop guessing what sellers will walk away with."
      heroSubheadline="Generate clear seller proceeds instantly and build immediate trust."
      ctaText="Show Seller Proceeds"
      
      // Problem
      problemText="Sellers care about one thing: what they net. If you can't show it clearly, you lose trust. Vague conversations lead to lost listings."
      
      // Root Cause
      rootCauseText="Most agents explain numbers verbally instead of showing them."
      
      // Solution
      solutionIntro="Generate clear seller proceeds instantly."
      solutionBullets={[
        "Accurate net calculations",
        "Simple, client-friendly PDF",
        "Perfect for listing appointments",
        "Builds immediate trust"
      ]}
      
      // Transformation
      beforeItems={["Vague conversations", "Weak presentations", "Lost trust"]}
      afterItems={["Confident presentations", "Clear numbers", "Won listings"]}
      
      // Proof
      proofText="Win more listings with clarity."
    />
  );
};

export default NetSheetFeature;
