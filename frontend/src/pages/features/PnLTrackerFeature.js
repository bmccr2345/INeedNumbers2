import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const PnLTrackerFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="GCI isn't profit. Know your real numbers."
      heroSubheadline="Track real business performance, not just what you close."
      ctaText="Track My Profit"
      
      // Problem
      problemText="You're closing deals but still feel broke. You track GCI but don't know where your money is actually going. Income comes in, but profit is a mystery."
      
      // Root Cause
      rootCauseText="You're tracking income, not profit."
      
      // Solution
      solutionIntro="Track real business performance."
      solutionBullets={[
        "Income vs expenses",
        "True profit visibility",
        "Monthly breakdowns",
        "Better decisions"
      ]}
      
      // Transformation
      beforeItems={["Confusion", "Feeling broke", "No visibility"]}
      afterItems={["Control", "Real profit clarity", "Smart decisions"]}
      
      // Proof
      proofText="See what you actually make."
    />
  );
};

export default PnLTrackerFeature;
