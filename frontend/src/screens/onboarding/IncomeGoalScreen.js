import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { DollarSign } from 'lucide-react';

const IncomeGoalScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selectedGoal, setSelectedGoal] = useState(onboardingData.income_goal || null);
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const goalOptions = [50000, 75000, 100000, 150000, 200000];

  const handleSelectGoal = (amount) => {
    setShowCustom(false);
    setSelectedGoal(amount);
    updateOnboardingData('income_goal', amount);
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
      updateOnboardingData('income_goal', numValue);
    }
  };

  const handleNext = () => {
    if (selectedGoal) {
      navigate('/onboarding/homes-sold-goal');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            What's your annual income goal?
          </h1>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
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
                <DollarSign className="w-5 h-5 text-primary mb-2 mx-auto" />
                <div className="text-lg font-bold text-gray-900">{formatCurrency(amount)}</div>
              </button>
            ))}
            <button
              onClick={handleCustomClick}
              className={`p-4 rounded-lg border-2 transition-all col-span-2 ${
                showCustom
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-lg font-medium text-gray-900">Custom Amount</span>
            </button>
          </div>

          {showCustom && (
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Enter amount"
                value={customAmount}
                onChange={handleCustomChange}
                className="w-full pl-10 h-12 text-lg"
                autoFocus
              />
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Instead of saying you want to make money, create a specific target you can measure and track. Clear income goals turn long days into intentional progress; the sharper the target, the easier it is to hit.
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

export default IncomeGoalScreen;