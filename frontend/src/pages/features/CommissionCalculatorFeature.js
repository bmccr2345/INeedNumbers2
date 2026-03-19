import React from 'react';
import FeaturePageTemplate from '../../components/FeaturePageTemplate';

const CommissionCalculatorFeature = () => {
  return (
    <FeaturePageTemplate
      // Hero
      heroHeadline="Know exactly what you'll make before you accept the deal."
      heroSubheadline="Calculate your real commission instantly, factoring in splits and fees."
      ctaText="Calculate My Commission"
      
      // Problem
      problemText="You close deals… but your paycheck surprises you. Splits, caps, and fees eat into your income in ways you don't expect."
      
      // Root Cause
      rootCauseText="Splits, caps, and fees aren't clearly tracked."
      
      // Solution
      solutionIntro="Instantly calculate your real commission."
      solutionBullets={[
        "Factor in splits and caps",
        "Account for fees",
        "See true net income",
        "Make better deal decisions"
      ]}
      
      // Transformation
      beforeItems={["Guessing income", "Surprise paychecks", "Unclear fees"]}
      afterItems={["Full clarity", "Accurate projections", "Better decisions"]}
      
      // Proof
      proofText="Stop guessing your paycheck."
    />
  );
};

export default CommissionCalculatorFeature;
