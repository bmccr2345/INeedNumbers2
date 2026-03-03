import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { ArrowRight, ArrowLeft, PiggyBank, Info } from 'lucide-react';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const CommissionCapScreen = () => {
  const navigate = useNavigate();
  const { onboardingData, updateCommissionCap } = useOnboarding();
  const capData = onboardingData.commission_cap || {};
  
  const [hasCap, setHasCap] = useState(capData.has_cap || false);
  const [annualCap, setAnnualCap] = useState(capData.annual_cap_amount || '');
  const [capPercentage, setCapPercentage] = useState(capData.cap_percentage || '');
  const [resetMonth, setResetMonth] = useState(capData.reset_month || 1);

  const handleHasCapChange = (value) => {
    const hasCap = value === 'yes';
    setHasCap(hasCap);
    updateCommissionCap('has_cap', hasCap);
    
    if (!hasCap) {
      // Clear other fields if no cap
      setAnnualCap('');
      setCapPercentage('');
      updateCommissionCap('annual_cap_amount', null);
      updateCommissionCap('cap_percentage', null);
    }
  };

  const handleAnnualCapChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAnnualCap(value);
    updateCommissionCap('annual_cap_amount', value ? parseInt(value) : null);
  };

  const handleCapPercentageChange = (e) => {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    // Limit to reasonable percentage
    if (parseFloat(value) > 100) value = '100';
    setCapPercentage(value);
    updateCommissionCap('cap_percentage', value ? parseFloat(value) : null);
  };

  const handleResetMonthChange = (value) => {
    setResetMonth(parseInt(value));
    updateCommissionCap('reset_month', parseInt(value));
  };

  const handleContinue = () => {
    navigate('/onboarding/completion');
  };

  const handleBack = () => {
    navigate('/onboarding/weekly-focus');
  };

  const canContinue = !hasCap || (annualCap && capPercentage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md" data-testid="commission-cap-screen">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <PiggyBank className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Commission Cap
          </CardTitle>
          <CardDescription className="text-base text-gray-600">
            Does your brokerage have a commission cap? This helps us track your progress toward hitting cap.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Has Cap Question */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Do you pay a cap to your brokerage?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={hasCap ? "default" : "outline"}
                className={`flex-1 h-12 ${hasCap ? 'bg-primary' : ''}`}
                onClick={() => handleHasCapChange('yes')}
                data-testid="has-cap-yes"
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={!hasCap ? "default" : "outline"}
                className={`flex-1 h-12 ${!hasCap ? 'bg-primary' : ''}`}
                onClick={() => handleHasCapChange('no')}
                data-testid="has-cap-no"
              >
                No
              </Button>
            </div>
          </div>

          {hasCap && (
            <>
              {/* Annual Cap Amount */}
              <div className="space-y-2">
                <Label htmlFor="annual-cap" className="text-sm font-medium">
                  What is your annual cap amount?
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    id="annual-cap"
                    type="text"
                    placeholder="18,000"
                    value={annualCap ? parseInt(annualCap).toLocaleString() : ''}
                    onChange={handleAnnualCapChange}
                    className="pl-7 h-12"
                    data-testid="annual-cap-input"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  This is the total amount you pay before reaching 100% commission.
                </p>
              </div>

              {/* Cap Percentage */}
              <div className="space-y-2">
                <Label htmlFor="cap-percentage" className="text-sm font-medium">
                  What percentage goes toward your cap?
                </Label>
                <div className="relative">
                  <Input
                    id="cap-percentage"
                    type="text"
                    placeholder="6"
                    value={capPercentage}
                    onChange={handleCapPercentageChange}
                    className="pr-7 h-12"
                    data-testid="cap-percentage-input"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500">
                  The percentage of your GCI that goes toward your cap (e.g., 6%).
                </p>
              </div>

              {/* Reset Month */}
              <div className="space-y-2">
                <Label htmlFor="reset-month" className="text-sm font-medium">
                  When does your cap year reset?
                </Label>
                <Select value={resetMonth.toString()} onValueChange={handleResetMonthChange}>
                  <SelectTrigger className="h-12" data-testid="reset-month-select">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Most brokerages reset on your anniversary date or January 1st.
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-2">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  We'll track your cap progress automatically as you add deals. You can always update these settings later.
                </p>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              className="flex-1 h-12"
              data-testid="back-button"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              className="flex-1 h-12 bg-primary hover:bg-primary/90"
              data-testid="continue-button"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionCapScreen;
