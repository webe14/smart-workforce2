/**
 * Ethiopian Tax Calculator Utility
 * Based on Ethiopian Government Tax Brackets (2023)
 */

// Ethiopian Income Tax Brackets (Monthly)
const TAX_BRACKETS = [
    { min: 0, max: 600, rate: 0, deduction: 0 },
    { min: 601, max: 1650, rate: 0.10, deduction: 60 },
    { min: 1651, max: 3200, rate: 0.15, deduction: 142.50 },
    { min: 3201, max: 5250, rate: 0.20, deduction: 302.50 },
    { min: 5251, max: 7800, rate: 0.25, deduction: 565 },
    { min: 7801, max: 10900, rate: 0.30, deduction: 955 },
    { min: 10901, max: Infinity, rate: 0.35, deduction: 1500 }
];

// Pension contribution rates
const PENSION_EMPLOYEE_RATE = 0.07;  // 7%
const PENSION_EMPLOYER_RATE = 0.11;  // 11%

/**
 * Calculate Ethiopian income tax
 * @param {number} grossSalary - Monthly gross salary in ETB
 * @returns {number} - Tax amount
 */
export const calculateIncomeTax = (grossSalary) => {
    if (grossSalary <= 0) return 0;

    for (const bracket of TAX_BRACKETS) {
        if (grossSalary >= bracket.min && grossSalary <= bracket.max) {
            return (grossSalary * bracket.rate) - bracket.deduction;
        }
    }

    // For salaries exceeding highest bracket
    const lastBracket = TAX_BRACKETS[TAX_BRACKETS.length - 1];
    return (grossSalary * lastBracket.rate) - lastBracket.deduction;
};

/**
 * Calculate pension contribution (employee share)
 * @param {number} grossSalary - Monthly gross salary in ETB
 * @returns {number} - Employee pension contribution
 */
export const calculateEmployeePension = (grossSalary) => {
    return grossSalary * PENSION_EMPLOYEE_RATE;
};

/**
 * Calculate pension contribution (employer share)
 * @param {number} grossSalary - Monthly gross salary in ETB
 * @returns {number} - Employer pension contribution
 */
export const calculateEmployerPension = (grossSalary) => {
    return grossSalary * PENSION_EMPLOYER_RATE;
};

/**
 * Calculate complete payroll for an employee
 * @param {number} grossSalary - Monthly gross salary in ETB
 * @param {number} allowances - Additional allowances (default 0)
 * @param {number} otherDeductions - Other deductions (default 0)
 * @returns {object} - Complete payroll breakdown
 */
export const calculatePayroll = (grossSalary, allowances = 0, otherDeductions = 0) => {
    const totalEarnings = grossSalary + allowances;
    const incomeTax = calculateIncomeTax(grossSalary);
    const employeePension = calculateEmployeePension(grossSalary);
    const employerPension = calculateEmployerPension(grossSalary);
    const totalDeductions = incomeTax + employeePension + otherDeductions;
    const netSalary = totalEarnings - totalDeductions;

    return {
        grossSalary: parseFloat(grossSalary.toFixed(2)),
        allowances: parseFloat(allowances.toFixed(2)),
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        incomeTax: parseFloat(incomeTax.toFixed(2)),
        employeePension: parseFloat(employeePension.toFixed(2)),
        employerPension: parseFloat(employerPension.toFixed(2)),
        otherDeductions: parseFloat(otherDeductions.toFixed(2)),
        totalDeductions: parseFloat(totalDeductions.toFixed(2)),
        netSalary: parseFloat(netSalary.toFixed(2))
    };
};

/**
 * Get tax bracket info for a salary
 * @param {number} grossSalary - Monthly gross salary in ETB
 * @returns {object} - Tax bracket information
 */
export const getTaxBracketInfo = (grossSalary) => {
    for (const bracket of TAX_BRACKETS) {
        if (grossSalary >= bracket.min && grossSalary <= bracket.max) {
            return {
                rate: bracket.rate * 100,
                bracket: `${bracket.min} - ${bracket.max === Infinity ? '∞' : bracket.max} ETB`
            };
        }
    }
    return { rate: 35, bracket: 'Over 10,900 ETB' };
};
