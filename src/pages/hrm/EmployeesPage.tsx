import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Search, Phone, Mail, AlertCircle, CheckCircle, Eye, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  mobile: string;
  email: string;
  department: string;
  designation: string;
  joining_date: string;
  basic_salary: number;
  is_active: boolean;
  photo_url?: string;
  nid_url?: string;
}

const DEPARTMENTS = [
  { value: 'sales', label: 'Sales' },
  { value: 'operations', label: 'Operations' },
  { value: 'accounts', label: 'Accounts' },
  { value: 'hajj_umrah', label: 'Hajj & Umrah' },
  { value: 'tours', label: 'Tours' },
  { value: 'it', label: 'IT' },
  { value: 'admin', label: 'Admin' },
];

const emptyForm = {
  full_name: '', nid: '', mobile: '', email: '',
  department: 'sales', designation: '', joining_date: new Date().toISOString().split('T')[0],
  basic_salary: 0, medical_allowance: 1500, transport_allowance: 1000, mobile_allowance: 0,
  photo_url: '', nid_url: '',
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState(false);
  const [uploading, setUploading] = useState<'photo' | 'nid' | null>(null);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoading(true);
    const { data } = await supabase.from('employees').select('*').order('created_at', { ascending: false });
    setEmployees(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.full_name || !form.mobile || !form.designation) {
      setError('Name, mobile, and designation are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const house_rent = Number(form.basic_salary) * 0.5;
      const dataToSave = { ...form, house_rent };
      
      // Clean empty strings to null for optional database fields
      Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === '') dataToSave[key] = null;
      });
      
      let err;
      if (form.id) {
        const { error: updateErr } = await supabase.from('employees').update(dataToSave).eq('id', form.id);
        err = updateErr;
      } else {
        const { error: insertErr } = await supabase.from('employees').insert([dataToSave]);
        err = insertErr;
      }

      if (err) { 
        setError(err.message); 
      } else {
        setSuccess(form.id ? 'Employee updated!' : 'Employee added!');
        setShowForm(false);
        setForm(emptyForm);
        loadEmployees();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (emp: Employee) => {
    setForm(emp);
    setViewMode(false);
    setShowForm(true);
    setError('');
  };

  const handleView = (emp: Employee) => {
    setForm(emp);
    setViewMode(true);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) {
      alert('Error deleting employee: ' + error.message);
    } else {
      setSuccess('Employee deleted successfully');
      loadEmployees();
    }
  };

  const grossSalary = () => {
    const basic = Number(form.basic_salary) || 0;
    const house = basic * 0.5;
    const med = Number(form.medical_allowance) || 1500;
    const trans = Number(form.transport_allowance) || 1000;
    const mob = Number(form.mobile_allowance) || 0;
    return basic + house + med + trans + mob;
  };

  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_code?.toLowerCase().includes(search.toLowerCase()) ||
    e.designation?.toLowerCase().includes(search.toLowerCase())
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'nid') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File too large (max 2MB)');
      return;
    }

    setUploading(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `employees/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      console.log(`Uploaded ${type}:`, publicUrl);
      f(type === 'photo' ? 'photo_url' : 'nid_url', publicUrl);
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  const f = (field: string, val: any) => setForm(prev => ({ ...prev, [field]: val }));

  const deptColors: Record<string, string> = {
    sales: 'primary', operations: 'warning', accounts: 'success',
    hajj_umrah: 'gold', tours: 'neutral', it: 'error', admin: 'neutral',
  };

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => { setForm(emptyForm); setViewMode(false); setShowForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Plus size={16} /> Add Employee
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Dept Summary */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        {DEPARTMENTS.map(dept => {
          const count = employees.filter(e => e.department === dept.value && e.is_active).length;
          return (
            <div key={dept.value} className="card p-3 text-center">
              <div className="text-xl font-bold text-neutral-800">{count}</div>
              <div className="text-xs text-neutral-500">{dept.label}</div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input className="input-field pl-9" placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Employees Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12 text-neutral-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={UserCog} title="No employees found" description="Add your first employee to get started" />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                  <th className="table-header text-left">Code</th>
                  <th className="table-header text-left">Employee Name</th>
                  <th className="table-header text-left">Department</th>
                  <th className="table-header text-left">Designation</th>
                  <th className="table-header text-left">Contact</th>
                  <th className="table-header text-right">Joining Date</th>
                  <th className="table-header text-right">Salary</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id} className={`border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors ${!emp.is_active ? 'bg-neutral-50/30' : ''}`}>
                    <td className="table-cell">
                      <span className="font-mono text-xs font-semibold text-primary-600">
                        {emp.employee_code || '---'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden">
                          {emp.photo_url ? (
                            <img src={emp.photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            emp.full_name?.charAt(0)?.toUpperCase()
                          )}
                        </div>
                        <div className="font-medium text-neutral-800">{emp.full_name}</div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge variant={deptColors[emp.department] as any} className="capitalize text-[10px]">
                        {emp.department.replace('_', ' & ')}
                      </Badge>
                    </td>
                    <td className="table-cell text-sm text-neutral-600">{emp.designation}</td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                          <Phone size={10} className="text-neutral-400" /> {emp.mobile}
                        </div>
                        {emp.email && (
                          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <Mail size={10} className="text-neutral-400" /> {emp.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-right text-xs text-neutral-500">
                      {formatDate(emp.joining_date)}
                    </td>
                    <td className="table-cell text-right font-semibold text-neutral-800">
                      {formatBDT(emp.basic_salary)}
                    </td>
                    <td className="table-cell text-center">
                      <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                        {emp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleView(emp)} className="p-1.5 hover:bg-primary-50 text-primary-600 rounded-lg transition-colors" title="View Details">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleEdit(emp)} className="p-1.5 hover:bg-secondary-50 text-secondary-600 rounded-lg transition-colors" title="Edit Profile">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(emp.id)} className="p-1.5 hover:bg-error-50 text-error-600 rounded-lg transition-colors" title="Delete Employee">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit/View Employee Modal */}
      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title={viewMode ? 'Employee Profile' : (form.id ? 'Edit Employee Profile' : 'Add New Employee')} 
        size="lg"
      >
        {viewMode ? (
          <div className="animate-fade-in flex flex-col max-h-[85vh]">
            {/* Soft Professional Header */}
            <div className="bg-neutral-50 border-b border-neutral-200 px-8 py-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-white p-1 rounded-xl shadow-sm border border-neutral-200">
                  <div className="w-full h-full bg-neutral-50 rounded-lg overflow-hidden flex items-center justify-center">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-neutral-300">{form.full_name?.charAt(0)}</span>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black text-neutral-900 leading-tight">{form.full_name}</h3>
                    <Badge variant="primary" className="uppercase text-[9px] font-bold px-2 py-0.5">
                      {form.employee_code || 'ID: ---'}
                    </Badge>
                  </div>
                  <p className="text-sm font-bold text-primary-600 uppercase tracking-[0.1em]">{form.designation}</p>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                      <Mail size={12} className="text-neutral-400" />
                      {form.email || 'No Email'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                      <Phone size={12} className="text-neutral-400" />
                      {form.mobile}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={form.is_active ? 'success' : 'neutral'} className="text-[10px] py-1 px-3">
                    {form.is_active ? 'Active Employee' : 'Inactive'}
                  </Badge>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase mt-2 tracking-tighter">Joined: {formatDate(form.joining_date)}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Information Card */}
                <div className="space-y-4">
                  <div className="bg-neutral-50/50 rounded-xl border border-neutral-100 p-5">
                    <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <UserCog size={13} className="text-primary-500" />
                      Profile Details
                    </h4>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                      <div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase">National ID</div>
                        <div className="text-sm font-bold text-neutral-800">{form.nid || '---'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase">Department</div>
                        <div className="text-sm font-bold text-neutral-800 capitalize">{form.department.replace('_', ' & ')}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase">Status</div>
                        <div className="text-sm font-bold text-neutral-800">{form.is_active ? 'Current Staff' : 'Resigned'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-neutral-400 font-bold uppercase">Joining Date</div>
                        <div className="text-sm font-bold text-neutral-800">{formatDate(form.joining_date)}</div>
                      </div>
                    </div>
                  </div>

                  {form.nid_url && (
                    <div className="bg-neutral-50/50 rounded-xl border border-neutral-100 p-5">
                      <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ImageIcon size={13} className="text-neutral-400" />
                        Documents
                      </h4>
                      <a 
                        href={form.nid_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-lg hover:border-primary-200 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <ImageIcon size={14} className="text-primary-500" />
                          <span className="text-xs font-bold text-neutral-700">Verified NID Copy</span>
                        </div>
                        <Eye size={12} className="text-neutral-300 group-hover:text-primary-500" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Salary Section */}
                <div className="bg-primary-50/30 rounded-xl border border-primary-100/50 p-5 flex flex-col">
                  <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <AlertCircle size={13} />
                    Salary Configuration
                  </h4>
                  <div className="space-y-3 flex-1">
                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-neutral-100 shadow-sm">
                      <span className="text-xs text-neutral-500 font-medium uppercase">Basic Salary</span>
                      <span className="text-sm font-black text-neutral-800">{formatBDT(form.basic_salary)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-neutral-100 shadow-sm">
                      <span className="text-xs text-neutral-500 font-medium uppercase">Fixed Allowances</span>
                      <span className="text-sm font-black text-success-600">
                        {formatBDT(Number(form.medical_allowance) + Number(form.transport_allowance) + Number(form.mobile_allowance) + (Number(form.basic_salary) * 0.5))}
                      </span>
                    </div>
                    <div className="mt-6 pt-4 border-t-2 border-dashed border-primary-100">
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-[9px] text-primary-400 font-bold uppercase mb-1">Total Gross Salary</div>
                          <div className="text-2xl font-black text-primary-700">{formatBDT(grossSalary())}</div>
                        </div>
                        <div className="text-[9px] text-neutral-400 font-medium italic mb-1">Per Month</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button onClick={() => setShowForm(false)} className="btn-primary w-full py-3 shadow-lg shadow-primary-200/50">
                  Finish Viewing Profile
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {error && (
              <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
                <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Personal Information</h3>
              <div className="form-grid">
                <div>
                  <label className="label">Full Name *</label>
                  <input className="input-field disabled:opacity-70" value={form.full_name} onChange={e => f('full_name', e.target.value)} disabled={viewMode} />
                </div>
                <div>
                  <label className="label">NID</label>
                  <input className="input-field disabled:opacity-70" value={form.nid} onChange={e => f('nid', e.target.value)} disabled={viewMode} />
                </div>
                <div>
                  <label className="label">Mobile *</label>
                  <input className="input-field disabled:opacity-70" value={form.mobile} onChange={e => f('mobile', e.target.value)} placeholder="01XXXXXXXXX" disabled={viewMode} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input-field disabled:opacity-70" value={form.email} onChange={e => f('email', e.target.value)} disabled={viewMode} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Employment Details</h3>
              <div className="form-grid">
                <div>
                  <label className="label">Department</label>
                  <select className="input-field disabled:opacity-70" value={form.department} onChange={e => f('department', e.target.value)} disabled={viewMode}>
                    {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Designation *</label>
                  <input className="input-field disabled:opacity-70" value={form.designation} onChange={e => f('designation', e.target.value)} placeholder="e.g. Sales Executive" disabled={viewMode} />
                </div>
                <div>
                  <label className="label">Joining Date</label>
                  <input type="date" className="input-field disabled:opacity-70" value={form.joining_date} onChange={e => f('joining_date', e.target.value)} disabled={viewMode} />
                </div>
                <div>
                  <label className="label">Account Status</label>
                  <select className="input-field" value={form.is_active ? 'true' : 'false'} onChange={e => f('is_active', e.target.value === 'true')}>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Documents & Identification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-4 border-dashed border-2 border-neutral-200">
                  <label className="label mb-2">Employee Picture</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-neutral-100 rounded-xl flex items-center justify-center overflow-hidden border border-neutral-200 relative group">
                      {uploading === 'photo' ? (
                        <div className="flex flex-col items-center gap-1 text-[10px] text-primary-500 font-bold">
                          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Uploading...</span>
                        </div>
                      ) : form.photo_url ? (
                        <img key={form.photo_url} src={form.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-neutral-400">
                          <ImageIcon size={20} />
                          <span className="text-[9px]">No Image</span>
                        </div>
                      )}
                    </div>
                    {!viewMode && (
                      <label className="btn-outline py-2 px-4 text-xs cursor-pointer shadow-sm hover:shadow transition-all flex items-center gap-2">
                        <Plus size={14} />
                        <span>{form.photo_url ? 'Change Photo' : 'Upload Picture'}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'photo')} disabled={!!uploading} />
                      </label>
                    )}
                  </div>
                </div>
                <div className="card p-4 border-dashed border-2 border-neutral-200">
                  <label className="label mb-2">NID / ID Card Document</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-neutral-100 rounded-xl flex items-center justify-center overflow-hidden border border-neutral-200 relative">
                      {uploading === 'nid' ? (
                        <div className="flex flex-col items-center gap-1 text-[10px] text-primary-500 font-bold">
                          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Uploading...</span>
                        </div>
                      ) : form.nid_url ? (
                        form.nid_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || form.nid_url.includes('employees/nid') ? (
                           <img key={form.nid_url} src={form.nid_url} alt="NID" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-primary-600 font-bold text-[10px] text-center p-2 uppercase bg-primary-50 w-full h-full flex items-center justify-center">Doc Uploaded</div>
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-neutral-400">
                          <ImageIcon size={20} />
                          <span className="text-[9px]">No NID</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {!viewMode && (
                        <label className="btn-outline py-2 px-4 text-xs cursor-pointer shadow-sm hover:shadow transition-all flex items-center gap-2">
                          <Plus size={14} />
                          <span>{form.nid_url ? 'Replace NID' : 'Upload NID'}</span>
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={e => handleFileUpload(e, 'nid')} disabled={!!uploading} />
                        </label>
                      )}
                      {form.nid_url && (
                        <a href={form.nid_url} target="_blank" rel="noopener noreferrer" className="btn-ghost py-1 px-3 text-[10px] font-bold text-primary-600 border border-primary-100 rounded flex items-center gap-1.5 justify-center">
                          <Eye size={12} /> View Document
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-neutral-600 mb-3 uppercase tracking-wide">Salary Structure</h3>
              <div className="form-grid">
                <div>
                  <label className="label">Basic Salary</label>
                  <input 
                    type="number" 
                    className="input-field disabled:opacity-70" 
                    value={form.basic_salary} 
                    onChange={e => f('basic_salary', e.target.value)} 
                    disabled={viewMode}
                  />
                </div>
                <div>
                  <label className="label">House Rent (Auto: 50% of basic)</label>
                  <div className="input-field bg-neutral-50 text-neutral-500">
                    {formatBDT(Number(form.basic_salary) * 0.5)}
                  </div>
                </div>
                <div>
                  <label className="label">Medical Allowance</label>
                  <input type="number" className="input-field disabled:opacity-70" value={form.medical_allowance} onChange={e => f('medical_allowance', e.target.value)} disabled={viewMode} />
                </div>
                <div>
                  <label className="label">Transport Allowance</label>
                  <input type="number" className="input-field disabled:opacity-70" value={form.transport_allowance} onChange={e => f('transport_allowance', e.target.value)} disabled={viewMode} />
                </div>
                <div>
                  <label className="label">Mobile Allowance</label>
                  <input type="number" className="input-field disabled:opacity-70" value={form.mobile_allowance} onChange={e => f('mobile_allowance', e.target.value)} disabled={viewMode} />
                </div>
                <div>
                  <label className="label">Gross Salary (Auto)</label>
                  <div className="input-field bg-primary-50 text-primary-700 font-bold">{formatBDT(grossSalary())}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1">
                {viewMode ? 'Close' : 'Cancel'}
              </button>
              {!viewMode && (
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Saving...' : (form.id ? 'Update Profile' : 'Add Employee')}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
