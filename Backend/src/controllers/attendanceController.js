import Attendance from '../models/Attendance.js';
import AuditLog from '../models/AuditLogs.js';
import User from '../models/User.js';
import Notification from '../models/Notifications.js';
import fs from 'fs';
import path from 'path';

const logDebug = (msg) => {
  fs.appendFileSync(path.join(process.cwd(), 'backend_debug.log'), `[${new Date().toISOString()}] ${msg}\n`);
};

const checkIn = async (req, res) => {
  try {
    const attendanceId = await Attendance.checkIn(req.user.id, new Date());
    await AuditLog.create({ user_id: req.user.id, action: 'Check In', entity: 'attendance', entity_id: attendanceId, ip_address: req.ip });

    await Notification.create({
      user_id: req.user.id,
      title: 'Check In Successful',
      message: `You have successfully checked in at ${new Date().toLocaleTimeString()}`
    });

    res.json({ message: 'Checked in successfully', attendanceId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkOut = async (req, res) => {
  try {
    // Find the latest open attendance record for the user
    const openAttendance = await Attendance.findLatestOpenByUserId(req.user.id);
    if (!openAttendance) {
      return res.status(404).json({ message: 'No open attendance record found. Please check in first.' });
    }

    const success = await Attendance.update(openAttendance.attendance_id, {
      check_out: new Date(),
      status: 'completed'
    });
    if (!success) return res.status(404).json({ message: 'Failed to check out' });

    await AuditLog.create({ user_id: req.user.id, action: 'Check Out', entity: 'attendance', entity_id: openAttendance.attendance_id, ip_address: req.ip });
    res.json({ message: 'Checked out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    logDebug(`[getAttendance] Request for date: ${date}, User: ${req.user.id} (${req.user.role})`);
    let attendance;

    if (req.user.role === 'employee') {
      attendance = await Attendance.findByUserId(req.user.id);
      // Optional: Filter employee records by date if requested
      if (date) {
        attendance = attendance.filter(a => a.date === date || (a.attendance_date && new Date(a.attendance_date).toISOString().split('T')[0] === date));
      }
    } else {
      if (date) {
        logDebug(`[getAttendance] Fetching all by date: ${date}`);
        attendance = await Attendance.findAllByDate(date);
      } else {
        logDebug(`[getAttendance] Fetching all history`);
        attendance = await Attendance.findAll();
      }
    }
    logDebug(`[getAttendance] Found ${attendance.length} records`);
    if (attendance.length > 0) {
      logDebug(`[getAttendance] Sample record: ${JSON.stringify(attendance[0])}`);
      logDebug(`[getAttendance] Unique Statuses: ${JSON.stringify([...new Set(attendance.map(a => a.status))])}`);
    }
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users for attendance manager dropdown
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add attendance manually (for attendance manager)
const addAttendance = async (req, res) => {
  try {
    const { user_id, check_in, check_out, date, status } = req.body;
    // Use 'date' from frontend, fallback to 'attendance_date'
    const attendance_date = date || req.body.attendance_date || new Date().toISOString().split('T')[0];

    // Check if attendance already exists for this user and date
    const existingAttendance = await Attendance.findByUserAndDate(user_id, attendance_date);
    if (existingAttendance) {
      // If exists, UPDATE it instead of erroring (Upsert logic)
      await Attendance.update(existingAttendance.attendance_id, {
        check_in: check_in || existingAttendance.check_in,
        check_out: check_out || existingAttendance.check_out,
        status: status || existingAttendance.status
      });

      await AuditLog.create({ user_id: req.user.id, action: 'Update Attendance (Manual)', entity: 'attendance', entity_id: existingAttendance.attendance_id, ip_address: req.ip });

      return res.status(200).json({ message: 'Attendance updated successfully', attendanceId: existingAttendance.attendance_id });
    }

    const attendanceId = await Attendance.create({
      user_id,
      check_in: check_in || null,
      check_out: check_out || null,
      attendance_date,

      status: status || 'present'
    });

    await AuditLog.create({ user_id: req.user.id, action: 'Add Attendance', entity: 'attendance', entity_id: attendanceId, ip_address: req.ip });

    // Notify Employee
    await Notification.create({
      user_id,
      title: 'Attendance Added',
      message: `Your attendance for ${attendance_date} has been added manually.`
    });

    // Check for absence warning
    if (status === 'absent') {
      await checkAndNotifyAbsence(user_id);
    }

    res.status(201).json({ message: 'Attendance added successfully', attendanceId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update attendance (for attendance manager)
const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, status } = req.body;

    // Get user_id before update for notification purposes
    const existingRecord = await Attendance.findById(id);
    if (!existingRecord) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    let total_hours = undefined;
    if (check_out && existingRecord.check_in) {
      // FIX: Only calculate hours if both are valid times, not strings like 'Absent'
      const isTime = (str) => typeof str === 'string' && /^([01]\d|2[0-3]):?([0-5]\d):?([0-5]\d)?/.test(str);

      if (isTime(existingRecord.check_in) && isTime(check_out)) {
        try {
          const checkInTime = new Date(`1970-01-01T${existingRecord.check_in}`);
          const checkOutTime = new Date(`1970-01-01T${check_out}`);
          if (!isNaN(checkInTime) && !isNaN(checkOutTime)) {
            total_hours = ((checkOutTime - checkInTime) / (1000 * 60 * 60)).toFixed(2);
          }
        } catch (e) {
          console.error("Error calculating total hours:", e);
        }
      }
    }

    let newStatus = status || existingRecord.status;
    // User requested: Status should stay as is (e.g. 'present') when checking out
    // if (check_out && !status) {
    //   newStatus = 'completed';
    // }

    const success = await Attendance.update(id, { check_in, check_out, status: newStatus, total_hours });
    if (!success) return res.status(404).json({ message: 'Attendance record not found' });

    await AuditLog.create({ user_id: req.user.id, action: 'Update Attendance', entity: 'attendance', entity_id: id, ip_address: req.ip });

    // Check for absence warning if status is updated to absent
    if (status === 'absent' && existingRecord) {
      await checkAndNotifyAbsence(existingRecord.user_id);
    }

    res.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete attendance (for attendance manager)
const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await Attendance.delete(id);
    if (!success) return res.status(404).json({ message: 'Attendance record not found' });
    await AuditLog.create({ user_id: req.user.id, action: 'Delete Attendance', entity: 'attendance', entity_id: id, ip_address: req.ip });
    res.json({ message: 'Attendance deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkAndNotifyAbsence = async (userId) => {
  try {
    console.log(`Checking absences for user ${userId}`);
    const absenceCount = await Attendance.countMonthlyAbsences(userId);
    console.log(`User ${userId} absence count: ${absenceCount}`);

    if (absenceCount >= 3) {
      console.log(`Triggering warning for user ${userId}`);
      const employee = await User.findById(userId);
      const supervisors = await User.findByRoles(['admin', 'hr', 'attendance_manager']);

      // Notify Employee
      await Notification.create({
        user_id: userId,
        title: 'Absence Warning',
        message: 'Warning: You have been marked absent 3 times this month.'
      });

      // Notify Supervisors
      for (const supervisor of supervisors) {
        // Avoid notifying the employee if they are also a supervisor (edge case)
        if (supervisor.user_id !== userId) {
          await Notification.create({
            title: 'Employee Absence Alert',
            message: `Warning: Employee ${employee.full_name} has been absent 3 times this month.`
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndNotifyAbsence:', error);
  }
};

const qrCheckIn = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Validate user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for open attendance
    const openAttendance = await Attendance.findLatestOpenByUserId(user_id);

    if (openAttendance) {
      console.log('--- DEBUG DATE CHECK ---');
      console.log('Open Record ID:', openAttendance.attendance_id);
      console.log('DB CheckIn Value:', openAttendance.check_in);

      // FIX: If status is 'Absent' or 'On Leave', or check_in is NULL, allow overwrite/update to Present
      const isAbsentOrLeave = ['absent', 'on_leave', 'leave', 'on leave'].includes(openAttendance.status?.toLowerCase());

      if (isAbsentOrLeave || !openAttendance.check_in) {
        console.log(`[qrCheckIn] Overwriting '${openAttendance.status}' status with new Check-In`);
        await Attendance.update(openAttendance.attendance_id, {
          check_in: new Date().toTimeString().split(' ')[0], // Update check_in time
          status: 'Present'
        });

        await AuditLog.create({
          user_id: req.user.id,
          action: 'QR Check In (Update)',
          entity: 'attendance',
          entity_id: openAttendance.attendance_id,
          ip_address: req.ip
        });

        await Notification.create({
          user_id,
          title: 'QR Check In Successful',
          message: `You have successfully checked in via QR at ${new Date().toLocaleTimeString()} (Status updated)`
        });

        return res.json({ message: `Welcome ${user.full_name}! Checked In successfully.` });
      }

      const checkInTime = new Date(openAttendance.check_in);
      const now = new Date();

      // Use simple string comparison for "Same Day" validity.
      // toDateString() returns e.g. "Fri Dec 12 2025" in local server time.
      const isSameDay = checkInTime.toDateString() === now.toDateString();

      console.log('Parsed CheckIn:', checkInTime.toString());
      console.log('Server Now:', now.toString());
      console.log('Is Same Day?:', isSameDay);

      // If check_in is NOT today, it's a previous day
      if (!isSameDay) {
        console.log(`Auto-closing previous day's attendance (ID: ${openAttendance.attendance_id}) for user ${user_id}`);
        await Attendance.checkOut(openAttendance.attendance_id, new Date(openAttendance.attendance_date + 'T23:59:59'));
        await AuditLog.create({
          user_id: req.user.id,
          action: 'Auto Check Out (Previous Day)',
          entity: 'attendance',
          entity_id: openAttendance.attendance_id,
          ip_address: req.ip
        });

        // Now check them in for today
        const attendanceId = await Attendance.checkIn(user_id, new Date());
        await AuditLog.create({ user_id: req.user.id, action: 'QR Check In', entity: 'attendance', entity_id: attendanceId, ip_address: req.ip });

        await Notification.create({
          user_id,
          title: 'QR Check In Successful',
          message: `You have successfully checked in via QR at ${new Date().toLocaleTimeString()}`
        });

        return res.json({ message: `Welcome ${user.full_name}! Checked In successfully. (Previous day auto-closed)` });
      }

      // If from TODAY, user is already checked in.
      // User request: error message "you already checked in".
      return res.status(400).json({
        message: `${user.full_name}, you have already checked in today. Please use Check-Out.`
      });
    } else {
      // Logic: If not checked in, check them in
      const attendanceId = await Attendance.checkIn(user_id, new Date());
      await AuditLog.create({ user_id: req.user.id, action: 'QR Check In', entity: 'attendance', entity_id: attendanceId, ip_address: req.ip });

      await Notification.create({
        user_id,
        title: 'QR Check In Successful',
        message: `You have successfully checked in via QR at ${new Date().toLocaleTimeString()}`
      });

      return res.json({ message: `Welcome ${user.full_name}! Checked In successfully.` });
    }

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Face Recognition Check-In (explicit, with validation)
const faceCheckIn = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Validate user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // CRITICAL: Get today's date in YYYY-MM-DD format (no timezone issues)
    const today = new Date().toISOString().split('T')[0];
    console.log(`[faceCheckIn] Today's date: ${today}, User: ${user_id}`);

    // FIRST: Check if there's already a completed attendance for today
    const todayAttendance = await Attendance.findByUserAndDate(user_id, today);
    if (todayAttendance) {
      console.log(`[faceCheckIn] Found existing attendance for today:`, todayAttendance);

      // FIX: If status is 'Absent' or 'On Leave', or check_in is NULL, allow overwrite/update to Present
      const isAbsentOrLeave = ['absent', 'on_leave', 'leave', 'on leave'].includes(todayAttendance.status?.toLowerCase());

      if (isAbsentOrLeave || !todayAttendance.check_in) {
        console.log(`[faceCheckIn] Overwriting '${todayAttendance.status}' status with new Check-In`);
        await Attendance.update(todayAttendance.attendance_id, {
          check_in: new Date().toTimeString().split(' ')[0], // Update check_in time
          status: 'Present'
        });

        await AuditLog.create({
          user_id: req.user.id,
          action: 'Face Check In (Update)',
          entity: 'attendance',
          entity_id: todayAttendance.attendance_id,
          ip_address: req.ip
        });

        await Notification.create({
          user_id,
          title: 'Face Check In Successful',
          message: `You have successfully checked in via face recognition (Status updated)`
        });

        return res.json({ message: `Welcome ${user.full_name}! Checked In successfully.` });
      }

      // If check_out exists, attendance is completed for today
      if (todayAttendance.check_out) {
        console.log(`[faceCheckIn] ❌ User already completed attendance for today`);
        return res.status(400).json({
          message: `You have already completed your attendance for today.`
        });
      }

      // If check_out is NULL, user is still checked in
      console.log(`[faceCheckIn] ❌ User already checked in today (no checkout yet)`);
      return res.status(400).json({
        message: `You have already checked in today at ${todayAttendance.check_in}. Please check out first.`
      });
    }

    // SECOND: Check for any old open attendance from previous days
    const openAttendance = await Attendance.findLatestOpenByUserId(user_id);
    if (openAttendance) {
      // Format the attendance date properly
      let attendanceDate;
      if (openAttendance.attendance_date instanceof Date) {
        attendanceDate = openAttendance.attendance_date.toISOString().split('T')[0];
      } else if (typeof openAttendance.attendance_date === 'string') {
        attendanceDate = openAttendance.attendance_date.split('T')[0];
      } else {
        attendanceDate = openAttendance.date;
      }

      console.log(`[faceCheckIn] Found open attendance from ${attendanceDate}`);

      // Auto-close previous day's attendance
      if (attendanceDate !== today) {
        console.log(`[faceCheckIn] Auto-closing previous day's attendance (ID: ${openAttendance.attendance_id})`);
        await Attendance.checkOut(openAttendance.attendance_id, new Date(attendanceDate + 'T23:59:59'));
        await AuditLog.create({
          user_id: req.user.id,
          action: 'Auto Check Out (Previous Day)',
          entity: 'attendance',
          entity_id: openAttendance.attendance_id,
          ip_address: req.ip
        });
      }
    }

    // NOW we can safely create check-in for today
    console.log(`[faceCheckIn] ✅ Creating new check-in for user ${user_id}`);
    const attendanceId = await Attendance.checkIn(user_id, new Date());
    await AuditLog.create({
      user_id: req.user.id,
      action: 'Face Check In',
      entity: 'attendance',
      entity_id: attendanceId,
      ip_address: req.ip
    });

    await Notification.create({
      user_id,
      title: 'Face Check In Successful',
      message: `You have successfully checked in via face recognition at ${new Date().toLocaleTimeString()}`
    });

    return res.json({ message: `Welcome ${user.full_name}! Checked In successfully.` });

  } catch (error) {
    console.error('[faceCheckIn] Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Face Recognition Check-Out (explicit, with validation)
const faceCheckOut = async (req, res) => {
  try {
    const { user_id } = req.body;

    // Validate user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check for open attendance
    const openAttendance = await Attendance.findLatestOpenByUserId(user_id);
    if (!openAttendance) {
      // Check if they have ALREADY completed attendance for today
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = await Attendance.findByUserAndDate(user_id, today);

      if (todayAttendance && todayAttendance.check_out) {
        return res.status(400).json({
          message: `You have already checked out today. See you tomorrow!`
        });
      }

      return res.status(400).json({ message: `You haven't checked in yet today. Please check in first.` });
    }

    // Perform check-out
    await Attendance.checkOut(openAttendance.attendance_id, new Date());
    await AuditLog.create({ user_id: req.user.id, action: 'Face Check Out', entity: 'attendance', entity_id: openAttendance.attendance_id, ip_address: req.ip });

    await Notification.create({
      user_id,
      title: 'Face Check Out Successful',
      message: `You have successfully checked out via face recognition at ${new Date().toLocaleTimeString()}`
    });

    return res.json({ message: `Goodbye ${user.full_name}! Checked Out successfully.` });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check attendance status for a user (used by face recognition to pre-check)
const checkAttendanceStatus = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Validate user exists
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check for open attendance (checked in but not out)
    const openAttendance = await Attendance.findLatestOpenByUserId(user_id);

    if (openAttendance) {
      const attendanceDate = openAttendance.attendance_date
        ? new Date(openAttendance.attendance_date).toISOString().split('T')[0]
        : openAttendance.date;

      if (attendanceDate === today) {
        // Already checked in TODAY and not yet checked out
        return res.json({
          status: 'checked_in',
          message: `You have already checked in today at ${openAttendance.check_in}. Please check out first.`,
          user_name: user.full_name
        });
      } else {
        // Has old open attendance from previous day - needs auto-close
        return res.json({
          status: 'needs_auto_close',
          message: 'Previous day attendance will be auto-closed',
          user_name: user.full_name
        });
      }
    }

    // Check if already completed check-in and check-out for today
    const todayAttendance = await Attendance.findByUserAndDate(user_id, today);
    if (todayAttendance && todayAttendance.check_out) {
      return res.json({
        status: 'completed',
        should_disable_scanner: true,
        message: `You have already completed your attendance for today.`,
        user_name: user.full_name
      });
    }

    // No attendance for today - can check in
    return res.json({
      status: 'can_checkin',
      message: 'Ready to check in',
      user_name: user.full_name
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// QR Check-Out (Explicit)
const qrCheckOut = async (req, res) => {
  try {
    const { user_id } = req.body;
    const user = await User.findById(user_id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const openAttendance = await Attendance.findLatestOpenByUserId(user_id);
    if (!openAttendance) {
      // Validation: Check if already completed?
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = await Attendance.findByUserAndDate(user_id, today);
      if (todayAttendance && todayAttendance.check_out) {
        return res.status(400).json({ message: `${user.full_name}, you already completed attendance for today.` });
      }
      return res.status(400).json({ message: `${user.full_name}, you are not checked in.` });
    }

    // Check Out
    await Attendance.checkOut(openAttendance.attendance_id, new Date());
    await AuditLog.create({ user_id: req.user.id, action: 'QR Check Out', entity: 'attendance', entity_id: openAttendance.attendance_id, ip_address: req.ip });

    await Notification.create({
      user_id,
      title: 'QR Check Out Successful',
      message: `You have successfully checked out via QR at ${new Date().toLocaleTimeString()}`
    });

    return res.json({ message: `Goodbye ${user.full_name}! Checked Out successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { checkIn, checkOut, getAttendance, getAllUsers, addAttendance, updateAttendance, deleteAttendance, qrCheckIn, qrCheckOut, faceCheckIn, faceCheckOut, checkAttendanceStatus };


