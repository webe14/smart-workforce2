import React from 'react';
import useFetch from '../hooks/useFetch';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import BackButton from '../components/BackButton';

const Reports = () => {
  const { data: attendanceReport } = useFetch('/reports/attendance');
  const { data: payrollReport } = useFetch('/reports/payroll');

  const exportToExcel = (data, filename) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const exportToPDF = (data, columns, filename) => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [columns],
      body: data.map(row => columns.map(col => row[col.toLowerCase().replace(' ', '_')] || '')),
    });
    doc.save(`${filename}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Reports</h1>
          <p className="text-gray-600">View detailed reports and analytics</p>
        </div>
        <div className="space-y-8">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Attendance Report</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportToExcel(attendanceReport || [], 'attendance_report')}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Export Excel
                </button>
                <button
                  onClick={() => exportToPDF(attendanceReport || [], ['Date', 'Employee', 'Status'], 'attendance_report')}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceReport?.map((record) => (
                    <tr key={record.attendance_id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.attendance_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${record.status === 'present' ? 'bg-green-100 text-green-800' :
                            record.status === 'absent' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                          }`}>
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Payroll Report</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportToExcel(payrollReport || [], 'payroll_report')}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  Export Excel
                </button>
                <button
                  onClick={() => exportToPDF(payrollReport || [], ['Employee', 'Total Hours', 'Net Salary'], 'payroll_report')}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollReport?.map((record) => (
                    <tr key={record.payroll_id} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.full_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.total_hours}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">${record.net_salary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;