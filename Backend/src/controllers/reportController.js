import Attendance from '../models/Attendance.js';
import Payroll from '../models/Payroll.js';
import AuditLog from '../models/AuditLogs.js';

const getAttendanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await Attendance.findByDateRange(startDate, endDate);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPayrollReport = async (req, res) => {
  try {
    const payrolls = await Payroll.findAll();
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPayroll = async (req, res) => {
  try {
    const payrollId = await Payroll.create(req.body);
    await AuditLog.create({ user_id: req.user.id, action: 'Create Payroll', entity: 'payroll', entity_id: payrollId, ip_address: req.ip });
    res.status(201).json({ message: 'Payroll created', payrollId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getAttendanceReport, getPayrollReport, createPayroll };