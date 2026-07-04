import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  User, Mail, Phone, MapPin, Briefcase, Calendar, 
  ShieldCheck, Camera, Save, Key, Lock, AlertCircle,
  CheckCircle2, UserCheck, Shield
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    phone: '',
    address: '',
    avatar_url: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [activeSubTab, setActiveSubTab] = useState<'info' | 'security'>('info');

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        username: profile.username || '',
        phone: profile.phone || '',
        address: profile.address || '',
        avatar_url: profile.avatar_url || ''
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          username: formData.username,
          phone: formData.phone,
          address: formData.address,
          avatar_url: formData.avatar_url
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill all password fields.' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      // Re-auth to check current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) throw new Error('Current password is incorrect.');

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Your password has been changed successfully.' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${profile.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      // Update profile immediately
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      await refreshProfile();
      setMessage({ type: 'success', text: 'Profile picture updated!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="p-4 lg:p-8 animate-fade-in max-w-5xl mx-auto">
      {/* Profile Header Card */}
      <div className="relative mb-8">
        <div className="h-32 w-full bg-gradient-to-r from-primary-600 to-secondary-600 rounded-3xl" />
        <div className="px-6 lg:px-10 -mt-12 flex flex-col md:flex-row items-end md:items-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 bg-white rounded-3xl p-1.5 shadow-xl ring-4 ring-white/50">
              {formData.avatar_url ? (
                <img 
                  src={formData.avatar_url} 
                  alt="Profile" 
                  className="w-full h-full object-cover rounded-[1.2rem]" 
                />
              ) : (
                <div className="w-full h-full bg-neutral-100 rounded-[1.2rem] flex items-center justify-center text-primary-500 font-bold text-4xl">
                  {profile.full_name?.charAt(0)}
                </div>
              )}
            </div>
            <label className="absolute bottom-2 right-2 p-2 bg-primary-500 text-white rounded-xl shadow-lg cursor-pointer hover:bg-primary-600 transition-colors">
              <Camera size={18} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={loading} />
            </label>
          </div>
          
          <div className="flex-1 pb-2">
            <h2 className="text-3xl font-heading font-bold text-neutral-800">{profile.full_name}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
                <Briefcase size={16} className="text-primary-500" />
                <span className="capitalize">{profile.role?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
                <Calendar size={16} className="text-secondary-500" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              <Badge variant={profile.is_active ? 'success' : 'error'}>
                {profile.is_active ? 'Active Account' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-2">
            <button 
              onClick={() => setActiveSubTab('info')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl text-sm font-bold transition-all ${activeSubTab === 'info' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <User size={18} /> Personal Information
            </button>
            <button 
              onClick={() => setActiveSubTab('security')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl text-sm font-bold transition-all ${activeSubTab === 'security' ? 'bg-error-50 text-error-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <ShieldCheck size={18} /> Account Security
            </button>
          </div>

          <div className="card p-6 bg-primary-50 border-primary-100">
            <h4 className="text-sm font-bold text-primary-900 mb-2 flex items-center gap-2">
              <UserCheck size={18} className="text-primary-500" /> Account Status
            </h4>
            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Member Since</span>
                <span className="font-bold text-neutral-700">{new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Access Level</span>
                <span className="font-bold text-neutral-700 capitalize">{profile.role?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">System Status</span>
                <span className="font-bold text-success-600 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-success-500 rounded-full animate-pulse" /> Verified
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2">
          {message.text && (
            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-success-50 border border-success-100 text-success-700' : 'bg-error-50 border border-error-100 text-error-700'}`}>
              {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <p className="text-sm font-bold">{message.text}</p>
            </div>
          )}

          {activeSubTab === 'info' && (
            <div className="card p-8 animate-in slide-in-from-right-2">
              <h3 className="text-xl font-heading font-bold text-neutral-800 mb-6">Edit Personal Information</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="label">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="text" 
                        className="input-field pl-10" 
                        value={formData.full_name}
                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">Username</label>
                    <div className="relative">
                      <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="text" 
                        className="input-field pl-10" 
                        value={formData.username}
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        placeholder="e.g. sm_john"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300" />
                      <input 
                        type="email" 
                        className="input-field pl-10 bg-neutral-50 text-neutral-400 cursor-not-allowed" 
                        value={user?.email || ''} 
                        disabled
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 italic mt-1">* Contact admin to change registered email</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">Mobile Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="tel" 
                        className="input-field pl-10" 
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="label">Address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-neutral-400" />
                    <textarea 
                      rows={3}
                      className="input-field pl-10 py-2.5 min-h-[100px]" 
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      placeholder="Enter your permanent address"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-primary py-3 px-10 flex items-center gap-2 shadow-lg shadow-primary-500/20"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeSubTab === 'security' && (
            <div className="card p-8 animate-in slide-in-from-right-2">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-error-50 text-error-600 rounded-2xl">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-neutral-800 text-lg">Change Login Password</h3>
                  <p className="text-xs text-neutral-500">Update your security credentials regularly</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="max-w-md space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="label">Current Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="password" 
                        className="input-field pl-10" 
                        value={passwordData.currentPassword}
                        onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        required
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">New Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="password" 
                        className="input-field pl-10" 
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                        required
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label">Confirm New Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="password" 
                        className="input-field pl-10" 
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        required
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock size={18} />}
                    Update Security Key
                  </button>
                </div>
              </form>

              <div className="mt-10 p-6 bg-neutral-50 rounded-2xl border border-neutral-100 flex gap-4 items-start">
                <div className="p-2 bg-white rounded-xl shadow-sm text-amber-500">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-800 mb-1">Security Recommendation</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Choose a strong password that you don't use elsewhere. 
                    Avoid using your name, birthdate, or simple number sequences.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
