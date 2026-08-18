import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Building2, MessageSquare, Shield, Save, Globe, Phone, Mail, MapPin, Key, CheckCircle2, UserPlus, Languages, UserCheck, Search, Upload, Image as ImageIcon, Edit2, Plus, Trash2, Zap, Link as LinkIcon, BellRing, CreditCard, Lock } from 'lucide-react';

import { supabase } from '../lib/supabase';
import { Badge } from '../components/ui/Badge';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

type SettingsTab = 'profile' | 'security' | 'sms' | 'roles' | 'localization' | 'automation';


interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

export function SettingsPage() {
  const { profile } = useAuth();
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState<SettingsTab>('security');
  
  useEffect(() => {
    if (profile && isAdmin && activeTab === 'security') {
      setActiveTab('profile');
    }
  }, [profile, isAdmin]);

  
  // Roles Management State
  const [roleDefinitions, setRoleDefinitions] = useState([
    { id: 'super_admin', name: 'Super Admin', description: 'Full system access, settings control, and user management.', permissions: ['All Modules', 'Database Admin', 'Settings'] },
    { id: 'admin', name: 'Admin', description: 'Full access to all modules except sensitive system settings.', permissions: ['All Modules', 'User Reports'] },
    { id: 'sales_agent', name: 'Sales Agent', description: 'Manage tickets and individual customers.', permissions: ['Air Tickets', 'CRM'] },
    { id: 'accounts_manager', name: 'Accounts Manager', description: 'Full access to financial records and vouchers.', permissions: ['Accounts', 'Payroll'] },
    { id: 'tour_manager', name: 'Tour Manager', description: 'Manage Hajj, Umrah, and Tour packages.', permissions: ['Umrah', 'Hajj', 'Tours'] },
    { id: 'hr_manager', name: 'HR Manager', description: 'Manage employee profiles and attendance.', permissions: ['HRM', 'Payroll'] },
  ]);
  const [isEditingRoles, setIsEditingRoles] = useState(false);
  const [tempRoles, setTempRoles] = useState(roleDefinitions);
  
  // User Management State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', role: 'sales_agent' });

  const [company, setCompany] = useState({
    name: 'Sonar Madina Travels',
    tagline: 'Your Trusted Hajj & Umrah Partner',
    address: 'Dhaka, Bangladesh',
    phone: '+880 1XXX XXXXXX',
    email: 'info@sonarmadina.com',
    logo_url: ''
  });
  
  const [sms, setSms] = useState({
    provider: 'SSL Wireless',
    api_key: '',
    sid: '',
    is_enabled: false
  });

  const [localization, setLocalization] = useState({
    language: 'English',
    timezone: 'UTC+6 (Dhaka)',
    currency: 'BDT (৳)',
    dateFormat: 'DD/MM/YYYY'
  });

  const [automation, setAutomation] = useState({
    n8n_webhook_url: '',
    api_key: 'smt_live_' + Math.random().toString(36).substring(2, 15),
    trigger_on_ticket: true,
    trigger_on_customer: true,
    trigger_on_payment: false,
    is_active: false
  });

  // Password Update State
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });




  useEffect(() => {
    loadSettings();
    if (activeTab === 'roles') {
      loadUsers();
    }
  }, [activeTab]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('settings').select('*');
      data?.forEach(s => {
        if (s.key === 'company') setCompany(s.value);
        if (s.key === 'sms_gateway') setSms(s.value);
        if (s.key === 'localization') setLocalization(s.value);
        if (s.key === 'automation') setAutomation(s.value);
        if (s.key === 'role_definitions') {
          setRoleDefinitions(s.value);
          setTempRoles(s.value);
        }
      });
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      alert('Staff role updated successfully!');
    } catch (err: any) {
      alert(`Error updating role: ${err.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      alert('Please fill all fields');
      return;
    }
    setSaving(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            role: newUser.role,
          }
        }
      });

      if (signUpError) throw signUpError;

      // Update the profile explicitly to ensure the role is set correctly
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: newUser.role, full_name: newUser.full_name })
          .eq('id', data.user.id);
        
        if (profileError) console.error('Profile update error:', profileError);
      }

      alert(`✅ Account created for ${newUser.full_name}! They can now log in.`);
      setShowAddUserModal(false);
      setNewUser({ full_name: '', email: '', password: '', role: 'sales_agent' });
      loadUsers();
    } catch (err: any) {
      alert(`Error creating user: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      alert('Please fill all fields');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('New password must be at least 6 characters long');
      return;
    }

    setSaving(true);
    try {
      // 1. Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: passwordData.currentPassword,
      });

      if (signInError) {
        throw new Error('Current password is incorrect');
      }

      // 2. Update to new password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      alert('✅ Your password has been changed successfully.');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };


  const handleSave = async (key: string, value: any) => {

    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key, 
          value, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'key' });
      
      if (error) throw error;
      await refreshSettings();
      return true;
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert(`❌ Error saving settings: ${err.message || 'Unknown error'}`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoles = async () => {
    const success = await handleSave('role_definitions', tempRoles);
    if (success) {
      setRoleDefinitions(tempRoles);
      setIsEditingRoles(false);
      alert('✅ Roles and permissions updated successfully!');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size too large. Please upload an image smaller than 2MB.');
      return;
    }

    setSaving(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      const updatedCompany = { ...company, logo_url: publicUrl };
      setCompany(updatedCompany);
      
      const success = await handleSave('company', updatedCompany);
      if (success) {
        alert('✅ Logo uploaded and saved successfully!');
      }
    } catch (err: any) {
      alert(`Error uploading logo: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-neutral-400">Loading system configuration...</div>;

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in max-w-6xl mx-auto">


      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-4">

          <div className="card p-2">
            {isAdmin && (
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
              >
                <Building2 size={18} /> Company Profile
              </button>
            )}
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-error-50 text-error-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <Key size={18} /> Account Security
            </button>
            {isAdmin && (
              <>
                <button 
                  onClick={() => setActiveTab('sms')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'sms' ? 'bg-secondary-50 text-secondary-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >
                  <MessageSquare size={18} /> SMS Gateway
                </button>
                <button 
                  onClick={() => setActiveTab('roles')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'roles' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >
                  <Shield size={18} /> Roles & Permissions
                </button>
                <button 
                  onClick={() => setActiveTab('localization')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'localization' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >
                  <Globe size={18} /> Localization
                </button>
                <button 
                  onClick={() => setActiveTab('automation')}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'automation' ? 'bg-zinc-900 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
                >
                  <Zap size={18} className={activeTab === 'automation' ? 'text-yellow-400' : ''} /> Automation (n8n)
                </button>
              </>
            )}
          </div>

          {isAdmin && (
            <div className="card p-5 bg-gradient-to-br from-neutral-800 to-neutral-900 text-white shadow-xl">
              <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Shield size={16} className="text-primary-400" /> Security Note
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Modifying roles or integration keys is a <strong>high-privilege</strong> action. Changes take effect globally.
              </p>
            </div>
          )}
        </div>

        {/* Content Area */}

        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <div className="card p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-heading font-bold text-neutral-800 flex items-center gap-2 text-lg">
                  <Building2 size={22} className="text-primary-500" /> Company Information
                </h3>
                <button 
                  onClick={async () => {
                    const success = await handleSave('company', company);
                    if (success) alert('✅ Settings saved successfully!');
                  }}
                  disabled={saving}
                  className="btn-primary py-2 px-6 text-xs flex items-center gap-2 shadow-lg shadow-primary-500/20"
                >
                  <Save size={14} /> Save Profile Changes
                </button>
              </div>

              {/* Logo Upload Section */}
              <div className="mb-10 p-6 bg-white rounded-2xl flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center overflow-hidden">
                    {company.logo_url ? (
                      <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon size={32} className="text-neutral-300" />
                    )}
                  </div>
                  {saving && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                      <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 text-center md:text-left">
                  <h4 className="text-sm font-bold text-neutral-800 mb-1">Company Logo</h4>
                  <p className="text-xs text-neutral-500 mb-4">Recommended: 400x400px. PNG or SVG. Max 2MB.</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-all shadow-sm">
                    <Upload size={14} className="text-primary-500" />
                    <span>{company.logo_url ? 'Change Logo' : 'Upload Logo'}</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleLogoUpload}
                      disabled={saving}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="label">Company Display Name</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      className="input-field pl-10" 
                      value={company.name} 
                      onChange={e => setCompany({...company, name: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="label">Tagline / Business Motto</label>
                  <input 
                    className="input-field" 
                    value={company.tagline} 
                    onChange={e => setCompany({...company, tagline: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Support Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      className="input-field pl-10" 
                      value={company.email} 
                      onChange={e => setCompany({...company, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Official Phone</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input 
                      className="input-field pl-10" 
                      value={company.phone} 
                      onChange={e => setCompany({...company, phone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="label">Headquarters Address</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-neutral-400" />
                    <textarea 
                      className="input-field pl-10" 
                      rows={4}
                      value={company.address} 
                      onChange={e => setCompany({...company, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-error-50 text-error-600 rounded-2xl">
                  <Key size={24} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-neutral-800 text-lg">Account Security</h3>
                  <p className="text-xs text-neutral-500">Update your login password to keep your account secure</p>
                </div>
              </div>

              <div className="max-w-md space-y-6">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-start">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Shield size={20} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-800 mb-1">Security Recommendation</p>
                    <p className="text-xs text-amber-600 leading-relaxed">
                      Use a strong password with at least 8 characters, including numbers and special characters. 
                      Never share your password with others.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Current Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="password"
                        className="input-field pl-10" 
                        placeholder="••••••••"
                        value={passwordData.currentPassword}
                        onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">New Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="password"
                        className="input-field pl-10" 
                        placeholder="••••••••"
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="password"
                        className="input-field pl-10" 
                        placeholder="••••••••"
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      />
                    </div>
                  </div>
                </div>


                <div className="pt-2">
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={saving}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                  >
                    {saving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sms' && (

            <div className="card p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-heading font-bold text-neutral-800 flex items-center gap-2 text-lg">
                  <MessageSquare size={22} className="text-secondary-500" /> SMS Gateway (SSL Wireless)
                </h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={sms.is_enabled} 
                      onChange={e => setSms({...sms, is_enabled: e.target.checked})}
                      className="rounded text-primary-600"
                    />
                    <span className="text-xs font-bold text-neutral-600 uppercase">Gateway Enabled</span>
                  </label>
                  <button 
                    onClick={() => handleSave('sms_gateway', sms)}
                    disabled={saving}
                    className="btn-primary py-2 px-6 text-xs flex items-center gap-2 shadow-lg shadow-primary-500/20"
                  >
                    <Save size={14} /> Update Credentials
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-primary-50 rounded-2xl border border-primary-100 flex gap-4 items-start">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <CheckCircle2 size={20} className="text-primary-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary-800 mb-1">Integration Status: Active</p>
                    <p className="text-xs text-primary-600 leading-relaxed">
                      SSL Wireless Bangladesh is your primary SMS provider. This gateway triggers automated flight reminders, 
                      payment receipts, and security OTPs.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="label">SSL Wireless API Key / Token</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="password"
                        className="input-field pl-10" 
                        placeholder="Enter your private API key"
                        value={sms.api_key} 
                        onChange={e => setSms({...sms, api_key: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Sender ID (Approved SID)</label>
                    <input 
                      className="input-field" 
                      placeholder="e.g. SONARMADINA"
                      value={sms.sid} 
                      onChange={e => setSms({...sms, sid: e.target.value})}
                    />
                    <p className="text-[10px] text-neutral-400 mt-1 font-medium">Your Sender ID must be pre-approved by SSL Wireless.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-6 animate-in slide-in-from-right-2 duration-300">
              {/* Permission Guide */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-heading font-bold text-neutral-800 flex items-center gap-2 text-lg">
                    <Shield size={22} className="text-indigo-500" /> Roles & Permissions Guide
                  </h3>
                  {profile?.role === 'super_admin' && (
                    <button 
                      onClick={() => { setTempRoles(roleDefinitions); setIsEditingRoles(true); }}
                      className="btn-outline py-1.5 px-4 text-xs flex items-center gap-2"
                    >
                      <Edit2 size={14} /> Edit Guide
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roleDefinitions.map(role => (
                    <div key={role.id} className="p-4 border border-neutral-100 rounded-2xl bg-neutral-50/50 hover:border-indigo-100 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-neutral-800 text-sm">{role.name}</h4>
                        <Badge variant="neutral">{role.id}</Badge>
                      </div>
                      <p className="text-[10px] text-neutral-500 mb-3 leading-relaxed">{role.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map(p => (
                          <span key={p} className="px-1.5 py-0.5 rounded bg-white text-[9px] font-bold text-neutral-400 border border-neutral-200 uppercase">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Roles Modal */}
              {isEditingRoles && (
                <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                      <div>
                        <h3 className="text-xl font-bold text-neutral-800">Edit Roles & Permissions</h3>
                        <p className="text-xs text-neutral-500">Define role names, descriptions, and module access levels.</p>
                      </div>
                      <button onClick={() => setIsEditingRoles(false)} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
                        <UserPlus size={20} className="rotate-45" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {tempRoles.map((role, idx) => (
                        <div key={idx} className="p-5 border border-neutral-200 rounded-2xl space-y-4 bg-white shadow-sm">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="label">Role ID (Slug)</label>
                              <input 
                                className="input-field bg-neutral-50 font-mono" 
                                value={role.id} 
                                onChange={e => {
                                  const updated = [...tempRoles];
                                  updated[idx].id = e.target.value;
                                  setTempRoles(updated);
                                }}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="label">Role Name (Display)</label>
                              <input 
                                className="input-field font-bold" 
                                value={role.name} 
                                onChange={e => {
                                  const updated = [...tempRoles];
                                  updated[idx].name = e.target.value;
                                  setTempRoles(updated);
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="label">Role Description</label>
                            <textarea 
                              className="input-field text-sm" 
                              rows={2}
                              value={role.description} 
                              onChange={e => {
                                const updated = [...tempRoles];
                                updated[idx].description = e.target.value;
                                setTempRoles(updated);
                              }}
                            />
                          </div>
                          <div>
                            <label className="label">Permissions (Comma separated)</label>
                            <input 
                              className="input-field font-mono text-[10px]" 
                              value={role.permissions.join(', ')} 
                              onChange={e => {
                                const updated = [...tempRoles];
                                updated[idx].permissions = e.target.value.split(',').map(p => p.trim());
                                setTempRoles(updated);
                              }}
                            />
                          </div>
                          <div className="flex justify-end pt-2 border-t border-neutral-50">
                            <button 
                              onClick={() => setTempRoles(tempRoles.filter((_, i) => i !== idx))}
                              className="text-error-500 hover:text-error-600 text-[10px] font-bold flex items-center gap-1 px-3 py-1 hover:bg-error-50 rounded-lg transition-all"
                            >
                              <Trash2 size={12} /> Remove Role
                            </button>
                          </div>
                        </div>
                      ))}

                      <button 
                        onClick={() => setTempRoles([...tempRoles, { id: 'new_role', name: 'New Role', description: '', permissions: [] }])}
                        className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-2xl text-neutral-400 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 font-bold text-sm"
                      >
                        <Plus size={18} /> Add New Role Definition
                      </button>
                    </div>

                    <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex gap-4">
                      <button onClick={() => setIsEditingRoles(false)} className="btn-ghost flex-1">Cancel</button>
                      <button 
                        onClick={handleSaveRoles}
                        disabled={saving}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Save All Role Changes
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Staff Access Management */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-heading font-bold text-neutral-800 text-lg flex items-center gap-2">
                      <UserCheck size={22} className="text-success-500" /> Manage Staff Access
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">Assign roles to control which modules each staff member can access.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowAddUserModal(true)}
                      className="btn-primary py-2 px-4 text-xs flex items-center gap-2 whitespace-nowrap"
                    >
                      <UserPlus size={14} /> Add New Staff Member
                    </button>
                    <div className="relative w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        type="text" 
                        placeholder="Search staff..." 
                        className="input-field pl-9 py-2 text-xs"
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-neutral-50 text-neutral-500 uppercase text-[10px] font-bold tracking-wider">
                        <th className="px-4 py-3 rounded-l-xl">Staff Member</th>
                        <th className="px-4 py-3">Current Role</th>
                        <th className="px-4 py-3">Access Level</th>
                        <th className="px-4 py-3 text-right rounded-r-xl">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {filteredUsers.map(user => (
                        <tr key={user.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center font-bold text-neutral-400 text-xs">
                                {user.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-neutral-800">{user.full_name}</p>
                                <p className="text-[10px] text-neutral-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant={user.role === 'super_admin' ? 'primary' : 'neutral'}>
                              {user.role.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-1">
                              {roleDefinitions.find(r => r.id === user.role)?.permissions.slice(0, 2).map(p => (
                                <span key={p} className="text-[9px] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                                  {p}
                                </span>
                              ))}
                              {(roleDefinitions.find(r => r.id === user.role)?.permissions.length || 0) > 2 && (
                                <span className="text-[9px] font-medium text-neutral-400">...</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <select 
                                className="bg-white border border-neutral-200 rounded-lg px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-primary-500 outline-none disabled:opacity-50"
                                value={user.role}
                                disabled={updatingUserId === user.id}
                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                              >
                                {roleDefinitions.map(rd => (
                                  <option key={rd.id} value={rd.id}>{rd.name}</option>
                                ))}
                              </select>
                              
                              <button
                                onClick={async () => {
                                  if (confirm(`Send password reset email to ${user.full_name}?`)) {
                                    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                                      redirectTo: `${window.location.origin}/login`,
                                    });
                                    if (error) alert(`Error: ${error.message}`);
                                    else alert(`✅ Reset link sent to ${user.email}`);
                                  }
                                }}
                                title="Send Password Reset Email"
                                className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              >
                                <Mail size={14} />
                              </button>

                              {updatingUserId === user.id && (
                                <span className="text-[10px] text-primary-500 animate-pulse font-bold">Saving...</span>
                              )}
                            </div>
                          </td>


                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="py-12 text-center text-neutral-400 text-sm">
                      No staff members found matching your search.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="card p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-heading font-bold text-neutral-800 flex items-center gap-2 text-lg">
                  <Globe size={22} className="text-amber-500" /> Localization & Regional
                </h3>
                <button 
                  onClick={() => handleSave('localization', localization)}
                  disabled={saving}
                  className="btn-primary py-2 px-6 text-xs flex items-center gap-2 shadow-lg shadow-primary-500/20"
                >
                  <Save size={14} /> Update Regional Settings
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="label">System Language</label>
                    <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                      <Languages size={18} className="text-neutral-400" />
                      <select 
                        className="flex-1 bg-transparent border-none text-sm font-medium focus:ring-0"
                        value={localization.language}
                        onChange={e => setLocalization({...localization, language: e.target.value})}
                      >
                        <option>English (United States)</option>
                        <option>English (United Kingdom)</option>
                        <option>Bangla (Bangladesh) - Interface only</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">System Timezone</label>
                    <select 
                      className="input-field"
                      value={localization.timezone}
                      onChange={e => setLocalization({...localization, timezone: e.target.value})}
                    >
                      <option>UTC+6 (Dhaka)</option>
                      <option>UTC+3 (Saudi Arabia)</option>
                      <option>UTC+0 (London)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="label">Primary Currency</label>
                    <select 
                      className="input-field font-bold"
                      value={localization.currency}
                      onChange={e => setLocalization({...localization, currency: e.target.value})}
                    >
                      <option>BDT (৳) - Bangladeshi Taka</option>
                      <option>SAR (﷼) - Saudi Riyal</option>
                      <option>USD ($) - US Dollar</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Display Date Format</label>
                    <select 
                      className="input-field"
                      value={localization.dateFormat}
                      onChange={e => setLocalization({...localization, dateFormat: e.target.value})}
                    >
                      <option>DD/MM/YYYY (06/05/2026)</option>
                      <option>MM/DD/YYYY (05/06/2026)</option>
                      <option>YYYY-MM-DD (2026-05-06)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="card p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center shadow-lg">
                    <Zap size={24} className="text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-neutral-800 text-lg">n8n Automation & API</h3>
                    <p className="text-xs text-neutral-500">Connect your ERP with 2,000+ apps via n8n workflows</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${automation.is_active ? 'bg-success-500' : 'bg-neutral-200'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={automation.is_active}
                        onChange={e => setAutomation({...automation, is_active: e.target.checked})}
                      />
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${automation.is_active ? 'left-6' : 'left-1'}`} />
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase">Automation Active</span>
                  </label>
                  <button 
                    onClick={() => handleSave('automation', automation)}
                    disabled={saving}
                    className="btn-primary py-2 px-6 text-xs flex items-center gap-2"
                  >
                    <Save size={14} /> Save Config
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="label">n8n Webhook URL</label>
                    <div className="relative">
                      <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        className="input-field pl-10 font-mono text-xs" 
                        placeholder="https://n8n.your-domain.com/webhook/..." 
                        value={automation.n8n_webhook_url}
                        onChange={e => setAutomation({...automation, n8n_webhook_url: e.target.value})}
                      />
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-1">This URL will receive a POST request whenever a selected event occurs.</p>
                  </div>

                  <div>
                    <label className="label">System API Key</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input 
                        className="input-field pl-10 font-mono text-xs bg-neutral-50" 
                        readOnly
                        value={automation.api_key}
                      />
                      <button 
                        onClick={() => setAutomation({...automation, api_key: 'smt_live_' + Math.random().toString(36).substring(2, 15)})}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-white border border-neutral-200 px-2 py-1 rounded hover:bg-neutral-50 font-bold text-neutral-600"
                      >
                        Regenerate
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="label">Webhook Secret</label>
                    <input 
                      className="input-field font-mono text-xs" 
                      defaultValue="v2_secure_token_smt"
                      readOnly
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <h4 className="text-sm font-bold text-neutral-700 mb-4 flex items-center gap-2">
                    <BellRing size={16} className="text-primary-500" /> Select Events to Trigger
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'trigger_on_ticket', label: 'New Air Ticket Issued', desc: 'Sync ticket PNR and sales data' },
                      { id: 'trigger_on_customer', label: 'New Customer Registered', desc: 'Sync leads to CRM or Google Sheets' },
                      { id: 'trigger_on_payment', label: 'Payment Received', desc: 'Send automated PDF receipts' },
                    ].map(event => (
                      <div key={event.id} className={`p-4 rounded-2xl border transition-all cursor-pointer ${automation[event.id as keyof typeof automation] ? 'border-primary-200 bg-primary-50/50' : 'border-neutral-100 hover:border-neutral-200'}`} onClick={() => setAutomation({...automation, [event.id]: !automation[event.id as keyof typeof automation]})}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-neutral-800">{event.label}</span>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${automation[event.id as keyof typeof automation] ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'}`}>
                            {automation[event.id as keyof typeof automation] && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-neutral-500">{event.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 rounded-2xl text-white">
                  <h4 className="text-xs font-bold text-yellow-400 mb-2 uppercase tracking-widest">Quick n8n Setup</h4>
                  <p className="text-[10px] text-zinc-400 leading-relaxed mb-3">
                    1. Create a "Webhook" node in n8n.<br/>
                    2. Set method to POST.<br/>
                    3. Copy the production URL and paste it above.<br/>
                    4. Add a "Response" node to finish the workflow.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Add Staff Member Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-800">Add New Staff Member</h3>
                    <p className="text-xs text-neutral-500">Create a login account for a new employee.</p>
                  </div>
                  <button onClick={() => setShowAddUserModal(false)} className="p-2 hover:bg-neutral-200 rounded-full transition-colors">
                    <UserPlus size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input 
                      className="input-field" 
                      placeholder="John Doe"
                      value={newUser.full_name}
                      onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input 
                      className="input-field" 
                      type="email"
                      placeholder="john@sonarmadina.com"
                      value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label">Initial Password</label>
                    <input 
                      className="input-field" 
                      type="password"
                      placeholder="••••••••"
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="label">Initial Role</label>
                    <select 
                      className="input-field font-bold"
                      value={newUser.role}
                      onChange={e => setNewUser({...newUser, role: e.target.value})}
                    >
                      {roleDefinitions.map(role => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-[10px] text-indigo-700 leading-relaxed italic">
                      <strong>Note:</strong> Creating a new user will not log you out. The new staff member will be able to log in immediately with these credentials.
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-neutral-50 border-t border-neutral-100 flex gap-4">
                  <button onClick={() => setShowAddUserModal(false)} className="btn-ghost flex-1">Cancel</button>
                  <button 
                    onClick={handleCreateUser}
                    disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Create Staff Account
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Payment Gateways (Ready to Integrate) */}
          {isAdmin && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-success-50 text-success-600 rounded-lg"><CreditCard size={20} /></div>
                <div>
                  <h3 className="font-heading font-semibold text-neutral-800">Payment Gateways</h3>
                  <p className="text-xs text-neutral-400">Configure online payment collection (Bangladesh)</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white rounded border flex items-center justify-center font-bold text-blue-600">SSL</div>
                      <span className="font-medium text-neutral-700">SSLCommerz</span>
                    </div>
                    <Badge variant="neutral">Not Integrated</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50 pointer-events-none">
                    <div>
                      <label className="label">Store ID</label>
                      <input className="input-field" placeholder="Enter SSL Store ID" />
                    </div>
                    <div>
                      <label className="label">Store Password</label>
                      <input type="password" className="input-field" placeholder="••••••••" />
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-neutral-400">Connect your SSLCommerz merchant account to accept Cards & Net Banking.</p>
                </div>

                <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-white rounded border flex items-center justify-center font-bold text-pink-600">bk</div>
                      <span className="font-medium text-neutral-700">bKash Merchant</span>
                    </div>
                    <Badge variant="neutral">Not Integrated</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50 pointer-events-none">
                    <div>
                      <label className="label">App Key</label>
                      <input className="input-field" />
                    </div>
                    <div>
                      <label className="label">App Secret</label>
                      <input type="password" className="input-field" />
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-neutral-400">Enable direct bKash checkout for your customers.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
