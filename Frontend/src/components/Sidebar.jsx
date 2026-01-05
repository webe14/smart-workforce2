import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext, SidebarContext } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useContext(AuthContext);
  const { sidebarOpen, setSidebarOpen } = useContext(SidebarContext);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', roles: ['admin', 'hr', 'employee', 'attendance_manager'] },
    { path: '/attendance', label: 'Attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', roles: ['admin', 'hr', 'employee', 'attendance_manager'] },
    { path: '/attendance-manager', label: 'Manage Attendance', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', roles: ['attendance_manager'] },
    { path: '/scanner', label: 'Scanner', icon: 'M3 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1V5zM3 15a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1v-5zm13 2a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-2 3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm3-3a1 1 0 00-1 1v2a1 1 0 102 0v-2a1 1 0 00-1-1z', roles: ['attendance_manager'] },
    { path: '/shifts', label: 'Shifts', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['admin', 'hr', 'employee', 'attendance_manager'] },
    { path: '/leaves', label: 'Leave Requests', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', roles: ['admin', 'hr', 'employee', 'attendance_manager'] },
    { path: '/employees', label: 'Employees', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', roles: ['admin', 'hr'] },
    { path: '/payroll', label: 'Payroll', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', roles: ['admin', 'hr'] },
    { path: '/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', roles: ['admin', 'hr'] },
    { path: '/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', roles: ['admin', 'hr', 'employee', 'attendance_manager'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(user?.role));
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar Container */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0F172A] text-white shadow-2xl transform transition-all duration-300 ease-in-out border-r border-white/5
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        <div className="flex flex-col h-full">
          {/* User Profile Header Section */}
          <div className="p-6 border-b border-white/5 bg-gradient-to-br from-indigo-900/40 to-transparent">
            <div className="flex items-center space-x-4">
              <Link
                to="/profile"
                onClick={closeSidebar}
                className="relative group cursor-pointer flex-shrink-0"
              >
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-500 shadow-lg transition-transform duration-300 group-hover:scale-110">
                  {user?.profile_picture ? (
                    <img
                      src={user.profile_picture.startsWith('http') ? user.profile_picture : `http://localhost:7001${user.profile_picture}`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white">
                      {user?.full_name?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#0F172A] rounded-full"></div>
              </Link>

              <div className="flex flex-col min-w-0">
                <span className="text-base font-bold tracking-tight text-white truncate">
                  {user?.full_name}
                </span>
                <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button onClick={closeSidebar} className="lg:hidden absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>



          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1 custom-scrollbar overflow-x-hidden">
            <p className="px-4 text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-4 mt-2">Main Menu</p>
            <ul className="space-y-1.5">
              {visibleMenuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={closeSidebar}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden
                      ${isActive(item.path)
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {isActive(item.path) && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full"></span>
                    )}
                    <svg className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive(item.path) ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={item.icon} />
                    </svg>
                    <span className="font-semibold text-base">{item.label}</span>

                    {!isActive(item.path) && (
                      <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer Info */}
          <div className="p-6 border-t border-white/5 bg-black/20 mt-auto">
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              <span>Smart-WM v1.2</span>
              <span className="text-indigo-500/60 transition-colors cursor-help hover:text-indigo-400">Support</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;