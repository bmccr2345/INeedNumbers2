import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Percent } from 'lucide-react';
import CoachingNugget from '../../components/CoachingNugget';

const CommissionSetupScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, updateCommission } = useOnboarding();
  
  const [split, setSplit] = useState(onboardingData.commission?.split || null);
  const [showCustomSplit, setShowCustomSplit] = useState(false);
  const [customSplit, setCustomSplit] = useState('');
  const [teamFees, setTeamFees] = useState(onboardingData.commission?.team_fees || false);
  const [transactionFees, setTransactionFees] = useState(onboardingData.commission?.transaction_fees || false);
  const [autoNetCalc, setAutoNetCalc] = useState(onboardingData.commission?.auto_net_calc || false);

  const splitOptions = ['70/30', '80/20', '90/10'];

  const handleSelectSplit = (splitValue) => {
    setShowCustomSplit(false);
    setSplit(splitValue);
    updateCommission('split', splitValue);
  };

  const handleCustomSplitClick = () => {
    setShowCustomSplit(true);
    setSplit(null);
  };

  const handleCustomSplitChange = (e) => {
    const value = e.target.value;
    setCustomSplit(value);
    if (value) {
      setSplit(value);
      updateCommission('split', value);
    }
  };

  const handleTeamFeesChange = (checked) => {
    setTeamFees(checked);
    updateCommission('team_fees', checked);
  };

  const handleTransactionFeesChange = (checked) => {
    setTransactionFees(checked);
    updateCommission('transaction_fees', checked);
  };

  const handleAutoNetCalcChange = (checked) => {
    setAutoNetCalc(checked);
    updateCommission('auto_net_calc', checked);
  };

  const handleNext = () => {
    if (split) {
      navigate('/onboarding/weekly-focus');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            How is your commission structured?
          </h1>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Split Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Commission Split</Label>
            <div className="grid grid-cols-3 gap-2">
              {splitOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleSelectSplit(option)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    split === option && !showCustomSplit
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg font-bold text-gray-900">{option}</div>
                </button>
              ))}
            </div>
            <button
              onClick={handleCustomSplitClick}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                showCustomSplit
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-base font-medium text-gray-900">Custom</span>
            </button>
            {showCustomSplit && (
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="e.g., 85/15"
                  value={customSplit}
                  onChange={handleCustomSplitChange}
                  className="w-full pl-10"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Toggle Options */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="team-fees" className="text-base">Team fees</Label>
              <Switch
                id="team-fees"
                checked={teamFees}
                onCheckedChange={handleTeamFeesChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="transaction-fees" className="text-base">Transaction fees</Label>
              <Switch
                id="transaction-fees"
                checked={transactionFees}
                onCheckedChange={handleTransactionFeesChange}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-net-calc" className="text-base">Automatically calculate my net per deal</Label>
              <Switch
                id="auto-net-calc"
                checked={autoNetCalc}
                onCheckedChange={handleAutoNetCalcChange}
              />
            </div>
          </div>

          <CoachingNugget>
            Knowing your numbers brings confidence; when your split and fees are clear, planning feels lighter.
          </CoachingNugget>

          <Button
            onClick={handleNext}
            disabled={!split}
            className="w-full h-12 text-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
          >
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionSetupScreen;