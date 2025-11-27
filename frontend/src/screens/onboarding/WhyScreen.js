import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { DollarSign, Clock, Users, Heart, Building2, MoreHorizontal } from 'lucide-react';
import CoachingNugget from '../../components/CoachingNugget';

const WhyScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selected, setSelected] = useState(onboardingData.why || '');
  const [showOther, setShowOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  const reasons = [
    { id: 'income_potential', label: 'Income potential', icon: DollarSign },
    { id: 'flexibility', label: 'Flexibility and independence', icon: Clock },
    { id: 'family_time', label: 'More time with family', icon: Users },
    { id: 'passion', label: 'Passion for the industry', icon: Heart },
    { id: 'long_term', label: 'Building a long term business', icon: Building2 },
    { id: 'other', label: 'Other', icon: MoreHorizontal }
  ];

  const handleSelect = (reasonId) => {
    if (reasonId === 'other') {
      setShowOther(true);
      setSelected('');
    } else {
      setShowOther(false);
      setSelected(reasonId);
      updateOnboardingData('why', reasonId);
    }
  };

  const handleOtherChange = (e) => {
    setOtherText(e.target.value);
    setSelected(e.target.value);
    updateOnboardingData('why', e.target.value);
  };

  const handleNext = () => {
    if (selected) {
      navigate('/onboarding/income-goal');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            What's driving your real estate career right now?
          </h1>
          <p className="text-gray-600">
            This helps shape your weekly plan and coaching tone.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {reasons.map((reason) => {
              const Icon = reason.icon;
              const isSelected = selected === reason.id || (showOther && reason.id === 'other');
              return (
                <button
                  key={reason.id}
                  onClick={() => handleSelect(reason.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all ${
                    isSelected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{reason.label}</span>
                </button>
              );
            })}
          </div>

          {showOther && (
            <Input
              type="text"
              placeholder="Tell us what drives you..."
              value={otherText}
              onChange={handleOtherChange}
              className="w-full"
              autoFocus
            />
          )}

          <CoachingNugget>
            Understanding your motivation is critical. Knowing your why will keep you steady when challenges arise. Your motivation is a compass; it helps you stay centered when the work becomes unpredictable.
          </CoachingNugget>

          <Button
            onClick={handleNext}
            disabled={!selected}
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhyScreen;