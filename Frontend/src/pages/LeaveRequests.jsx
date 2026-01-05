import React, { useState, useContext, useEffect } from 'react';
import useFetch from '../hooks/useFetch';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import BackButton from '../components/BackButton';

const LeaveRequests = () => {
  const { data: leaves, loading, refetch } = useFetch('/leaves');
  const { user } = useContext(AuthContext);
  const [balances, setBalances] = useState([]);
  const [formData, setFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (user && user.role === 'employee') {
      fetchBalances();
    }
  }, [user]);

  const fetchBalances = async () => {
    try {
      const res = await api.get('/leaves/balances');
      setBalances(res.data);
    } catch (err) {
      console.error("Failed to fetch balances", err);
    }
  };

  const calculateDays = (start, end, type) => {
    if (!start || !end) return 0;
    const [startY, startM, startD] = start.split('-').map(Number);
    const [endY, endM, endD] = end.split('-').map(Number);

    const startDate = new Date(Date.UTC(startY, startM - 1, startD));
    const endDate = new Date(Date.UTC(endY, endM - 1, endD));

    let count = 0;
    const curDate = new Date(startDate);

    while (curDate <= endDate) {
      if (type === 'Annual') {
        if (curDate.getUTCDay() !== 0) count++; // Exclude Sundays (0)
      } else {
        count++;
      }
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }
    return count;
  };

  useEffect(() => {
    // Smart Validation: Real-time balance check
    if (formData.start_date && formData.end_date && formData.leave_type) {
      const days = calculateDays(formData.start_date, formData.end_date, formData.leave_type);
      const balance = balances.find(b => b.leave_type === formData.leave_type);

      if (balance && balance.remaining < days) {
        setWarning(`⚠️ Insufficient Balance! You have ${balance.remaining} days, but requesting ${days} days.`);
      } else {
        setWarning(`Requesting ${days} days.`);
      }
    } else {
      setWarning('');
    }
  }, [formData, balances]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Check warning
    if (warning.includes('Insufficient')) {
      if (!window.confirm('You have insufficient balance. Request likely to be rejected. Proceed?')) {
        setSubmitting(false);
        return;
      }
    }

    const data = new FormData();
    data.append('leave_type', formData.leave_type);
    data.append('start_date', formData.start_date);
    data.append('end_date', formData.end_date);
    data.append('reason', formData.reason);
    if (file) {
      data.append('document', file);
    }

    try {
      await api.post('/leaves', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Leave request submitted successfully');
      setFormData({ leave_type: '', start_date: '', end_date: '', reason: '' });
      setFile(null);
      refetch(); // Reload list
      fetchBalances(); // Reload balances
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (leaveId, status) => {
    let rejection_reason = '';
    if (status === 'Rejected') {
      rejection_reason = prompt('Please enter a reason for rejection:');
      if (rejection_reason === null) return; // Cancelled
    }

    try {
      await api.put(`/leaves/${leaveId}`, { status, rejection_reason });
      alert(`Leave request ${status.toLowerCase()}`);
      refetch();
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to update leave request';
      const detail = error.response?.data?.error ? `\nDetails: ${error.response.data.error}` : '';
      alert(`${msg}${detail}`);
      console.error('Update Error:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  const isManager = user?.role === 'hr' || user?.role === 'admin' || user?.role === 'attendance_manager';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leave Requests</h1>
          <p className="text-gray-600">
            {isManager ? 'Evaluate and manage employee leave requests.' : 'Smart Leave Dashboard & Requests'}
          </p>
        </div>

        {/* Smart Balance Dashboard */}
        {!isManager && balances.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {balances.filter(b => !['Sick', 'Maternity'].includes(b.leave_type)).map(b => (
              <div key={b.leave_type} className={`p-4 rounded-xl border shadow-sm ${b.remaining < 3 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
                <div className="text-gray-500 text-sm font-medium uppercase">{b.leave_type}</div>
                <div className="mt-2 flex items-baseline">
                  <span className="text-3xl font-bold text-gray-900">{b.remaining}</span>
                  <span className="ml-2 text-sm text-gray-500">/ {b.total_entitlement} days</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isManager && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">New Request</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <select
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select type</option>
                    <option value="Annual">Annual Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Personal">Personal Leave</option>
                    <option value="Maternity">Maternity Leave</option>
                    <option value="Paternity">Paternity Leave</option>
                    <option value="Special">Special Leave</option>
                  </select>
                </div>
                {/* Dynamic File Upload */}
                {formData.leave_type === 'Sick' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medical Certificate (Required for Sick Leave)</label>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      accept="image/*,application/pdf"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    min={formData.start_date || new Date().toISOString().split('T')[0]}
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Warning Banner */}
              {warning && (
                <div className={`p-3 rounded-lg text-sm font-medium ${warning.includes('Insufficient') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {warning}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </form>
          </div>
        )}

        {/* Requests List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mb-8">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isManager ? 'Manage Requests' : 'Request History'}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Dates</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Reason/Docs</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {isManager && <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves?.map((leave) => (
                  <tr key={leave.leave_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {leave.full_name || 'You'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {leave.leave_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                      <div className="truncate mb-1">{leave.reason}</div>
                      {leave.document_path && (
                        <a href={`http://localhost:7001${leave.document_path}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                          View Document
                        </a>
                      )}
                      {leave.rejection_reason && (
                        <div className="text-red-600 text-xs mt-1">Refusal: {leave.rejection_reason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                        leave.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                        {leave.status}
                      </span>
                    </td>
                    {isManager && leave.status === 'Pending' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleStatusChange(leave.leave_id, 'Approved')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusChange(leave.leave_id, 'Rejected')}
                          className="text-red-600 hover:text-red-900"
                        >
                          Reject
                        </button>
                      </td>
                    )}
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

export default LeaveRequests;