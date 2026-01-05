import React, { useState, useEffect } from 'react';
import useFetch from '../hooks/useFetch';
import BackButton from '../components/BackButton';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Shifts = () => {
  const { user } = React.useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    user_id: '',
    shift_type: 'Morning',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00'
  });

  const isManager = ['admin', 'attendance_manager'].includes(user?.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shiftsRes, usersRes] = await Promise.all([
        api.get('/shifts'),
        isManager ? api.get('/users') : Promise.resolve({ data: [user] }) // Employees only see themselves logic can be refined
      ]);

      setShifts(shiftsRes.data);
      // If manager, show all users. If employee, show only themselves (or just shifts, but let's stick to the list view for consistency)
      setUsers(isManager ? usersRes.data : [user]);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, isManager]);

  const handleOpenModal = (userId = '') => {
    setFormData(prev => ({
      ...prev,
      user_id: userId || '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0]
    }));
    setIsModalOpen(true);
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    try {
      const isBulk = formData.user_id === 'all' || formData.start_date !== formData.end_date;

      const payload = {
        shift_type: formData.shift_type,
        start_time: formData.start_time,
        end_time: formData.end_time
      };

      if (isBulk) {
        await api.post('/shifts/bulk', {
          ...payload,
          user_ids: formData.user_id === 'all' ? ['all'] : [formData.user_id],
          start_date: formData.start_date,
          end_date: formData.end_date,
        });
      } else {
        await api.post('/shifts', {
          ...payload,
          user_id: formData.user_id,
          shift_date: formData.start_date,
        });
      }

      setIsModalOpen(false);
      fetchData(); // Refresh data
      alert(isBulk ? 'Bulk shifts assigned!' : 'Shift assigned!');
    } catch (error) {
      alert('Failed to assign shift: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('Delete this shift?')) {
      try {
        await api.delete(`/shifts/${shiftId}`);
        fetchData();
      } catch (error) {
        alert('Failed to delete shift');
      }
    }
  };

  // Helper: Get upcoming shifts for a specific user
  const getUserShifts = (userId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return shifts
      .filter(s => s.user_id === userId)
      .filter(s => new Date(s.shift_date) >= today) // Only future/today shifts
      .sort((a, b) => new Date(a.shift_date) - new Date(b.shift_date))
      .slice(0, 3); // Show next 3 shifts
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Shift Management</h1>
            <p className="text-gray-600">Overview of employees and upcoming shifts</p>
          </div>
          {isManager && (
            <button
              onClick={() => handleOpenModal('all')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-md transition-all font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Bulk Assign
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                  <th className="px-6 py-4 font-semibold w-1/4">Employee</th>
                  <th className="px-6 py-4 font-semibold w-1/6">Role</th>
                  <th className="px-6 py-4 font-semibold">Upcoming Shifts</th>
                  {isManager && <th className="px-6 py-4 font-semibold text-right w-1/6">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : users.length > 0 ? (
                  users.map((u) => {
                    const myShifts = getUserShifts(u.user_id);
                    return (
                      <tr key={u.user_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold mr-3 shadow-sm">
                              {u.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{u.full_name}</div>
                              <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {myShifts.length > 0 ? (
                              myShifts.map(s => (
                                <div key={s.shift_id} className="relative group inline-flex items-center bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 transition-all hover:bg-blue-100">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">{formatDate(s.shift_date)}</span>
                                    <span className="text-[10px] text-blue-600 font-medium">{s.shift_type} ({s.start_time}-{s.end_time})</span>
                                  </div>
                                  {isManager && (
                                    <button
                                      onClick={() => handleDeleteShift(s.shift_id)}
                                      className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Delete Shift"
                                    >
                                      &times;
                                    </button>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400 italic">No upcoming shifts</span>
                            )}
                          </div>
                        </td>
                        {isManager && (
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenModal(u.user_id)}
                              className="text-indigo-600 hover:text-indigo-900 font-medium text-sm hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              + Assign
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No employees found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
              <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">Assign Shift</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-white hover:text-indigo-200">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleCreateShift} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assign To</label>
                  <select
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Employee</option>
                    <option value="all" className="font-bold text-indigo-600">All Employees</option>
                    {users.map(u => (
                      <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">From</label>
                    <input type="date" required min={new Date().toISOString().split('T')[0]} value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
                    <input type="date" required min={formData.start_date || new Date().toISOString().split('T')[0]} value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                  <select value={formData.shift_type} onChange={(e) => setFormData({ ...formData, shift_type: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500">
                    <option value="Morning">Morning</option>
                    <option value="Evening">Evening</option>
                    <option value="Night">Night</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Start</label>
                    <input type="time" required value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">End</label>
                    <input type="time" required value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-md">
                    {formData.user_id === 'all' ? 'Assign to All' : 'Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shifts;