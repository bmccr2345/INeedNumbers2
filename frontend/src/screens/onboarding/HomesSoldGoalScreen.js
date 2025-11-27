import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Home } from 'lucide-react';

const HomesSoldGoalScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState(onboardingData.homes_sold_goal || null);
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const goalOptions = [6, 12, 18, 24, 36];

  const handleSelectGoal = (amount) => {
    setShowCustom(false);
    setSelectedGoal(amount);
    updateOnboardingData('homes_sold_goal', amount);
  };

  const handleCustomClick = () => {
    setShowCustom(true);
    setSelectedGoal(null);
  };

  const handleCustomChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setCustomAmount(value);
    if (value) {
      const numValue = parseInt(value);
      setSelectedGoal(numValue);
      updateOnboardingData('homes_sold_goal', numValue);
    }
  };

  const handleNext = () => {
    if (selectedGoal) {
      navigate('/onboarding/weekly-hours');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            How many homes do you want to sell this year?
          </h1>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {goalOptions.map((amount) => (
              <button
                key={amount}
                onClick={() => handleSelectGoal(amount)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedGoal === amount && !showCustom
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Home className="w-5 h-5 text-primary mb-2 mx-auto" />
                <div className="text-xl font-bold text-gray-900">{amount}</div>
              </button>
            ))}
            <button
              onClick={handleCustomClick}
              className={`p-4 rounded-lg border-2 transition-all col-span-3 ${
                showCustom
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-lg font-medium text-gray-900">Custom</span>
            </button>
          </div>

          {showCustom && (
            <Input
              type="number"
              placeholder="Enter number of homes"
              value={customAmount}
              onChange={handleCustomChange}
              className="w-full h-12 text-lg"
              autoFocus
            />
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Trade broad dreams for focused numbers; realistic sales targets create predictable success. It's important to set an achievable production goal as predictable goals reduce stress during slow weeks. A "high performing" agent typically sells 2 houses a month. Build up to that if you're just starting out. Don't forget, a focused sales goal adds structure; it lets you measure momentum without overwhelming yourself.
            </p>
          </div>

          <Button
            onClick={handleNext}
            disabled={!selectedGoal}
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomesSoldGoalScreen;