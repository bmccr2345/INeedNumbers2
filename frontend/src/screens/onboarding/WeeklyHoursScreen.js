import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Clock } from 'lucide-react';

const WeeklyHoursScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, updateOnboardingData } = useOnboarding();
  const [selectedHours, setSelectedHours] = useState(onboardingData.weekly_hours || null);

  const hoursOptions = [5, 10, 15, 20, 25, 30];

  const handleSelectHours = (hours) => {
    setSelectedHours(hours);
    updateOnboardingData('weekly_hours', hours);
  };

  const handleNext = () => {
    if (selectedHours) {
      navigate('/onboarding/commission-setup');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            How many hours per week do you want to work?
          </h1>
          <p className="text-gray-600">
            This helps keep your weekly plan realistic.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {hoursOptions.map((hours) => (
              <button
                key={hours}
                onClick={() => handleSelectHours(hours)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedHours === hours
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Clock className="w-5 h-5 text-primary mb-2 mx-auto" />
                <div className="text-xl font-bold text-gray-900">{hours}</div>
                <div className="text-xs text-gray-500">hours</div>
              </button>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              Strong results come from intentional time use; protect the hours that matter most. Many agents think if they "just work all the time" then they will be successful. But being intentional with your time and time blocking ensures that when you are working you're being productive, not just wasting time. Healthy boundaries drive healthy production; the hours you choose today shape your energy tomorrow.
            </p>
          </div>

          <Button
            onClick={handleNext}
            disabled={!selectedHours}
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyHoursScreen;