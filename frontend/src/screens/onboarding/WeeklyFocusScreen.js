import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Target, TrendingUp, CheckCircle } from 'lucide-react';

const WeeklyFocusScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, updateWeeklyFocus } = useOnboarding();
  
  const [leadGeneration, setLeadGeneration] = useState(onboardingData.weekly_focus?.lead_generation || false);
  const [pipelineGrowth, setPipelineGrowth] = useState(onboardingData.weekly_focus?.pipeline_growth || false);
  const [consistency, setConsistency] = useState(onboardingData.weekly_focus?.consistency || false);

  const focusOptions = [
    {
      id: 'lead_generation',
      label: 'Lead generation',
      icon: Target,
      checked: leadGeneration,
      setter: setLeadGeneration
    },
    {
      id: 'pipeline_growth',
      label: 'Grow my pipeline',
      icon: TrendingUp,
      checked: pipelineGrowth,
      setter: setPipelineGrowth
    },
    {
      id: 'consistency',
      label: 'Stay consistent weekly',
      icon: CheckCircle,
      checked: consistency,
      setter: setConsistency
    }
  ];

  const handleToggleFocus = (focusId, currentValue, setter) => {
    const newValue = !currentValue;
    setter(newValue);
    updateWeeklyFocus(focusId, newValue);
  };

  const handleNext = () => {
    navigate('/onboarding/completion');
  };

  const hasSelection = leadGeneration || pipelineGrowth || consistency;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            What should we prioritize each week?
          </h1>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {focusOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  onClick={() => handleToggleFocus(option.id, option.checked, option.setter)}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    option.checked
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Checkbox
                    id={option.id}
                    checked={option.checked}
                    onCheckedChange={() => handleToggleFocus(option.id, option.checked, option.setter)}
                    className="h-5 w-5"
                  />
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <Label htmlFor={option.id} className="text-base font-medium cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Motivation fades, but consistency builds strong pipelines and repeatable results. Steady action builds trust in your own process; consistency will always outperform intensity.
            </p>
          </div>

          <Button
            onClick={handleNext}
            disabled={!hasSelection}
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyFocusScreen;