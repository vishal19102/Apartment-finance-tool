import React, { useState, useEffect, useCallback } from 'react';
import './App.css'; // This line is crucial! Make sure it's here.

// Main App component
const App = () => {
  // State for general inputs
  const [apartmentCost, setApartmentCost] = useState(5000000); // Default: 50 Lakhs
  const [downPaymentPercentage, setDownPaymentPercentage] = useState(20); // Default: 20%
  const [loanTenureYears, setLoanTenureYears] = useState(20); // Default: 20 years
  const [interestRatePercentage, setInterestRatePercentage] = useState(8.5); // Default: 8.5%
  const [initialEMIInput, setInitialEMIInput] = useState(''); // User-entered initial EMI
  const [emiAnnualIncreasePercentage, setEmiAnnualIncreasePercentage] = useState(5); // Default: 5%
  const [emiCap, setEmiCap] = useState(0); // Default: No cap (0 means no cap)
  const [purchaseYearOffset, setPurchaseYearOffset] = useState(0); // 0 = now, 1 = 1 year later, etc.
  const [inflationRatePercentage, setInflationRatePercentage] = useState(5); // Default: 5% annual inflation
  const [alternativeInvestmentROI, setAlternativeInvestmentROI] = useState(7); // Default: 7% annual ROI
  const [initialInvestmentAmount, setInitialInvestmentAmount] = useState(1000000); // Default: 10 Lakhs (e.g., a portion of down payment or other savings)

  // State for builder payment schedule
  const [builderSchedule, setBuilderSchedule] = useState([
    { milestone: 'Booking', paymentPercentage: 10, timelineMonth: 0 },
    { milestone: 'Agreement', paymentPercentage: 10, timelineMonth: 1 },
    { milestone: 'Plinth', paymentPercentage: 15, timelineMonth: 3 },
    { milestone: '2nd Floor Slab', paymentPercentage: 10, timelineMonth: 6 },
    { milestone: '4th Floor Slab', paymentPercentage: 10, timelineMonth: 9 },
    { milestone: '6th Floor Slab', paymentPercentage: 10, timelineMonth: 12 },
    { milestone: 'Top Floor Slab', paymentPercentage: 10, timelineMonth: 15 },
    { milestone: 'External Plaster', paymentPercentage: 5, timelineMonth: 18 },
    { milestone: 'Internal Plaster', paymentPercentage: 5, timelineMonth: 21 },
    { milestone: 'Flooring', paymentPercentage: 5, timelineMonth: 24 },
    { milestone: 'Possession', paymentPercentage: 10, timelineMonth: 27 },
  ]);

  // Calculated values for summary
  const [loanAmount, setLoanAmount] = useState(0);
  const [totalEMIPaid, setTotalEMIPaid] = useState(0);
  const [totalInterestPaid, setTotalInterestPaid] = useState(0);
  const [totalPrincipalRepaid, setTotalPrincipalRepaid] = useState(0);
  const [possessionYear, setPossessionYear] = useState('');
  const [emiSchedule, setEmiSchedule] = useState([]);
  const [calculatedInitialEMI, setCalculatedInitialEMI] = useState(0);
  const [actualApartmentCost, setActualApartmentCost] = useState(apartmentCost);
  const [potentialInvestmentGain, setPotentialInvestmentGain] = useState(0);
  // State for builder schedule total percentage
  const [builderScheduleTotalPercentage, setBuilderScheduleTotalPercentage] = useState(0);


  // Function to calculate EMI
  const calculateEMI = useCallback((principal, monthlyInterestRate, numberOfMonths) => {
    if (monthlyInterestRate === 0) {
      return principal / numberOfMonths;
    }
    const emi = principal * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfMonths) /
        (Math.pow(1 + monthlyInterestRate, numberOfMonths) - 1);
    return isNaN(emi) || !isFinite(emi) ? 0 : emi;
  }, []);

  // Effect to recalculate everything when inputs change
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const effectiveApartmentCost = apartmentCost * Math.pow(1 + inflationRatePercentage / 100, purchaseYearOffset);
    setActualApartmentCost(effectiveApartmentCost);

    const downPaymentAmount = apartmentCost * (downPaymentPercentage / 100); // Base down payment for "now" scenario
    const calculatedLoanAmount = effectiveApartmentCost - downPaymentAmount;
    setLoanAmount(calculatedLoanAmount);

    // Calculate Potential Investment Gain
    let gain = 0;
    if (purchaseYearOffset > 0 && initialInvestmentAmount > 0) {
      const futureValue = initialInvestmentAmount * Math.pow(1 + alternativeInvestmentROI / 100, purchaseYearOffset);
      gain = futureValue - initialInvestmentAmount;
    }
    setPotentialInvestmentGain(gain);

    // Calculate builder schedule total percentage
    const totalPercentage = builderSchedule.reduce((sum, item) => sum + (parseFloat(item.paymentPercentage) || 0), 0);
    setBuilderScheduleTotalPercentage(totalPercentage);

    const monthlyInterestRate = interestRatePercentage / 100 / 12;
    const numberOfMonths = loanTenureYears * 12;

    const initialEmiToUse = initialEMIInput ? parseFloat(initialEMIInput) : calculateEMI(calculatedLoanAmount, monthlyInterestRate, numberOfMonths);
    setCalculatedInitialEMI(initialEmiToUse);

    let currentLoanPrincipal = calculatedLoanAmount;
    let cumulativeInterest = 0;
    let cumulativePrincipal = 0;
    let cumulativeEMIPaid = 0;
    let cumulativeBuilderPayment = 0;
    let cumulativeLoanDisbursed = 0;
    let currentEmi = initialEmiToUse;
    let lastEmiIncreaseYear = -1; // To track when EMI was last increased
    const schedule = [];

    // Determine possession month for possession year calculation
    let maxTimelineMonth = 0;
    builderSchedule.forEach(item => {
      if (item.timelineMonth > maxTimelineMonth) {
        maxTimelineMonth = item.timelineMonth;
      }
    });

    // Ensure calculatedPossessionYear is an integer
    const calculatedPossessionYearValue = parseInt(currentYear + Number(purchaseYearOffset) + Math.floor(maxTimelineMonth / 12), 10);
    setPossessionYear(calculatedPossessionYearValue);

    for (let month = 0; month < numberOfMonths; month++) {
      const emiMonth = month % 12;
      const emiYear = currentYear + purchaseYearOffset + Math.floor(month / 12);
      const displayMonth = new Date(emiYear, emiMonth, 1).toLocaleString('default', {
        month: 'short',
        year: 'numeric'
      });

      // Apply annual EMI increase
      const currentYearOfLoan = Math.floor(month / 12);
      if (currentYearOfLoan > lastEmiIncreaseYear) {
        if (lastEmiIncreaseYear !== -1) { // Don't increase in the very first year
          currentEmi *= (1 + emiAnnualIncreasePercentage / 100);
        }
        lastEmiIncreaseYear = currentYearOfLoan;
      }

      // Apply EMI Cap
      if (emiCap > 0 && currentEmi > emiCap) {
        currentEmi = emiCap;
      }

      // Builder Demand and Loan Disbursement
      let builderDemandPercentage = 0;
      let builderDemandAmount = 0;
      let loanDisbursedThisMonth = 0;

      const milestoneThisMonth = builderSchedule.find(item => item.timelineMonth === month);
      if (milestoneThisMonth) {
        builderDemandPercentage = milestoneThisMonth.paymentPercentage;
        builderDemandAmount = effectiveApartmentCost * (builderDemandPercentage / 100);
        cumulativeBuilderPayment += builderDemandAmount;

        // Loan disbursement logic: loan is disbursed only after down payment is covered,
        // and up to the total loan amount, matching builder demand.
        const amountToDisburse = Math.max(0, cumulativeBuilderPayment - downPaymentAmount - cumulativeLoanDisbursed);
        loanDisbursedThisMonth = Math.min(amountToDisburse, calculatedLoanAmount - cumulativeLoanDisbursed);
        cumulativeLoanDisbursed += loanDisbursedThisMonth;
      }

      // Calculate interest and principal for the month
      const interestPaid = currentLoanPrincipal > 0 ? currentLoanPrincipal * monthlyInterestRate : 0;
      let principalRepaid = currentEmi - interestPaid;

      // Adjust principal repayment if EMI is more than remaining principal + interest
      if (currentLoanPrincipal > 0 && principalRepaid > currentLoanPrincipal) {
        principalRepaid = currentLoanPrincipal;
      } else if (currentLoanPrincipal <= 0) {
        principalRepaid = 0;
        currentEmi = 0; // No more EMI if loan is paid off
      }

      const remainingPrincipal = currentLoanPrincipal - principalRepaid;

      cumulativeInterest += interestPaid;
      cumulativePrincipal += principalRepaid;
      cumulativeEMIPaid += currentEmi;

      // Update current loan principal for next iteration
      currentLoanPrincipal = remainingPrincipal;

      schedule.push({
        monthYear: displayMonth,
        builderDemandPercentage: builderDemandPercentage,
        builderDemandAmount: builderDemandAmount,
        cumulativeBuilderPayment: cumulativeBuilderPayment,
        loanDisbursedTillNow: cumulativeLoanDisbursed,
        monthlyEMI: currentEmi,
        interestPaid: interestPaid,
        principalRepaid: principalRepaid,
        remainingPrincipal: remainingPrincipal,
        totalPaidTillNow: cumulativeEMIPaid + downPaymentAmount + cumulativeBuilderPayment - cumulativeLoanDisbursed
      });
    }

    setTotalEMIPaid(cumulativeEMIPaid);
    setTotalInterestPaid(cumulativeInterest);
    setTotalPrincipalRepaid(cumulativePrincipal);
    setEmiSchedule(schedule);

  }, [
    apartmentCost,
    downPaymentPercentage,
    loanTenureYears,
    interestRatePercentage,
    initialEMIInput,
    emiAnnualIncreasePercentage,
    emiCap,
    builderSchedule,
    purchaseYearOffset,
    inflationRatePercentage,
    alternativeInvestmentROI,
    initialInvestmentAmount,
    calculateEMI
  ]);

  // Handlers for input changes
  const handleBuilderScheduleChange = (index, field, value) => {
    setBuilderSchedule(prevSchedule => {
      const newSchedule = [...prevSchedule]; // Create a shallow copy of the array
      // Create a new object for the modified item to ensure React detects the change
      const updatedItem = {
        ...newSchedule[index], // Copy existing properties of the item
        [field]: field === 'milestone' ? value : parseFloat(value) || 0 // Update the specific field
      };
      newSchedule[index] = updatedItem; // Replace the old item with the new, updated item
      return newSchedule; // Return the new array to update the state
    });
  };

  const addBuilderMilestone = () => {
    setBuilderSchedule([...builderSchedule, { milestone: '', paymentPercentage: 0, timelineMonth: 0 }]);
  };

  const removeBuilderMilestone = (index) => {
    const newSchedule = builderSchedule.filter((_, i) => i !== index);
    setBuilderSchedule(newSchedule);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  };

  return (
      <div className="app-background">
        <div className="main-container">
          <h1 className="app-title">
            Apartment Purchase Financial Impact Tool
          </h1>

          {/* General Inputs Section */}
          <div className="section-card general-inputs">
            <h2 className="section-title indigo-title">General Inputs</h2>
            <div className="input-grid">
              <InputGroup label="Apartment Cost (₹)" type="number" value={apartmentCost} onChange={setApartmentCost} />
              <InputGroup label="Down Payment (%)" type="number" value={downPaymentPercentage} onChange={setDownPaymentPercentage} />
              <InputGroup label="Loan Tenure (Years)" type="number" value={loanTenureYears} onChange={setLoanTenureYears} />
              <InputGroup label="Rate of Interest (%)" type="number" value={interestRatePercentage} onChange={setInterestRatePercentage} step="0.1" />
              <InputGroup label="Initial EMI (₹) (Optional)" type="number" value={initialEMIInput} onChange={setInitialEMIInput} placeholder={formatCurrency(calculatedInitialEMI)} />
              <InputGroup label="EMI Annual Increase (%)" type="number" value={emiAnnualIncreasePercentage} onChange={setEmiAnnualIncreasePercentage} />
              <InputGroup label="EMI Cap (₹) (0 for no cap)" type="number" value={emiCap} onChange={setEmiCap} />
              <InputGroup label="Purchase Year Offset (Years from Now)" type="number" value={purchaseYearOffset} onChange={setPurchaseYearOffset} min="0" max="5" />
              <InputGroup label="Annual Inflation Rate (%)" type="number" value={inflationRatePercentage} onChange={setInflationRatePercentage} step="0.1" />
              <InputGroup label="Alternative Investment Annual ROI (%)" type="number" value={alternativeInvestmentROI} onChange={setAlternativeInvestmentROI} step="0.1" />
              <InputGroup label="Initial Investment Amount (₹) (for ROI)" type="number" value={initialInvestmentAmount} onChange={setInitialInvestmentAmount} />
            </div>
          </div>

          {/* Builder Payment Schedule Section */}
          <div className="section-card builder-schedule">
            <h2 className="section-title purple-title">Builder Payment Schedule</h2>
            <div className="table-wrapper">
              <table className="app-table">
                <thead className="table-header-group purple-header">
                <tr>
                  <th className="table-header table-header-rounded-tl">Milestone</th>
                  <th className="table-header">Payment (%)</th>
                  <th className="table-header">Timeline (Months)</th>
                  <th className="table-header table-header-rounded-tr">Actions</th>
                </tr>
                </thead>
                <tbody>
                {builderSchedule.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                      <td className="table-cell">
                        <input
                            type="text"
                            value={item.milestone}
                            onChange={(e) => handleBuilderScheduleChange(index, 'milestone', e.target.value)}
                            className="app-input app-input-table"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                            type="number"
                            value={item.paymentPercentage}
                            onChange={(e) => handleBuilderScheduleChange(index, 'paymentPercentage', e.target.value)}
                            className="app-input app-input-table"
                        />
                      </td>
                      <td className="table-cell">
                        <input
                            type="number"
                            value={item.timelineMonth}
                            onChange={(e) => handleBuilderScheduleChange(index, 'timelineMonth', e.target.value)}
                            className="app-input app-input-table"
                        />
                      </td>
                      <td className="table-cell">
                        <button
                            onClick={() => removeBuilderMilestone(index)}
                            className="btn btn-danger"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
            <button
                onClick={addBuilderMilestone}
                className="btn btn-primary"
            >
              Add Milestone
            </button>
            {/* --- BUILDER SCHEDULE VALIDATION MESSAGE --- */}
            {builderScheduleTotalPercentage !== 100 && (
                <p className="validation-message">
                  Warning: Builder payment percentages currently sum to {builderScheduleTotalPercentage.toFixed(1)}%. They should add up to 100% for accurate calculations.
                </p>
            )}
          </div>

          {/* Summary Sheet */}
          <div className="section-card summary-section">
            <h2 className="section-title green-title">Summary</h2>
            <div className="summary-grid">
              <SummaryItem label="Effective Apartment Cost" value={formatCurrency(actualApartmentCost)} />
              <SummaryItem label="Loan Amount" value={formatCurrency(loanAmount)} />
              <SummaryItem label="Total EMI Paid" value={formatCurrency(totalEMIPaid)} />
              <SummaryItem label="Total Interest Paid" value={formatCurrency(totalInterestPaid)} />
              <SummaryItem label="Total Principal Repaid" value={formatCurrency(totalPrincipalRepaid)} />
              <SummaryItem label="Estimated Possession Year" value={possessionYear} />
              {purchaseYearOffset > 0 && initialInvestmentAmount > 0 && (
                  <SummaryItem label={`Potential Investment Gain (over ${purchaseYearOffset} years)`} value={formatCurrency(potentialInvestmentGain)} />
              )}
            </div>
          </div>

          {/* EMI Schedule Sheet */}
          <div className="section-card emi-schedule-section">
            <h2 className="section-title yellow-title">EMI Schedule</h2>
            <div className="table-wrapper">
              <table className="app-table">
                <thead className="table-header-group yellow-header">
                <tr>
                  <th className="table-header table-header-rounded-tl">Month & Year</th>
                  <th className="table-header">Builder Demand (%)</th>
                  <th className="table-header">Builder Demand (₹)</th>
                  <th className="table-header">Cumulative Builder Payment (₹)</th>
                  <th className="table-header">Loan Disbursed Till Now (₹)</th>
                  <th className="table-header">Monthly EMI (₹)</th>
                  <th className="table-header">Interest Paid (₹)</th>
                  <th className="table-header">Principal Repaid (₹)</th>
                  <th className="table-header table-header-rounded-tr">Remaining Principal (₹)</th>
                </tr>
                </thead>
                <tbody>
                {emiSchedule.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                      <td className="table-cell-sm">{row.monthYear}</td>
                      <td className="table-cell-sm">{row.builderDemandPercentage.toFixed(1)}%</td>
                      <td className="table-cell-sm">{formatCurrency(row.builderDemandAmount)}</td>
                      <td className="table-cell-sm">{formatCurrency(row.cumulativeBuilderPayment)}</td>
                      <td className="table-cell-sm">{formatCurrency(row.loanDisbursedTillNow)}</td>
                      <td className="table-cell-sm">{formatCurrency(row.monthlyEMI)}</td>
                      <td className="table-cell-sm">{formatCurrency(row.interestPaid)}</td>
                      <td className="table-cell-sm">{formatCurrency(row.principalRepaid)}</td>
                      <td className="table-cell-sm">{formatCurrency(row.remainingPrincipal)}</td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
  );
};

// Reusable Input Group component
const InputGroup = ({ label, value, onChange, type = 'text', placeholder = '', min = '', max = '', step = '' }) => (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="app-input"
      />
    </div>
);

// Reusable Summary Item component
const SummaryItem = ({ label, value }) => (
    <div className="summary-item">
      <span className="summary-label">{label}:</span>
      <span className="summary-value">
            {label === "Estimated Possession Year" && typeof value === 'number' && !isNaN(value) ? Math.round(value) : value}
        </span>
    </div>
);

export default App;
