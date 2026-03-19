import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const AICoachFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="Stop guessing what to do every day."
      heroSubheadline="Know exactly what actions move your business forward."
      ctaText="Get My Daily Plan"
      
      // Problem
      problemText="You're working. You're busy. But you don't know if any of it actually matters. Calls, texts, follow-ups… it all blends together. And at the end of the day, you're not sure what moved the needle."
      
      // Root Cause
      rootCauseText="You don't have a system that connects your activity to real outcomes."
      
      // Solution
      solutionIntro="AI Coach gives you daily direction based on your actual business."
      solutionBullets={[
        "Tells you what to focus on today",
        "Identifies what's not working",
        "Connects activity to closings",
        "Adjusts as your business changes"
      ]}
      
      // Transformation
      beforeItems={["Guessing", "Scattered", "Inconsistent"]}
      afterItems={["Focused", "Intentional", "In control"]}
      
      // Proof
      proofText="Built specifically for real estate agents managing real deals."
    />
  );
};

export default AICoachFeature;
