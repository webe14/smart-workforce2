import React from 'react';
import useFetch from '../hooks/useFetch';
import BackButton from '../components/BackButton';

const Attendance = () => {
  const { data: attendance, loading } = useFetch('/attendance');

  const formatTime = (time) => {
    if (!time) return '--:--';
    return time.substring(0, 5);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'present': 'bg-green-100 text-green-800',
      'absent': 'bg-red-100 text-red-800',
      'on_leave': 'bg-yellow-100 text-yellow-800',
      'late': 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
        {status?.replace('_', ' ').toUpperCase() || 'N/A'}
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Attendance Records</h1>
          <p className="text-gray-600">View your attendance history - Check-in/out is managed by Attendance Manager</p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-blue-800">
              Your attendance is recorded by the <strong>Attendance Manager</strong>. Please report to them when you arrive and leave.
            </p>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
            <h2 className="text-xl font-semibold text-white">My Attendance History</h2>
            <p className="text-blue-200 text-sm">{attendance?.length || 0} records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Check In</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Check Out</th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase">Total Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {attendance?.map((record) => (
                  <tr key={record.attendance_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {formatDate(record.date || record.attendance_date)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.check_in ? (
                        <span className="text-green-600 font-medium">{formatTime(record.check_in)}</span>
                      ) : (
                        <span className="text-gray-400">--:--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.check_out ? (
                        <span className="text-red-600 font-medium">{formatTime(record.check_out)}</span>
                      ) : (
                        <span className="text-gray-400">--:--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {record.total_hours ? (
                        <span className="font-medium">{record.total_hours}h</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {(!attendance || attendance.length === 0) && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;