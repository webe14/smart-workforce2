import User from '../models/User.js';
import Leave from '../models/Leave.js';
import LeaveBalance from '../models/LeaveBalance.js';
import AuditLog from '../models/AuditLogs.js';
import Notification from '../models/Notifications.js';
import { logError } from '../utils/debugLogger.js';

// Helper: Calculate days between dates using UTC to avoid TZ issues
const calculateDays = (start, end, type) => {
  // Handle both Date objects (from DB) and strings (from request body)
  const [startY, startM, startD] = (start instanceof Date)
    ? [start.getUTCFullYear(), start.getUTCMonth() + 1, start.getUTCDate()]
    : String(start).split('-').map(Number);

  const [endY, endM, endD] = (end instanceof Date)
    ? [end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate()]
    : String(end).split('-').map(Number);

  const startDate = new Date(Date.UTC(startY, startM - 1, startD));
  const endDate = new Date(Date.UTC(endY, endM - 1, endD));

  let count = 0;
  const curDate = new Date(startDate);

  while (curDate <= endDate) {
    const dayOfWeek = curDate.getUTCDay(); // 0 is Sunday
    // For Annual leave, typically exclude Sundays (0) as standard rest day.
    if (type === 'Annual') {
      if (dayOfWeek !== 0) count++;
    } else {
      // Sick/Maternity usually counts calendar days (including weekends)
      count++;
    }
    curDate.setUTCDate(curDate.getUTCDate() + 1);
  }
  return count;
};

const createLeaveRequest = async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;
    const user_id = req.user.id;
    const document_path = req.file ? `/uploads/leaves/${req.file.filename}` : null;

    // Use the year of the start date for balancing
    const leaveYear = new Date(start_date).getUTCFullYear();

    // 1. Validation
    if (!start_date || !end_date || !leave_type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 2. Calculate Requested Days
    const requestedDays = calculateDays(start_date, end_date, leave_type);
    if (requestedDays <= 0) {
      return res.status(400).json({ message: 'Invalid date range' });
    }

    // 3. Check Balance
    const balance = await LeaveBalance.getOrCreate(user_id, leaveYear, leave_type);

    // Anti-Gravity Logic: Check if enough balance
    if (balance.remaining < requestedDays) {
      return res.status(400).json({
        message: `Insufficient leave balance in ${leaveYear}. You have ${balance.remaining} days remaining, but requested ${requestedDays} days.`
      });
    }

    // 4. Create Request & Deduct Balance (Reserve)
    await LeaveBalance.deduct(user_id, leave_type, leaveYear, requestedDays);

    const leaveId = await Leave.create({
      user_id,
      leave_type,
      start_date,
      end_date,
      reason,
      document_path
    });

    // 5. Audit & Notify
    await AuditLog.create({
      user_id,
      action: 'Create Leave Request',
      entity: 'leave_requests',
      entity_id: leaveId,
      ip_address: req.ip
    });
    console.log(`[createLeaveRequest] Audit log created.`);

    // 6. Notify HR/Admins
    try {
      const requester = await User.findById(user_id);
      const admins = await User.findByRoles(['hr', 'admin']);

      for (const admin of admins) {
        await Notification.create({
          user_id: admin.user_id,
          title: 'New Leave Request',
          message: `Employee ${requester.full_name} has submitted a new ${leave_type} leave request.`
        });
      }
      console.log(`[createLeaveRequest] HR/Admins notified.`);
    } catch (notifyError) {
      console.error("[createLeaveRequest] Notification Error (non-fatal):", notifyError);
    }
    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveId,
      deducted_days: requestedDays,
      remaining_balance: balance.remaining - requestedDays
    });

  } catch (error) {
    console.error('Create Leave Request Error:', error);
    logError(error, 'createLeaveRequest');
    res.status(500).json({
      message: error.message,
      error: error.message,
      stack: error.stack
    });
  }
};

