import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Sparkles } from 'lucide-react';

const WelcomeScreen = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/onboarding/agent-type');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-6 text-center pb-6">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to I Need Numbers. Your A.I. real estate coach is here to help you stay organized, focused, and on track with the tasks that matter most.
          </h1>
          <p className="text-lg text-gray-600">
            We'll begin by getting a sense of your goals for the year. Ready to get started?
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              If you are wondering how to be successful in real estate, you are not alone. Every agent has big goals, but not everyone knows how to reach them. A clear plan makes the work lighter; agents who define their path early stay more confident through busy seasons.
            </p>
          </div>
          <Button
            onClick={handleStart}
            className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
          >
            Start
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelcomeScreen;