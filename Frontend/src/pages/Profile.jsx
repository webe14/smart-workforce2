import React, { useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import { QRCodeCanvas } from 'qrcode.react';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [updating, setUpdating] = useState(false);

  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    if (user?.profile_picture) {
      // Construct absolute URL if it is a relative path
      const imageUrl = user.profile_picture.startsWith('http')
        ? user.profile_picture
        : `http://localhost:7001${user.profile_picture}`;
      setPreview(imageUrl);
    }
  }, [user]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const data = new FormData();
      data.append('full_name', formData.full_name);
      data.append('email', formData.email);
      data.append('phone', formData.phone);
      data.append('department', formData.department);
      if (selectedFile) {
        data.append('profile_picture', selectedFile);
      }

      const response = await api.put('/users/profile', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const updatedData = {
        full_name: formData.full_name,
        email: formData.email,
        department: formData.department,
        phone: formData.phone
      };

      // If backend returns the new profile picture path, update it in context
      if (response.data.profile_picture) {
        updatedData.profile_picture = response.data.profile_picture;
      }

      updateUser(updatedData);
      alert('Profile updated successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };



  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    try {
      await api.put('/users/profile', { profile_picture: null });

      updateUser({ ...user, profile_picture: null });
      setPreview(null);
      setSelectedFile(null);
      alert('Profile photo removed.');
      setShowPhotoModal(false);
    } catch (error) {
      console.error(error);
      alert('Failed to remove photo');
    }
  };

  const downloadQR = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `attendance_qr_${user.full_name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <BackButton />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Update your personal information</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">

          {/* Profile Photo Section */}
          <div className="mb-8 flex flex-col items-center">
            <div
              className="relative w-32 h-32 mb-4 group cursor-pointer"
              onClick={() => setShowPhotoModal(true)}
            >
              {preview ? (
                <>
                  <img src={preview} alt="Profile" className="w-full h-full rounded-full object-cover border-4 border-white shadow-md" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white font-medium text-xs">View</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-4xl font-bold border-4 border-white shadow-md group-hover:bg-gray-300 transition-colors">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <label
                onClick={(e) => e.stopPropagation()}
                htmlFor="profile-upload"
                className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow-sm transition-colors z-10"
                title="Upload Photo"
              >
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </label>
            </div>
            <p className="text-sm text-gray-500">Tap photo to view options</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={updating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors duration-200 font-medium disabled:opacity-50"
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </button>
          </form>

          <div className="flex flex-col items-center my-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">My QR Code</h3>
            <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 mb-4">
              <QRCodeCanvas
                value={JSON.stringify({
                  type: 'attendance_qr',
                  id: user.user_id,
                  email: user.email,
                  timestamp: new Date().toISOString()
                })}
                size={200}
                level={"H"}
                includeMargin={true}
              />
            </div>

            <button
              onClick={downloadQR}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-medium transition-colors text-sm border border-indigo-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download QR Code
            </button>
          </div>
          <p className="text-sm text-gray-600 font-medium text-center">
            Show this code to the Attendance Manager<br />to check in or out.
          </p>
        </div>
      </div>



      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-80 backdrop-blur-sm fade-in" onClick={() => setShowPhotoModal(false)}>
          <div className="relative max-w-sm w-full bg-white rounded-xl shadow-2xl overflow-hidden slide-up" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full p-1 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="p-8 flex flex-col items-center">
              <div className="w-48 h-48 rounded-full overflow-hidden shadow-lg border-4 border-gray-100 mb-6 bg-gray-100 flex items-center justify-center">
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl font-bold text-gray-300">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-6">{user.full_name}</h3>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => {
                    const fileInput = document.getElementById('profile-upload');
                    if (fileInput) fileInput.click();
                    setShowPhotoModal(false);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors w-full"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Change Photo
                </button>

                {preview && (
                  <button
                    onClick={handleDeletePhoto}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium transition-colors w-full"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
