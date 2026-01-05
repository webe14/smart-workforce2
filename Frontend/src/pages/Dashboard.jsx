import React from 'react';
import DashboardCard from '../components/DashboardCard';
import NotificationPanel from '../components/NotificationPanel';
import useFetch from '../hooks/useFetch';

const Dashboard = () => {
  const today = new Date().toISOString().split('T')[0];
  const { data: attendance } = useFetch(`/attendance?date=${today}`);
  const { data: shifts } = useFetch(`/shifts?date=${today}`);
  const { data: leaves } = useFetch('/leaves');
  const { data: notifications } = useFetch('/notifications');

  const quickActions = [
    { label: 'Clock In/Out', color: 'blue', icon: '⏱️' },
    { label: 'Request Leave', color: 'green', icon: '📅' },
    { label: 'View Schedule', color: 'purple', icon: '🗓️' },
    { label: 'My Profile', color: 'orange', icon: '👤' }
  ];

  // Check for new payroll notifications
  const payrollNotification = notifications?.find(
    n => !n.is_read && n.title === 'Payroll Generated'
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Payroll Alert Banner */}
        {payrollNotification && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-r-lg shadow-md flex items-center justify-between animate-pulse">
            <div className="flex items-center">
              <span className="text-2xl mr-3">💰</span>
              <div>
                <p className="font-bold">Good News! Payroll Generated</p>
                <p className="text-sm">{payrollNotification.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="flex items-center space-x-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
            <span className="text-sm font-medium text-gray-500 px-2">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Today's Attendance"
            value={attendance?.filter(a => ['present', 'completed', 'late', 'checked_in'].includes(a.status?.toLowerCase())).length || 0}
            icon="📊"
            color="blue"
          />
          <DashboardCard
            title="Today's Shifts"
            value={shifts?.length || 0}
            icon="🕒"
            color="green"
          />
          <DashboardCard
            title="Pending Leaves"
            value={leaves?.filter(l => l.status === 'Pending').length || 0}
            icon="📅"
            color="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Notifications */}
          <div className="lg:col-span-2">
            <NotificationPanel notifications={notifications} />
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mr-3 text-sm">
                  ⚡
                </span>
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{action.icon}</span>
                      <span className="font-semibold text-gray-700 group-hover:text-gray-900">{action.label}</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Quote of the Day or Mini Widget */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h4 className="font-bold text-lg mb-2">Have a great day!</h4>
                <p className="text-indigo-100 text-sm opacity-90">
                  "Success is not final, failure is not fatal: it is the courage to continue that counts."
                </p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 opacity-20 rounded-full blur-xl transform -translate-x-5 translate-y-5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;