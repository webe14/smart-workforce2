import Payroll from '../models/Payroll.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import AuditLog from '../models/AuditLogs.js';
import Notification from '../models/Notifications.js';
import { calculatePayroll } from '../utils/ethiopianTax.js';

// Get all payroll records
const getAllPayroll = async (req, res) => {
    try {
        const payrolls = await Payroll.findAll();
        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get payroll by user ID
const getPayrollByUser = async (req, res) => {
    try {
        const payrolls = await Payroll.findByUserId(req.params.userId);
        res.json(payrolls);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get single payroll record
const getPayrollById = async (req, res) => {
    try {
        const payroll = await Payroll.findById(req.params.id);
        if (!payroll) {
            return res.status(404).json({ message: 'Payroll record not found' });
        }
        res.json(payroll);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Generate payroll for a single employee
const generatePayroll = async (req, res) => {
    try {
        const { user_id, gross_salary, allowances, other_deductions, pay_period_start, pay_period_end } = req.body;

        // Calculate Ethiopian tax and deductions
        const payrollCalc = calculatePayroll(
            parseFloat(gross_salary) || 0,
            parseFloat(allowances) || 0,
            parseFloat(other_deductions) || 0
        );

        const payrollData = {
            user_id,
            pay_period_start,
            pay_period_end,
            gross_salary: payrollCalc.grossSalary,
            allowances: payrollCalc.allowances,
            total_earnings: payrollCalc.totalEarnings,
            income_tax: payrollCalc.incomeTax,
            employee_pension: payrollCalc.employeePension,
            employer_pension: payrollCalc.employerPension,
            other_deductions: payrollCalc.otherDeductions,
            total_deductions: payrollCalc.totalDeductions,
            net_salary: payrollCalc.netSalary,
            total_hours: 0,
            overtime_hours: 0
        };

        const payrollId = await Payroll.create(payrollData);
        await AuditLog.create({
            user_id: req.user.id,
            action: 'Generate Payroll',
            entity: 'payroll',
            entity_id: payrollId,
            ip_address: req.ip
        });

        res.status(201).json({
            message: 'Payroll generated successfully',
            payrollId,
            payroll: { ...payrollData, payroll_id: payrollId }
        });

        // Create notification for the employee
        try {
            await Notification.create({
                user_id,
                title: 'Payroll Generated',
                message: `Your payroll for the period ${pay_period_start} to ${pay_period_end} has been processed.`
            });
        } catch (notificationError) {
            console.error('Failed to create payroll notification:', notificationError);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Generate payroll for all active employees
const generateBulkPayroll = async (req, res) => {
    try {
        const { pay_period_start, pay_period_end, salaries } = req.body;
        // salaries = [{ user_id, gross_salary, allowances, other_deductions }]

        const results = [];

        for (const salary of salaries) {
            const payrollCalc = calculatePayroll(
                parseFloat(salary.gross_salary) || 0,
                parseFloat(salary.allowances) || 0,
                parseFloat(salary.other_deductions) || 0
            );

            const payrollData = {
                user_id: salary.user_id,
                pay_period_start,
                pay_period_end,
                gross_salary: payrollCalc.grossSalary,
                allowances: payrollCalc.allowances,
                total_earnings: payrollCalc.totalEarnings,
                income_tax: payrollCalc.incomeTax,
                employee_pension: payrollCalc.employeePension,
                employer_pension: payrollCalc.employerPension,
                other_deductions: payrollCalc.otherDeductions,
                total_deductions: payrollCalc.totalDeductions,
                net_salary: payrollCalc.netSalary,
                total_hours: 0,
                overtime_hours: 0
            };

            const payrollId = await Payroll.create(payrollData);
            results.push({ user_id: salary.user_id, payroll_id: payrollId, ...payrollCalc });

            // Create notification for the employee
            try {
                await Notification.create({
                    user_id: salary.user_id,
                    title: 'Payroll Generated',
                    message: `Your payroll for the period ${pay_period_start} to ${pay_period_end} has been processed.`
                });
            } catch (notificationError) {
                console.error(`Failed to create payroll notification for user ${salary.user_id}:`, notificationError);
            }
        }

        await AuditLog.create({
            user_id: req.user.id,
            action: 'Generate Bulk Payroll',
            entity: 'payroll',
            entity_id: null,
            ip_address: req.ip
        });

        res.status(201).json({
            message: `Payroll generated for ${results.length} employees`,
            results
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Calculate payroll preview (without saving)
const calculatePayrollPreview = async (req, res) => {
    try {
        const { gross_salary, allowances, other_deductions } = req.body;

        const payrollCalc = calculatePayroll(
            parseFloat(gross_salary) || 0,
            parseFloat(allowances) || 0,
            parseFloat(other_deductions) || 0
        );

        res.json(payrollCalc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update payroll record
const updatePayroll = async (req, res) => {
    try {
        const success = await Payroll.update(req.params.id, req.body);
        if (!success) {
            return res.status(404).json({ message: 'Payroll record not found' });
        }

        await AuditLog.create({
            user_id: req.user.id,
            action: 'Update Payroll',
            entity: 'payroll',
            entity_id: req.params.id,
            ip_address: req.ip
        });

        res.json({ message: 'Payroll updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete payroll record
const deletePayroll = async (req, res) => {
    try {
        const success = await Payroll.delete(req.params.id);
        if (!success) {
            return res.status(404).json({ message: 'Payroll record not found' });
        }

        await AuditLog.create({
            user_id: req.user.id,
            action: 'Delete Payroll',
            entity: 'payroll',
            entity_id: req.params.id,
            ip_address: req.ip
        });

        res.json({ message: 'Payroll deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export {
    getAllPayroll,
    getPayrollByUser,
    getPayrollById,
    generatePayroll,
    generateBulkPayroll,
    calculatePayrollPreview,
    updatePayroll,
    deletePayroll
};
