import React, { useState } from 'react';

const NotificationPanel = ({ notifications }) => {
  const [showAll, setShowAll] = useState(false);

  // Determine which notifications to display
  const displayedNotifications = (notifications && notifications.length > 0)
    ? (showAll ? notifications : notifications.slice(0, 2))
    : [];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-lg font-bold text-gray-800 flex items-center">
          <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3 text-sm">
            🔔
          </span>
          Notifications
        </h3>
      </div>

      <div className="p-4">
        {notifications && notifications.length > 0 ? (
          <ul className="space-y-3">
            {displayedNotifications.map((notif) => (
              <li
                key={notif.notification_id}
                className="group p-4 rounded-xl bg-gray-50 hover:bg-white border border-transparent hover:border-indigo-100 hover:shadow-md transition-all duration-200 cursor-default"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform duration-200"></div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors duration-200">
                      {notif.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-2 block">
                      {new Date(notif.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl text-gray-400">🔕</span>
            </div>
            <p className="text-gray-500 text-sm">No new notifications</p>
          </div>
        )}
      </div>

      {notifications && notifications.length > 2 && (
        <div className="p-4 border-t border-gray-50 bg-gray-50 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors duration-200 focus:outline-none"
          >
            {showAll ? 'Show Less' : 'View All Notifications'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;