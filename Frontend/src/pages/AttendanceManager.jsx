import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BackButton from '../components/BackButton';

const AttendanceManager = () => {
    const [users, setUsers] = useState([]);
    const [attendanceToday, setAttendanceToday] = useState([]);
    const [loading, setLoading] = useState(true);
    // Initial date state with manual formatting
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    // Helper to verify YYYY-MM-DD format
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const changeDate = (days) => {
        const current = new Date(selectedDate);
        current.setDate(current.getDate() + days);
        const nextDate = formatDate(current);
        setSelectedDate(nextDate);
    };

    const loadAttendanceTable = async (showLoading = false) => {
        if (showLoading) setLoading(true);

        try {
            const [usersRes, attendanceRes] = await Promise.all([
                api.get('/users'),
                api.get(`/attendance?date=${selectedDate}`)
            ]);

            const normalized = attendanceRes.data.map(a => ({
                ...a,
                check_in: a.check_in || a.checkin_time || null,
                check_out: a.check_out || a.checkout_time || null
            }));

            setUsers(usersRes.data);
            setAttendanceToday(normalized);

        } catch (error) {
            console.error("Load attendance error:", error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        loadAttendanceTable(true);
    }, [selectedDate]);

    // Counters Calculation
    // Counters Calculation
    const presentCount = attendanceToday.filter(a => ['present', 'completed', 'late', 'checked_in'].includes(a.status?.toLowerCase())).length;
    const absentCount = attendanceToday.filter(a => a.status?.toLowerCase() === 'absent').length;
    const leaveCount = attendanceToday.filter(a => ['on_leave', 'leave', 'on leave'].includes(a.status?.toLowerCase())).length;

    const getAttendanceForUser = (userId) => {
        return attendanceToday.find(a => a.user_id == userId);
    };

    const handleCheckIn = async (userId) => {
        try {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            const fullDateTime = `${selectedDate} ${timeStr}`;

            const existingRecord = getAttendanceForUser(userId);
            let res;

            if (existingRecord && existingRecord.attendance_id) {
                await api.put(`/attendance/${existingRecord.attendance_id}`, {
                    check_in: fullDateTime,
                    status: 'Present'
                });
                res = { data: { attendanceId: existingRecord.attendance_id } };
            } else {
                res = await api.post('/attendance/manual', {
                    user_id: userId,
                    date: selectedDate,
                    check_in: fullDateTime,
                    status: 'Present'
                });
            }

            // Optimistic update
            setAttendanceToday(prev => {
                const existingIndex = prev.findIndex(a => a.user_id === userId);
                if (existingIndex >= 0) {
                    const updated = [...prev];
                    updated[existingIndex] = {
                        ...updated[existingIndex],
                        check_in: timeStr,
                        status: 'Present',
                        attendance_id: res.data.attendanceId
                    };
                    return updated;
                }
                return [...prev, {
                    user_id: userId,
                    attendance_date: selectedDate,
                    check_in: timeStr,
                    status: 'Present',
                    attendance_id: res.data.attendanceId
                }];
            });

            await loadAttendanceTable(false); // Background refresh

        } catch (error) {
            alert(`Check-in failed: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleCheckOut = async (userId) => {
        try {
            const attendance = getAttendanceForUser(userId);
            if (!attendance) return alert("No check-in record found.");

            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            const fullDateTime = `${selectedDate} ${timeStr}`;

            await api.put(`/attendance/${attendance.attendance_id}`, {
                check_out: fullDateTime
            });

            // Optimistic update
            setAttendanceToday(prev => prev.map(a =>
                a.user_id === userId
                    ? { ...a, check_out: fullDateTime }
                    : a
            ));

            await loadAttendanceTable(false); // Background refresh

        } catch (error) {
            alert(`Check-out failed: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleMarkAbsent = async (userId) => {
        try {
            const existingRecord = getAttendanceForUser(userId);
            let res;

            if (existingRecord && existingRecord.attendance_id) {
                await api.put(`/attendance/${existingRecord.attendance_id}`, {
                    status: 'Absent',
                    check_in: 'Absent',
                    check_out: 'Absent'
                });
                // Reuse existing ID for optimistic update
                res = { data: { attendanceId: existingRecord.attendance_id } };
            } else {
                res = await api.post('/attendance/manual', {
                    user_id: userId,
                    date: selectedDate,
                    status: 'Absent',
                    check_in: 'Absent',
                    check_out: 'Absent'
                });
            }

            // Optimistic update: Check if record exists and update or add
            setAttendanceToday(prev => {
                const exists = prev.find(a => a.user_id === userId);
                if (exists) {
                    return prev.map(a => a.user_id === userId
                        ? { ...a, status: 'Absent', check_in: 'Absent', check_out: 'Absent', attendance_id: res.data.attendanceId }
                        : a
                    );
                } else {
                    return [...prev, {
                        user_id: userId,
                        attendance_date: selectedDate,
                        status: 'Absent',
                        check_in: 'Absent',
                        check_out: 'Absent',
                        attendance_id: res.data.attendanceId
                    }];
                }
            });

        } catch (error) {
            alert('Failed to mark absent: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleMarkLeave = async (userId) => {
        try {
            const existingRecord = getAttendanceForUser(userId);
            let res;

            if (existingRecord && existingRecord.attendance_id) {
                await api.put(`/attendance/${existingRecord.attendance_id}`, {
                    status: 'On Leave',
                    check_in: 'On Leave',
                    check_out: 'On Leave'
                });
                res = { data: { attendanceId: existingRecord.attendance_id } };
            } else {
                res = await api.post('/attendance/manual', {
                    user_id: userId,
                    date: selectedDate,
                    status: 'On Leave',
                    check_in: 'On Leave',
                    check_out: 'On Leave'
                });
            }

            // Optimistic update: Check if record exists and update or add
            setAttendanceToday(prev => {
                const exists = prev.find(a => a.user_id === userId);
                if (exists) {
                    return prev.map(a => a.user_id === userId
                        ? { ...a, status: 'On Leave', check_in: 'On Leave', check_out: 'On Leave', attendance_id: res.data.attendanceId }
                        : a
                    );
                } else {
                    return [...prev, {
                        user_id: userId,
                        attendance_date: selectedDate,
                        status: 'On Leave',
                        check_in: 'On Leave',
                        check_out: 'On Leave',
                        attendance_id: res.data.attendanceId
                    }];
                }
            });

        } catch (error) {
            alert('Failed to mark leave: ' + (error.response?.data?.message || error.message));
        }
    };

    const formatTime = (time) => {
        if (!time) return '--:--';

        // 1. Handle simple time string "HH:mm:ss" or "HH:mm"
        // Regex to check if it starts with digit:digit
        if (typeof time === 'string' && /^\d{1,2}:\d{2}/.test(time) && !time.includes('T')) {
            return time.substring(0, 5);
        }

        // 2. Handle full ISO/Date string
        try {
            const date = new Date(time);
            if (!isNaN(date.getTime())) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            }
        } catch (e) {
            console.warn("Time parse error:", e);
        }

        // 3. Fallback
        if (typeof time === 'string') return time.substring(0, 5);
        return '--:--';
    };

    const getStatusBadge = (attendance) => {
        if (!attendance) return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Not Recorded</span>;

        const statusColors = {
            'present': 'bg-green-100 text-green-800',
            'completed': 'bg-blue-100 text-blue-800',
            'absent': 'bg-red-100 text-red-800',
            'on_leave': 'bg-yellow-100 text-yellow-800',
            'late': 'bg-orange-100 text-orange-800'
        };

        const key = attendance.status?.toLowerCase().replace(' ', '_');
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${statusColors[key] || 'bg-gray-100 text-gray-600'}`}>
                {attendance.status?.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <BackButton />
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Attendance Manager</h1>
                    <p className="text-gray-600">Check in and check out all staff</p>
                </div>

                {/* Date Selector */}
                <div className="bg-white rounded-xl shadow-lg p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                        <label className="font-medium text-gray-700">Date:</label>
                        <div className="flex items-center space-x-2 w-full justify-center sm:w-auto">
                            <button
                                onClick={() => changeDate(-1)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 border border-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <input
                                type="date"
                                readOnly
                                value={selectedDate}
                                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 cursor-not-allowed w-full sm:w-auto text-center"
                            />
                            <button
                                onClick={() => changeDate(1)}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 border border-gray-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center items-center gap-3 text-sm w-full md:w-auto">
                        <span className="flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-100"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>Present: {presentCount}</span>
                        <span className="flex items-center bg-red-50 px-3 py-1 rounded-full border border-red-100"><span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>Absent: {absentCount}</span>
                        <span className="flex items-center bg-yellow-50 px-3 py-1 rounded-full border border-yellow-100"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>Leave: {leaveCount}</span>
                    </div>
                </div>

                {/* Employees List */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600">
                        <h2 className="text-xl font-semibold text-white">All Staff ({users.length})</h2>
                    </div>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Check In</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Check Out</th>
                                    <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {users.map((user) => {
                                    const attendance = getAttendanceForUser(user.user_id);
                                    const hasCheckedIn = attendance && attendance.check_in;
                                    const hasCheckedOut = attendance && attendance.check_out;

                                    return (
                                        <tr key={user.user_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                                                        {user.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{user.full_name}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{user.department || '-'}</td>
                                            <td className="px-6 py-4 text-center">{getStatusBadge(attendance)}</td>
                                            <td className="px-6 py-4 text-center text-sm font-medium">
                                                {attendance && ['absent', 'on_leave', 'leave', 'on leave'].includes(attendance.status?.toLowerCase()) ? (
                                                    <span className={attendance.status?.toLowerCase() === 'absent' ? 'text-red-500' : 'text-yellow-600'}>
                                                        {attendance.status?.replace('_', ' ')}
                                                    </span>
                                                ) : (
                                                    hasCheckedIn ? (
                                                        <span className="text-green-600">{formatTime(attendance.check_in)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">--:--</span>
                                                    )
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium">
                                                {attendance && ['absent', 'on_leave', 'leave', 'on leave'].includes(attendance.status?.toLowerCase()) ? (
                                                    <span className={attendance.status?.toLowerCase() === 'absent' ? 'text-red-500' : 'text-yellow-600'}>
                                                        {attendance.status?.replace('_', ' ')}
                                                    </span>
                                                ) : (
                                                    hasCheckedOut ? (
                                                        <span className="text-red-600">{formatTime(attendance.check_out)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">--:--</span>
                                                    )
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {selectedDate === formatDate(new Date()) && (
                                                    <div className="flex justify-center space-x-2">
                                                        {!hasCheckedIn && (!attendance || ['absent', 'on_leave', 'leave'].includes(attendance.status?.toLowerCase())) ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleCheckIn(user.user_id)}
                                                                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium"
                                                                >
                                                                    Check In
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMarkAbsent(user.user_id)}
                                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-medium"
                                                                >
                                                                    Absent
                                                                </button>
                                                                <button
                                                                    onClick={() => handleMarkLeave(user.user_id)}
                                                                    className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-lg font-medium"
                                                                >
                                                                    Leave
                                                                </button>
                                                            </>
                                                        ) : hasCheckedIn && !hasCheckedOut ? (
                                                            <button
                                                                onClick={() => handleCheckOut(user.user_id)}
                                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium"
                                                            >
                                                                Check Out
                                                            </button>
                                                        ) : (
                                                            <div className="flex items-center justify-center text-green-600 gap-1">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                </svg>
                                                                <span className="text-xs font-medium">Checked Out</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                            No staff found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-4">
                        {users.map((user) => {
                            const attendance = getAttendanceForUser(user.user_id);
                            const hasCheckedIn = attendance && attendance.check_in;
                            const hasCheckedOut = attendance && attendance.check_out;

                            return (
                                <div key={user.user_id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                {user.full_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{user.full_name}</div>
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    <span>{user.department || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {getStatusBadge(attendance)}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                                            <div className="text-xs text-gray-500 mb-1">Check In</div>
                                            <div className={`font-medium ${hasCheckedIn ? 'text-green-600' : 'text-gray-400'}`}>
                                                {attendance && ['absent', 'on_leave', 'leave', 'on leave'].includes(attendance.status?.toLowerCase()) ? (
                                                    <span className={attendance.status?.toLowerCase() === 'absent' ? 'text-red-500' : 'text-yellow-600'}>
                                                        {attendance.status?.replace('_', ' ')}
                                                    </span>
                                                ) : (
                                                    hasCheckedIn ? formatTime(attendance.check_in) : '--:--'
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded-lg text-center">
                                            <div className="text-xs text-gray-500 mb-1">Check Out</div>
                                            <div className={`font-medium ${hasCheckedOut ? 'text-red-600' : 'text-gray-400'}`}>
                                                {attendance && ['absent', 'on_leave', 'leave', 'on leave'].includes(attendance.status?.toLowerCase()) ? (
                                                    <span className={attendance.status?.toLowerCase() === 'absent' ? 'text-red-500' : 'text-yellow-600'}>
                                                        {attendance.status?.replace('_', ' ')}
                                                    </span>
                                                ) : (
                                                    hasCheckedOut ? formatTime(attendance.check_out) : '--:--'
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {selectedDate === formatDate(new Date()) && (
                                        <div className="flex flex-col space-y-2">
                                            {!hasCheckedIn && (!attendance || ['absent', 'on_leave', 'leave'].includes(attendance.status?.toLowerCase())) ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        onClick={() => handleCheckIn(user.user_id)}
                                                        className="py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg font-medium"
                                                    >
                                                        Check In
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkAbsent(user.user_id)}
                                                        className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg font-medium"
                                                    >
                                                        Absent
                                                    </button>
                                                    <button
                                                        onClick={() => handleMarkLeave(user.user_id)}
                                                        className="py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-lg font-medium"
                                                    >
                                                        Leave
                                                    </button>
                                                </div>
                                            ) : hasCheckedIn && !hasCheckedOut ? (
                                                <button
                                                    onClick={() => handleCheckOut(user.user_id)}
                                                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg font-medium"
                                                >
                                                    Check Out
                                                </button>
                                            ) : (
                                                <div className="text-center py-2 bg-green-50 rounded-lg border border-green-100 flex items-center justify-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-green-600 text-xs font-medium">Checked Out</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {users.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No staff found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceManager;
