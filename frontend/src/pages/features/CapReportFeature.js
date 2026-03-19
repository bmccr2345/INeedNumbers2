import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const CapReportFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="Know exactly where you stand on your cap."
      heroSubheadline="Track cap progress automatically with real-time updates."
      ctaText="Check My Cap"
      
      // Problem
      problemText="You don't know when you hit full commission. You lose track of your progress and can't plan ahead because you don't have visibility into your brokerage structure."
      
      // Root Cause
      rootCauseText="No real-time tracking of cap progress."
      
      // Solution
      solutionIntro="Track cap progress automatically."
      solutionBullets={[
        "Real-time updates",
        "Clear progress tracking",
        "Know when you max out",
        "Plan better"
      ]}
      
      // Transformation
      beforeItems={["Guessing", "No visibility", "Poor planning"]}
      afterItems={["Precision", "Full visibility", "Strategic planning"]}
      
      // Proof
      proofText="Stay on top of your cap."
    />
  );
};

export default CapReportFeature;