const getLeaveRequests = async (req, res) => {
  try {
    const leaves = req.user.role === 'employee' ? await Leave.findByUserId(req.user.id) : await Leave.findAll();
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyBalances = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const balances = await LeaveBalance.getAllByUserId(req.user.id, currentYear);
    res.json(balances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    const leaveId = req.params.id;
    const adminId = req.user?.id; // Safety check

    console.log(`[updateLeaveStatus] Attempting update for ${leaveId} by Admin ${adminId} to ${status}`);

    if (!leaveId) return res.status(400).json({ message: 'Leave ID required' });
    if (!status) return res.status(400).json({ message: 'Status required' });

    const leave = await Leave.findById(leaveId);
    if (!leave) {
      console.log(`[updateLeaveStatus] Leave ${leaveId} not found`);
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const oldStatus = leave.status;
    const leaveType = leave.leave_type;
    const leaveYear = new Date(leave.start_date).getUTCFullYear();
    const days = calculateDays(leave.start_date, leave.end_date, leaveType);

    console.log(`[updateLeaveStatus] Transition: ${oldStatus} -> ${status}. Days: ${days}, Type: ${leaveType}, Year: ${leaveYear}`);

    // Perform the status update in DB first
    console.log(`[updateLeaveStatus] Step 1: Updating status in DB...`);
    await Leave.updateStatus(leaveId, status, rejection_reason);
    console.log(`[updateLeaveStatus] Step 1: Success.`);

    // Smart Balance Logic
    try {
      console.log(`[updateLeaveStatus] Step 2: Processing balance logic...`);
      if (status === 'Rejected' && oldStatus !== 'Rejected') {
        console.log(`[updateLeaveStatus] Step 2a: Restoring ${days} days...`);
        await LeaveBalance.restore(leave.user_id, leaveType, leaveYear, days);
        console.log(`[updateLeaveStatus] Step 2a: Success.`);
      }
      else if (status !== 'Rejected' && oldStatus === 'Rejected') {
        console.log(`[updateLeaveStatus] Step 2b: Re-deducting ${days} days...`);
        await LeaveBalance.deduct(leave.user_id, leaveType, leaveYear, days);
        console.log(`[updateLeaveStatus] Step 2b: Success.`);
      }
      else {
        console.log(`[updateLeaveStatus] Step 2c: No balance change needed (already in same category or not Rejected).`);
      }
    } catch (balanceError) {
      console.error("[updateLeaveStatus] Step 2: Failed (non-fatal):", balanceError);
    }

    // Audit logging
    try {
      console.log(`[updateLeaveStatus] Step 3: Creating audit log...`);
      await AuditLog.create({
        user_id: adminId || null,
        action: `Update Status to ${status}`,
        entity: 'leave_requests',
        entity_id: parseInt(leaveId),
        ip_address: req.ip || '127.0.0.1'
      });
      console.log(`[updateLeaveStatus] Step 3: Success.`);
    } catch (auditError) {
      console.error("[updateLeaveStatus] Step 3: Failed (non-fatal):", auditError);
    }

    // 3. Notify Employee
    try {
      console.log(`[updateLeaveStatus] Step 4: Notifying employee...`);
      await Notification.create({
        user_id: leave.user_id,
        title: `Leave Request ${status}`,
        message: `Your ${leaveType} leave request from ${new Date(leave.start_date).toLocaleDateString()} to ${new Date(leave.end_date).toLocaleDateString()} has been ${status.toLowerCase()}.${rejection_reason ? ` Reason: ${rejection_reason}` : ''}`
      });
      console.log(`[updateLeaveStatus] Step 4: Success.`);
    } catch (notifyError) {
      console.error("[updateLeaveStatus] Step 4: Failed (non-fatal):", notifyError);
    }

    res.json({ message: 'Leave request updated successfully' });

  } catch (error) {
    console.error('Critical Update Leave Status Error:', error);
    logError(error, 'updateLeaveStatus');
    res.status(500).json({
      message: `Internal Server Error: ${error.message}`,
      error: error.message,
      stack: error.stack
    });
  }
};

const deleteLeaveRequest = async (req, res) => {
  try {
    await Leave.delete(req.params.id);
    await AuditLog.create({ user_id: req.user.id, action: 'Delete Leave Request', entity: 'leave_requests', entity_id: req.params.id, ip_address: req.ip });
    res.json({ message: 'Leave request deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createLeaveRequest, getLeaveRequests, updateLeaveStatus, deleteLeaveRequest, getMyBalances };