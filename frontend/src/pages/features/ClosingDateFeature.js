import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const ClosingDateFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="Make the closing process clear for every client."
      heroSubheadline="Generate a clear closing timeline that reduces confusion instantly."
      ctaText="Create Closing Timeline"
      
      // Problem
      problemText="Clients are confused about what happens next. You spend too much time explaining the process, answering the same questions over and over."
      
      // Root Cause
      rootCauseText="There's no simple way to visualize the timeline."
      
      // Solution
      solutionIntro="Generate a clear closing timeline instantly."
      solutionBullets={[
        "Step-by-step breakdown",
        "Client-friendly PDF",
        "Reduces confusion",
        "Saves you time"
      ]}
      
      // Transformation
      beforeItems={["Constant questions", "Confused clients", "Wasted time"]}
      afterItems={["Clear expectations", "Professional presentation", "Happy clients"]}
      
      // Proof
      proofText="Simplify the process for your clients."
    />
  );
};

export default ClosingDateFeature;
