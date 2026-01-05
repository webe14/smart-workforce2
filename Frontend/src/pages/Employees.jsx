import React, { useState, useRef, useEffect } from 'react';
import useFetch from '../hooks/useFetch';
import api from '../services/api';
import BackButton from '../components/BackButton';
import { QRCodeCanvas } from 'qrcode.react';
import FaceRegistration from '../components/FaceRegistration';

// Define initial form state outside component to avoid recreation and ensure consistency
const initialFormState = {
  employee_id: '',
  full_name: '',
  email: '',
  phone_number: '',
  sex: '',
  dob: '',
  city: '',
  woreda: '',
  kebele: '',
  role: 'employee',
  job_title: '',
  department: '',
  employment_type: 'Permanent',
  hire_date: '',
  work_location: '',
  status: 'active',
  salary: '',
  education_level: '',
  field_of_study: '',
  institution_name: '',
  graduation_year: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  remarks: '',
  password: ''
};

const Employees = () => {
  const { data: users, loading, refetch } = useFetch('/users');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [qrUser, setQrUser] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  // Modal states
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const fetchNextId = async (role) => {
    try {
      if (!role || role === 'admin') return;
      const response = await api.get(`/users/next-id?role=${role}`);
      if (response.data.nextId) {
        setFormData(prev => ({ ...prev, employee_id: response.data.nextId }));
      }
    } catch (error) {
      console.error('Failed to fetch next ID', error);
    }
  };

  useEffect(() => {
    if (showForm && !editingUser && formData.role) {
      fetchNextId(formData.role);
    }
  }, [formData.role, showForm, editingUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const submitData = new FormData();

      // Explicitly append all fields from formData if they have a value
      Object.keys(formData).forEach(key => {
        const value = formData[key];
        // Append if it's not null, undefined, or empty string (allows 0)
        if (value !== '' && value !== null && value !== undefined) {
          submitData.append(key, value);
        }
      });

      if (faceDescriptor) {
        submitData.append('face_descriptor', JSON.stringify(faceDescriptor));
      }

      if (editingUser) {
        await api.put(`/users/${editingUser.user_id}`, submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Employee updated successfully');
      } else {
        await api.post('/users', submitData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Employee registered successfully');
      }

      handleCloseForm();
      refetch();
    } catch (error) {
      console.error('❌ Submit error:', error);
      alert('Failed to save employee: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);

    // Helper to format date safely for input type="date" (YYYY-MM-DD)
    const formatDate = (dateVal) => {
      if (!dateVal) return '';
      try {
        const d = new Date(dateVal);
        return d.toISOString().split('T')[0];
      } catch (e) {
        return '';
      }
    };

    const sanitizedUser = {};
    Object.keys(user).forEach(key => {
      sanitizedUser[key] = user[key] === null ? '' : user[key];
    });

    setFormData({
      ...initialFormState,
      ...sanitizedUser,
      dob: formatDate(user.dob),
      hire_date: formatDate(user.hire_date || user.joining_date),
      password: '' // Don't populate password
    });

    if (user.face_descriptor) {
      try {
        setFaceDescriptor(typeof user.face_descriptor === 'string' ? JSON.parse(user.face_descriptor) : user.face_descriptor);
      } catch (e) {
        setFaceDescriptor(null);
      }
    } else {
      setFaceDescriptor(null);
    }
    setShowForm(true);
  };

  const handleDeactivate = async (userId) => {
    if (window.confirm('Are you sure you want to deactivate this employee?')) {
      try {
        await api.put(`/users/${userId}`, { status: 'inactive' });
        alert('Employee deactivated');
        refetch();
      } catch (error) {
        alert('Failed to deactivate employee');
      }
    }
  };

  const handleActivate = async (userId) => {
    try {
      await api.put(`/users/${userId}`, { status: 'active' });
      alert('Employee activated');
      refetch();
    } catch (error) {
      alert('Failed to activate employee');
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `${parseFloat(amount).toLocaleString('en-ET')} ETB`;
  };

  const downloadQR = () => {
    const canvas = document.querySelector('canvas');
    if (canvas && qrUser) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `attendance_qr_${qrUser.full_name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };


  const handleFaceRegister = (descriptor) => {
    setFaceDescriptor(descriptor);
    setShowFaceModal(false);
  };

  const handleCloseForm = () => {
    setFaceDescriptor(null);
    setShowForm(false);
    setEditingUser(null);
    setFormData(initialFormState);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Employees</h1>
            <p className="text-gray-600">Manage your workforce</p>
          </div>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData(initialFormState);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Add Employee
          </button>
        </div>

        {/* Ultra-Minimal QR Code Modal */}
        {qrUser && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-slate-950/90 backdrop-blur-2xl fade-in overflow-y-auto">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 w-full max-w-[400px] flex flex-col items-center slide-up relative border border-white/20">
              <button
                onClick={() => setQrUser(null)}
                className="absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="text-center mb-10">
                <div className="w-12 h-1 bg-indigo-600 mx-auto mb-6 rounded-full"></div>
                <h3 className="text-3xl font-black text-slate-900 mb-1 tracking-tighter">{qrUser.full_name}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em]">Digital Corporate Identity</p>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-indigo-600 blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="relative bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-50 mb-10 transform hover:scale-105 transition-transform duration-700">
                  <QRCodeCanvas
                    value={JSON.stringify({ id: qrUser.user_id, type: 'attendance_qr' })}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              <button
                onClick={downloadQR}
                className="w-full flex items-center justify-center gap-4 bg-slate-900 hover:bg-indigo-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all duration-300 group"
              >
                <svg className="w-5 h-5 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Sync to Device
              </button>

              <div className="mt-8 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Encrypted Data Packet</p>
                <div className="w-1 h-1 rounded-full bg-slate-200"></div>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/60 backdrop-blur-md fade-in overflow-y-auto">
            <div className="bg-white p-0 rounded-[2.5rem] shadow-2xl w-full max-w-4xl slide-up relative overflow-hidden my-8">
              {/* Header */}
              <div className="bg-slate-900 p-8 text-white relative">
                <button
                  onClick={handleCloseForm}
                  className="absolute top-8 right-8 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h2 className="text-3xl font-extrabold tracking-tighter">
                  {editingUser ? 'Edit System Configuration' : 'Local Workforce Registration'}
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em] mt-1">
                  Employee Management Module
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-10 max-h-[75vh] overflow-y-auto">
                {/* 1. Personal Information */}
                <section>
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Personal Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Employee ID <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. EMP-001"
                        value={formData.employee_id}
                        onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="First M. Last"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Gender <span className="text-red-500">*</span></label>
                      <select
                        value={formData.sex}
                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm appearance-none"
                        required
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Date of Birth <span className="text-red-500">*</span></label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Phone Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        placeholder="+251 ..."
                        value={formData.phone_number}
                        onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email Address (Optional)</label>
                      <input
                        type="email"
                        placeholder="example@mail.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">City</label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Woreda</label>
                        <input
                          type="text"
                          value={formData.woreda}
                          onChange={(e) => setFormData({ ...formData, woreda: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Kebele</label>
                        <input
                          type="text"
                          value={formData.kebele}
                          onChange={(e) => setFormData({ ...formData, kebele: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* 2. Education Information */}
                <section>
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Education Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Highest Education Level</label>
                      <select
                        value={formData.education_level}
                        onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm appearance-none"
                      >
                        <option value="">Select Level</option>
                        <option value="Certificate">Certificate</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Degree">Degree</option>
                        <option value="Master’s">Master’s</option>
                        <option value="PhD">PhD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Field of Study</label>
                      <input
                        type="text"
                        placeholder="e.g. Computer Science"
                        value={formData.field_of_study}
                        onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Institution Name</label>
                      <input
                        type="text"
                        placeholder="University / College"
                        value={formData.institution_name}
                        onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Year of Graduation</label>
                      <input
                        type="number"
                        placeholder="YYYY"
                        value={formData.graduation_year}
                        onChange={(e) => setFormData({ ...formData, graduation_year: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        min="1950"
                        max={new Date().getFullYear()}
                      />
                    </div>
                  </div>
                </section>

                {/* 3. Employment Information */}
                <section>
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">3. Employment Information</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Department <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. Sales"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Job Title / Position</label>
                      <input
                        type="text"
                        placeholder="e.g. Manager"
                        value={formData.job_title}
                        onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Monthly Salary (ETB)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={formData.salary}
                        onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Employment Type</label>
                      <select
                        value={formData.employment_type}
                        onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm appearance-none"
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Hire Date</label>
                      <input
                        type="date"
                        value={formData.hire_date}
                        onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Work Location / Branch</label>
                      <input
                        type="text"
                        placeholder="Head office / Branch A"
                        value={formData.work_location}
                        onChange={(e) => setFormData({ ...formData, work_location: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                      />
                    </div>
                  </div>
                </section>

                {/* 4. Security & Optional Information */}
                <section>
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                    <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">4. Security & Optional</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Security Sub-Grid */}
                    <div className="space-y-6">
                      {!editingUser && (
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Access Password <span className="text-red-500">*</span></label>
                          <input
                            type="password"
                            placeholder="Min. 6 characters"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                            required
                            minLength="6"
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">System Permission Role <span className="text-red-500">*</span></label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm appearance-none"
                          required
                        >
                          <option value="employee">Employee (Basic Access)</option>
                          <option value="hr">HR (Managerial)</option>
                          <option value="admin">Full Administrator</option>
                          <option value="attendance_manager">Attendance Scrutinizer</option>
                        </select>
                      </div>
                      <div className="pt-2">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Face ID Biometrics</label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowFaceModal(true)}
                            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${faceDescriptor
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                              : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'
                              }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {faceDescriptor ? 'Biometrics Registered' : 'Scan Visual ID'}
                          </button>
                          {faceDescriptor && (
                            <button
                              type="button"
                              onClick={() => setFaceDescriptor(null)}
                              className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Emergency sub-grid */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Emergency Contact Name</label>
                          <input
                            type="text"
                            placeholder="Relation / Full Name"
                            value={formData.emergency_contact_name}
                            onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Emergency Phone</label>
                          <input
                            type="tel"
                            placeholder="+251 ..."
                            value={formData.emergency_contact_phone}
                            onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Remarks / Notes</label>
                        <textarea
                          placeholder="Relevant medical or professional notes..."
                          value={formData.remarks}
                          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm h-28 resize-none"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Footer Actions */}
                <div className="pt-8 border-t border-slate-100 flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-10 py-5 bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-[2rem] shadow-xl shadow-slate-100 transition-all disabled:opacity-50 flex items-center gap-3"
                  >
                    {submitting ? (
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    )}
                    {editingUser ? 'Commit Synchronization' : 'Finalize Registration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Identity & Name</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Contact</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {users?.map((user) => (
                  <tr key={user.user_id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-left group"
                      >
                        <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                          {user.full_name}
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">ID: {user.employee_id || 'N/A'}</span>
                        </div>
                        <div className="text-xs text-gray-500">{user.job_title || user.role}</div>
                      </button>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-xs text-gray-600 font-medium">
                      <p>{user.email || 'No Email'}</p>
                      <p className="text-[10px] text-slate-400">{user.phone_number || 'No Phone'}</p>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full ${user.status === 'active'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-widest"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sophisticated Bento Employee Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/80 backdrop-blur-xl fade-in overflow-y-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-[3rem] shadow-[0_32px_120px_-15px_rgba(0,0,0,0.3)] w-full max-w-3xl slide-up border border-white/40 overflow-hidden my-8">

              {/* Ultra-Minimal Header */}
              <div className="p-8 pb-0 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-[40%] overflow-hidden border-2 border-white shadow-2xl bg-gray-50 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                      {selectedUser.profile_picture ? (
                        <img
                          src={selectedUser.profile_picture.startsWith('http') ? selectedUser.profile_picture : `http://localhost:7001${selectedUser.profile_picture}`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-3xl font-thin text-white uppercase italic">
                          {selectedUser.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white shadow-md ${selectedUser.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-extrabold text-slate-900 tracking-tighter mb-1">{selectedUser.full_name}</h3>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] leading-none opacity-60 italic">{selectedUser.role?.replace('_', ' ')} • {selectedUser.employee_id || `ID-${selectedUser.user_id?.toString().padStart(4, '0')}`}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-12 h-12 bg-slate-950/5 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:rotate-90"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Bento Content Grid */}
              <div className="p-8 space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  {/* Email Card (Wide) */}
                  <div className="col-span-12 md:col-span-8 bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] border border-slate-100/50 group hover:border-indigo-200 transition-colors">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Contact</p>
                    </div>
                    <div className="ml-14">
                      <p className="text-xl font-bold text-slate-800 break-all">{selectedUser.email || 'No email provided'}</p>
                      <p className="text-xs text-slate-400 font-bold mt-1 tracking-widest">{selectedUser.phone_number}</p>
                    </div>
                  </div>

                  {/* Status Bento Card */}
                  <div className={`col-span-12 md:col-span-4 p-6 rounded-[2rem] border flex flex-col justify-between ${selectedUser.status === 'active' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                    <div>
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${selectedUser.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedUser.status === 'active' ? 'text-emerald-700' : 'text-red-700'}`}>Current Status</p>
                      <p className={`text-xl font-extrabold capitalize ${selectedUser.status === 'active' ? 'text-emerald-900' : 'text-red-900'}`}>{selectedUser.status}</p>
                    </div>
                  </div>

                  {/* Personal & Residency Group */}
                  <div className="col-span-12 md:col-span-7 grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender & Birth</p>
                      <p className="text-sm font-bold text-slate-700">{selectedUser.sex || '-'} • {selectedUser.dob ? new Date(selectedUser.dob).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Residency</p>
                      <p className="text-sm font-bold text-slate-700 truncate">
                        {selectedUser.city || 'City'}, {selectedUser.woreda || 'Wored'}{selectedUser.kebele ? `, K.${selectedUser.kebele}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* QR Code Trigger Card (Interactive) */}
                  <div
                    onClick={() => setQrUser(selectedUser)}
                    className="col-span-12 md:col-span-5 bg-indigo-600 p-6 rounded-[2.5rem] flex items-center gap-5 cursor-pointer group hover:bg-slate-900 transition-all duration-500 shadow-xl shadow-indigo-100"
                  >
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-sm group-hover:rotate-12 transition-transform">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4h-4v-2h-4v2H6v-4H4v-4h2v-2h4v2h2v4h2v-4h2v4h2v-4h2v-2h-2v2h2v2h-2v-2z" /></svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Secure Access</p>
                      <p className="text-base font-bold text-white leading-tight">Identity Code</p>
                    </div>
                  </div>

                  {/* Financial & Job Context */}
                  <div className="col-span-12 bg-white/50 backdrop-blur-sm p-6 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compensation</p>
                        <p className="text-2xl font-black text-slate-900">{formatCurrency(selectedUser.salary)} <span className="text-xs text-slate-400 font-medium">/ month</span></p>
                      </div>
                      <div className="h-10 w-[1px] bg-slate-200"></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Position & Branch</p>
                        <p className="text-sm font-bold text-slate-700">{selectedUser.job_title || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedUser.department} • {selectedUser.employment_type || 'Permanent'}</p>
                        <p className="text-[8px] text-indigo-500 font-black uppercase tracking-tighter mt-0.5">{selectedUser.work_location || 'Main Office'}</p>
                      </div>
                      <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>
                      <div className="hidden md:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hire Date</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(selectedUser.hire_date || selectedUser.joining_date || selectedUser.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Education Bento Group */}
                  <div className="col-span-12 md:col-span-6 bg-purple-50/30 p-6 rounded-[2rem] border border-purple-100/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" /></svg>
                      </div>
                      <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest">Education Background</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-black text-slate-800">{selectedUser.education_level || 'General Education'} <span className="text-xs text-slate-400 font-bold">in {selectedUser.field_of_study || 'N/A'}</span></p>
                      <p className="text-xs text-slate-500 font-bold">{selectedUser.institution_name || 'N/A'} (Class of {selectedUser.graduation_year || 'N/A'})</p>
                    </div>
                  </div>

                  {/* Emergency Bento Group */}
                  <div className="col-span-12 md:col-span-6 bg-amber-50/30 p-6 rounded-[2rem] border border-amber-100/50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      </div>
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Emergency Priority</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-800">{selectedUser.emergency_contact_name || 'No contact specified'}</p>
                      <p className="text-xs text-indigo-600 font-bold tracking-widest">{selectedUser.emergency_contact_phone || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Remarks Section */}
                  {selectedUser.remarks && (
                    <div className="col-span-12 bg-slate-900/5 p-6 rounded-[2rem] border border-slate-200/50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Professional Remarks</p>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{selectedUser.remarks}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sophisticated Action Bar */}
              <div className="px-8 pb-8 pt-2 flex items-center gap-4">
                <button
                  onClick={() => {
                    handleEdit(selectedUser);
                    setSelectedUser(null);
                  }}
                  className="flex-1 bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 rounded-[2rem] transition-all duration-300 text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-2 group"
                >
                  Edit Configuration
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </button>
                <button
                  onClick={() => {
                    if (selectedUser.status === 'active') {
                      handleDeactivate(selectedUser.user_id);
                    } else {
                      handleActivate(selectedUser.user_id);
                    }
                    setSelectedUser(null);
                  }}
                  className={`px-8 py-5 rounded-[2rem] font-black text-xs transition-all uppercase tracking-[0.3em] border-2 ${selectedUser.status === 'active'
                    ? 'border-slate-100 text-slate-400 hover:border-red-500 hover:text-red-500 hover:bg-red-50'
                    : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                    }`}
                >
                  {selectedUser.status === 'active' ? 'Revoke Access' : 'Restore'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showFaceModal && (
        <FaceRegistration
          onClose={() => setShowFaceModal(false)}
          onRegister={handleFaceRegister}
        />
      )}
    </div>
  );
};

export default Employees;