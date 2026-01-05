import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext, SidebarContext } from '../context/AuthContext';
import api from '../services/api';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { sidebarOpen, setSidebarOpen } = useContext(SidebarContext);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);

    // Close on click outside
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  const markAsRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n =>
        n.notification_id === id ? { ...n, is_read: 1 } : n
      ));
      await api.put(`/notifications/${id}/read`);
    } catch (error) {
      console.error("Failed to mark as read", error);
      fetchNotifications();
    }
  };

  return (
    <nav className="bg-[#0F172A] border-b border-white/5 shadow-md relative z-30">
      <div className="px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/5"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden p-1 shadow-md">
                <img src={require('../assets/logo.jpg')} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-white tracking-tight leading-tight">
                  Ferenje <span className="text-indigo-500">Medium</span> Clinic
                </h1>
                <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest hidden sm:block leading-none">Workforce Management</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notification Bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="p-2 rounded-full text-white hover:bg-white/10 transition-colors duration-200 focus:outline-none relative"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-purple-700 transform translate-x-1/4 -translate-y-1/4">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl overflow-hidden z-50 ring-1 ring-black ring-opacity-5 origin-top-right transform transition-all">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">Notifications</h3>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">{notifications.length} New</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {notifications.map(notification => (
                          <div
                            key={notification.notification_id}
                            onClick={() => markAsRead(notification.notification_id)}
                            className={`p-4 flex items-start space-x-3 cursor-pointer transition-colors duration-150 ${!notification.is_read ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <div className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${!notification.is_read ? 'bg-blue-500' : 'bg-transparent'}`}></div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-600'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center">
                        <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                          <span className="text-xl text-gray-400">🔕</span>
                        </div>
                        <p className="text-sm text-gray-500">No notifications yet</p>
                      </div>
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 text-center">
                      <button className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                        View all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-100 hover:text-white transition-all duration-300 flex items-center space-x-2 group shadow-lg shadow-red-500/5"
              title="Logout"
            >
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-bold text-sm">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100 opacity-100 slide-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={logout}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium hover:from-red-600 hover:to-red-700 rounded-lg transition-colors shadow-lg shadow-red-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;