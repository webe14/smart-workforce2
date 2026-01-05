import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BackButton from '../components/BackButton';

const Payroll = () => {
    const [users, setUsers] = useState([]);
    const [payrolls, setPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        gross_salary: '',
        allowances: '0',
        other_deductions: '0'
    });
    const [calculatedPayroll, setCalculatedPayroll] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, payrollsRes] = await Promise.all([
                api.get('/users'),
                api.get('/payroll')
            ]);

            setUsers(usersRes.data.filter(u => u.status === 'active'));
            setPayrolls(payrollsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getPayrollForUser = (userId) => {
        return payrolls.find(p => {
            if (p.user_id !== userId) return false;

            // Parse date and get LOCAL month/year (handle UTC timezone from MySQL)
            const dateStr = p.pay_period_start;
            let payMonth, payYear;

            // Create date from string and convert to local timezone
            const date = new Date(dateStr);
            // For dates stored as DATE in MySQL, add offset to get correct local date
            const localDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000) + (3 * 60 * 60000)); // Ethiopia UTC+3
            payYear = localDate.getFullYear();
            payMonth = localDate.getMonth();

            return payMonth === selectedMonth && payYear === selectedYear;
        });
    };

    const calculateEthiopianTax = (grossSalary) => {
        if (grossSalary <= 0) return 0;
        const brackets = [
            { min: 0, max: 600, rate: 0, deduction: 0 },
            { min: 601, max: 1650, rate: 0.10, deduction: 60 },
            { min: 1651, max: 3200, rate: 0.15, deduction: 142.50 },
            { min: 3201, max: 5250, rate: 0.20, deduction: 302.50 },
            { min: 5251, max: 7800, rate: 0.25, deduction: 565 },
            { min: 7801, max: 10900, rate: 0.30, deduction: 955 },
            { min: 10901, max: Infinity, rate: 0.35, deduction: 1500 }
        ];
        for (const bracket of brackets) {
            if (grossSalary >= bracket.min && grossSalary <= bracket.max) {
                return (grossSalary * bracket.rate) - bracket.deduction;
            }
        }
        return (grossSalary * 0.35) - 1500;
    };

    const handleCalculate = () => {
        const gross = parseFloat(formData.gross_salary) || 0;
        const allowances = parseFloat(formData.allowances) || 0;
        const otherDeductions = parseFloat(formData.other_deductions) || 0;

        const incomeTax = calculateEthiopianTax(gross);
        const employeePension = gross * 0.07;
        const totalDeductions = incomeTax + employeePension + otherDeductions;
        const netSalary = gross + allowances - totalDeductions;

        setCalculatedPayroll({
            grossSalary: gross,
            allowances,
            incomeTax: incomeTax.toFixed(2),
            employeePension: employeePension.toFixed(2),
            totalDeductions: totalDeductions.toFixed(2),
            netSalary: netSalary.toFixed(2)
        });
    };

    const openPayModal = (user) => {
        setSelectedUser(user);
        // Auto-fill salary from user's record
        setFormData({
            gross_salary: user.salary || '',
            allowances: '0',
            other_deductions: '0'
        });
        // Auto-calculate if salary exists
        if (user.salary) {
            const gross = parseFloat(user.salary);
            const incomeTax = calculateEthiopianTax(gross);
            const employeePension = gross * 0.07;
            const totalDeductions = incomeTax + employeePension;
            const netSalary = gross - totalDeductions;
            setCalculatedPayroll({
                grossSalary: gross,
                allowances: 0,
                incomeTax: incomeTax.toFixed(2),
                employeePension: employeePension.toFixed(2),
                totalDeductions: totalDeductions.toFixed(2),
                netSalary: netSalary.toFixed(2)
            });
        } else {
            setCalculatedPayroll(null);
        }
        setShowModal(true);
    };

    const handlePaySalary = async () => {
        setSubmitting(true);
        try {
            // Format dates manually to avoid timezone issues
            const month = (selectedMonth + 1).toString().padStart(2, '0');
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const startDate = `${selectedYear}-${month}-01`;
            const endDate = `${selectedYear}-${month}-${lastDay.toString().padStart(2, '0')}`;

            const response = await api.post('/payroll/generate', {
                user_id: selectedUser.user_id,
                gross_salary: formData.gross_salary,
                allowances: formData.allowances,
                other_deductions: formData.other_deductions,
                pay_period_start: startDate,
                pay_period_end: endDate
            });

            // Add the new payroll to local state immediately
            const newPayroll = response.data.payroll;
            if (newPayroll) {
                setPayrolls(prev => [...prev, newPayroll]);
            }

            alert(`Salary paid to ${selectedUser.full_name} for ${months[selectedMonth]} ${selectedYear}`);
            setShowModal(false);
            setSelectedUser(null);
            setCalculatedPayroll(null);

            // Also refresh from server
            fetchData();
        } catch (error) {
            alert('Payment failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount) => `${parseFloat(amount || 0).toLocaleString('en-ET')} ETB`;

    const getRoleBadge = (role) => {
        const colors = {
            'admin': 'bg-purple-100 text-purple-800',
            'hr': 'bg-blue-100 text-blue-800',
            'attendance_manager': 'bg-indigo-100 text-indigo-800',
            'employee': 'bg-green-100 text-green-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    const paidUsers = users.filter(u => getPayrollForUser(u.user_id));
    const unpaidUsers = users.filter(u => !getPayrollForUser(u.user_id));
    const totalPaid = paidUsers.reduce((sum, u) => {
        const p = getPayrollForUser(u.user_id);
        return sum + parseFloat(p?.net_salary || 0);
    }, 0);

    if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <BackButton />
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Payroll Management</h1>
                    <p className="text-gray-600">🇪🇹 Ethiopian Government Tax System - Pay salaries by month</p>
                </div>

                {/* Tax Info */}
                <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-4 mb-6 text-white">
                    <div className="grid grid-cols-7 gap-2 text-center text-sm">
                        <div className="bg-white/10 rounded p-2"><div className="font-bold">0%</div><div className="text-xs">0-600</div></div>
                        <div className="bg-white/10 rounded p-2"><div className="font-bold">10%</div><div className="text-xs">601-1,650</div></div>
                        <div className="bg-white/10 rounded p-2"><div className="font-bold">15%</div><div className="text-xs">1,651-3,200</div></div>
                        <div className="bg-white/10 rounded p-2"><div className="font-bold">20%</div><div className="text-xs">3,201-5,250</div></div>
                        <div className="bg-white/10 rounded p-2"><div className="font-bold">25%</div><div className="text-xs">5,251-7,800</div></div>
                        <div className="bg-white/10 rounded p-2"><div className="font-bold">30%</div><div className="text-xs">7,801-10,900</div></div>
                        <div className="bg-white/10 rounded p-2"><div className="font-bold">35%</div><div className="text-xs">10,901+</div></div>
                    </div>
                    <p className="text-center text-sm mt-2 opacity-80">Pension: Employee 7% | Employer 11%</p>
                </div>

                {/* Month/Year Selector */}
                <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <label className="font-medium text-gray-700">Select Month:</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                {months.map((month, index) => (
                                    <option key={index} value={index}>{month}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                            >
                                {[2023, 2024, 2025, 2026].map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center space-x-6 text-sm">
                            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>Paid: {paidUsers.length}</span>
                            <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>Unpaid: {unpaidUsers.length}</span>
                            <span className="font-medium">Total Paid: {formatCurrency(totalPaid)}</span>
                        </div>
                    </div>
                </div>

                {/* Employees Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600">
                        <h2 className="text-xl font-semibold text-white">
                            All Employees - {months[selectedMonth]} {selectedYear}
                        </h2>
                        <p className="text-green-200 text-sm">{users.length} employees</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Base Salary</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Paid</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((user) => {
                                    const payroll = getPayrollForUser(user.user_id);
                                    const isPaid = !!payroll;

                                    return (
                                        <tr key={user.user_id} className={`hover:bg-gray-50 ${isPaid ? 'bg-green-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center">
                                                    <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                                                        {user.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 text-sm">{user.full_name}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadge(user.role)}`}>
                                                    {user.role.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{user.department || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-700">
                                                {user.salary ? formatCurrency(user.salary) : <span className="text-red-500">Not Set</span>}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isPaid ? (
                                                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">PAID</span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">UNPAID</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                                                {isPaid ? formatCurrency(payroll.net_salary) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {!isPaid ? (
                                                    <button
                                                        onClick={() => openPayModal(user)}
                                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium"
                                                    >
                                                        Pay Salary
                                                    </button>
                                                ) : (
                                                    <span className="text-green-600 text-xs">✓ Completed</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-8 text-center text-gray-500">No employees found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Pay Salary Modal */}
            {showModal && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Pay Salary</h3>
                        <p className="text-gray-600 mb-4">
                            <strong>{selectedUser.full_name}</strong> - {months[selectedMonth]} {selectedYear}
                        </p>

                        {selectedUser.salary && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                                <span className="text-blue-800">✓ Base salary loaded from employee record</span>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Gross Salary (ETB)</label>
                                <input
                                    type="number"
                                    value={formData.gross_salary}
                                    onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="Enter gross salary"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
                                    <input
                                        type="number"
                                        value={formData.allowances}
                                        onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Deductions</label>
                                    <input
                                        type="number"
                                        value={formData.other_deductions}
                                        onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleCalculate}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
                            >
                                Recalculate
                            </button>

                            {calculatedPayroll && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                    <div className="flex justify-between"><span>Gross Salary:</span><span className="font-medium">{formatCurrency(calculatedPayroll.grossSalary)}</span></div>
                                    <div className="flex justify-between"><span>Allowances:</span><span>{formatCurrency(calculatedPayroll.allowances)}</span></div>
                                    <div className="flex justify-between text-red-600"><span>Income Tax:</span><span>-{formatCurrency(calculatedPayroll.incomeTax)}</span></div>
                                    <div className="flex justify-between text-orange-600"><span>Pension (7%):</span><span>-{formatCurrency(calculatedPayroll.employeePension)}</span></div>
                                    <div className="flex justify-between font-bold text-green-700 border-t mt-2 pt-2">
                                        <span>Net Salary:</span><span>{formatCurrency(calculatedPayroll.netSalary)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 mt-4">
                                <button
                                    onClick={() => { setShowModal(false); setCalculatedPayroll(null); }}
                                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handlePaySalary}
                                    disabled={submitting || !calculatedPayroll}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
                                >
                                    {submitting ? 'Processing...' : 'Pay Salary'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payroll;
