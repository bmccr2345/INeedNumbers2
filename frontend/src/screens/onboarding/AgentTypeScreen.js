import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { TrendingUp, Target, Rocket } from 'lucide-react';
import CoachingNugget from '../../components/CoachingNugget';

const AgentTypeScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState(onboardingData.agent_type);

  const agentTypes = [
    {
      id: 'building_momentum',
      label: "I'm building momentum",
      icon: TrendingUp,
      color: 'bg-blue-50 border-blue-200 text-blue-700'
    },
    {
      id: 'steady_growing',
      label: "I'm steady and growing",
      icon: Target,
      color: 'bg-emerald-50 border-emerald-200 text-emerald-700'
    },
    {
      id: 'scaling_business',
      label: "I'm scaling my business",
      icon: Rocket,
      color: 'bg-purple-50 border-purple-200 text-purple-700'
    }
  ];

  const handleSelect = (typeId) => {
    setSelected(typeId);
    updateOnboardingData('agent_type', typeId);
  };

  const handleNext = () => {
    if (selected) {
      navigate('/onboarding/why');
    }
  };

  const handleSkip = () => {
    navigate('/onboarding/why');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            What best describes where you are right now?
          </h1>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {agentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => handleSelect(type.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selected === type.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${type.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-lg font-medium text-gray-900">{type.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <CoachingNugget>
            There's no right pace in real estate; choose the rhythm that fits your season of life so you can grow without burnout. Weigh your personal goals. Whether you thrive in collaboration or prefer full autonomy, choose the path that supports your long-term vision.
          </CoachingNugget>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={handleNext}
              disabled={!selected}
              className="w-full h-12 text-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              Continue
            </Button>
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              Skip
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentTypeScreen;