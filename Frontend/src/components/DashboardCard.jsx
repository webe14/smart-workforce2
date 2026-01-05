import React from 'react';

const DashboardCard = ({ title, value, icon, color = 'blue' }) => {
  const gradients = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-emerald-500 to-teal-600',
    purple: 'from-purple-500 to-fuchsia-600',
    red: 'from-rose-500 to-pink-600',
    orange: 'from-orange-500 to-amber-600'
  };

  const bgGradients = {
    blue: 'from-blue-50 to-indigo-50',
    green: 'from-emerald-50 to-teal-50',
    purple: 'from-purple-50 to-fuchsia-50',
    red: 'from-rose-50 to-pink-50',
    orange: 'from-orange-50 to-amber-50'
  };

  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group`}>
      {/* Background Decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradients[color]} opacity-5 rounded-full blur-2xl transform translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-500`}></div>

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-gray-900 group-hover:to-gray-700 transition-colors duration-300">
            {value}
          </h3>
        </div>

        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[color]} flex items-center justify-center text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>

      {/* Bottom Decoration Line */}
      <div className={`absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r ${gradients[color]} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
    </div>
  );
};

export default DashboardCard;