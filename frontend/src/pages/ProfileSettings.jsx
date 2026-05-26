import React, { useState, useEffect } from 'react';
import { User, Camera, Moon, Sun, Monitor, Bell, Shield, Key, Save, Loader2 } from 'lucide-react';
import { useTheme } from '../App';
import axios from 'axios';

const API = window.location.origin.includes('5173') ? `http://${window.location.hostname}:5000/api` : '/api';

export default function ProfileSettings() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { theme, setTheme } = useTheme();
  const [profilePic, setProfilePic] = useState(user.profile_pic || null);
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      
      setUploading(true);
      try {
        const res = await axios.post(`${API}/employees/${user.id}/profile-pic`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        const newPicUrl = res.data.profile_pic;
        setProfilePic(newPicUrl);
        
        // Update user in localStorage
        const updatedUser = { ...user, profile_pic: newPicUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (err) {
        console.error('Failed to upload profile picture', err);
        alert('Failed to upload profile picture. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRemovePic = () => {
    // In a full implementation, you would also delete from the backend/Supabase Storage here.
    setProfilePic(null);
    const updatedUser = { ...user };
    delete updatedUser.profile_pic;
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Profile & Settings
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Manage your account preferences and display settings.</p>
          </div>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {/* Settings Sidebar */}
          <div className="border-r border-gray-100 dark:border-slate-700 p-6 space-y-1 bg-gray-50/50 dark:bg-slate-900/30">
            {[
              { id: 'profile', icon: User, label: 'Profile Information' },
              { id: 'appearance', icon: Monitor, label: 'Appearance' },
              { id: 'notifications', icon: Bell, label: 'Notifications' },
              { id: 'security', icon: Shield, label: 'Security' },
            ].map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSettingsTab === tab.id ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm border border-gray-200/60 dark:border-slate-600' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <tab.icon className={`h-4 w-4 mr-3 ${activeSettingsTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Settings Content */}
          <div className="col-span-2 p-8 space-y-8 min-h-[400px]">
            
            {activeSettingsTab === 'profile' && (
              <>
                {/* Profile Picture Section */}
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Profile Picture</h3>
                  <div className="flex items-center space-x-6">
                    <div className="relative group cursor-pointer" onClick={handleUploadClick}>
                      {profilePic ? (
                        <img src={profilePic} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-md" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-md overflow-hidden">
                          {user.name?.[0] || 'A'}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="flex space-x-3 mb-2">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/png, image/jpeg, image/gif"
                          onChange={handleFileChange}
                        />
                        <button disabled={uploading} onClick={handleUploadClick} className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50">
                          {uploading ? <><Loader2 className="animate-spin inline-block h-4 w-4 mr-1" /> Uploading...</> : 'Upload New'}
                        </button>
                        <button onClick={handleRemovePic} className="px-4 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors border border-transparent">
                          Remove
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-500">JPG, GIF or PNG. Max size of 2MB.</p>
                    </div>
                  </div>
                </section>

                <hr className="border-gray-100 dark:border-slate-700" />

                {/* General Information */}
                <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Account Information</h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Full Name</label>
                      <input type="text" defaultValue={user.name} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" readOnly />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Email Address</label>
                      <input type="email" defaultValue={user.email} className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none" readOnly />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Employee ID</label>
                      <input type="text" defaultValue={user.employee_id} className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-500 dark:text-slate-500" readOnly disabled />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Department</label>
                      <input type="text" defaultValue={user.department} className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-500 dark:text-slate-500" readOnly disabled />
                    </div>
                  </div>
                </section>
              </>
            )}

            {activeSettingsTab === 'appearance' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Platform Theme</h3>
                <div className="grid grid-cols-3 gap-4">
                  {/* Light */}
                  <button
                    onClick={() => setTheme('light')}
                    className={`border-2 rounded-xl p-4 flex flex-col items-center transition-all ${
                      theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Sun className={`h-6 w-6 mb-2 ${theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${theme === 'light' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'}`}>Light Mode</span>
                  </button>
                  {/* Dark */}
                  <button
                    onClick={() => setTheme('dark')}
                    className={`border-2 rounded-xl p-4 flex flex-col items-center transition-all ${
                      theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Moon className={`h-6 w-6 mb-2 ${theme === 'dark' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'}`}>Dark Mode</span>
                  </button>
                  {/* System Default */}
                  <button
                    onClick={() => setTheme('system')}
                    className={`border-2 rounded-xl p-4 flex flex-col items-center transition-all ${
                      theme === 'system' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Monitor className={`h-6 w-6 mb-2 ${theme === 'system' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${theme === 'system' ? 'text-blue-700 dark:text-blue-400' : 'text-gray-600 dark:text-slate-400'}`}>System Default</span>
                  </button>
                </div>
              </section>
            )}

            {activeSettingsTab === 'notifications' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Notification Preferences</h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">Email Notifications</p>
                    <p className="text-sm text-gray-500">Receive booking updates via email</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" defaultChecked />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900">SMS Alerts</p>
                    <p className="text-sm text-gray-500">Receive driver arrival alerts via SMS</p>
                  </div>
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" defaultChecked />
                </div>
              </section>
            )}

            {activeSettingsTab === 'security' && (
              <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Security Settings</h3>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <Key className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">Change Password</p>
                      <p className="text-sm text-gray-500">Update your account password</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">Update</button>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
