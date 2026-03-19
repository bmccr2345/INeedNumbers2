import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const ActionTrackerFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="If you're not tracking it, it's not improving."
      heroSubheadline="Track what actually drives results and build accountability."
      ctaText="Track My Activity"
      
      // Problem
      problemText="You think you're working… but can't prove it. You don't actually know what you did today, and you're inconsistent with your daily activities."
      
      // Root Cause
      rootCauseText="No consistent tracking of daily activity."
      
      // Solution
      solutionIntro="Track what actually drives results."
      solutionBullets={[
        "Log daily actions",
        "See patterns",
        "Identify gaps",
        "Feed insights into AI Coach"
      ]}
      
      // Transformation
      beforeItems={["Inconsistency", "No proof of work", "Guessing"]}
      afterItems={["Accountability", "Clear patterns", "Data-driven improvement"]}
      
      // Proof
      proofText="Take control of your day."
    />
  );
};

export default ActionTrackerFeature;
