import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, Filter, Phone, Mail, MapPin, DollarSign, Edit2, ShieldCheck, ShieldAlert, MoreVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatBDT } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

interface B2BAgent {
  id: string;
  agency_name: string;
  trade_license: string;
  atab_number: string;
  toab_number: string;
  contact_person: string;
  mobile: string;
  email: string;
  address: string;
  credit_limit: number;
  current_balance: number;
  commission_rate: number;
  is_active: boolean;
}

export function B2BAgentsPage() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<B2BAgent[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingAgent, setEditingAgent] = useState<B2BAgent | null>(null);

  const [form, setForm] = useState<Partial<B2BAgent>>({
    agency_name: '',
    contact_person: '',
    mobile: '',
    email: '',
    address: '',
    credit_limit: 0,
    current_balance: 0,
    commission_rate: 0,
    is_active: true
  });

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('b2b_agents').select('*').order('agency_name');
      setAgents(data || []);
    } catch (err) {
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (agent: B2BAgent) => {
    setEditingAgent(agent);
    setForm(agent);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingAgent) {
        const { error } = await supabase.from('b2b_agents').update(form).eq('id', editingAgent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('b2b_agents').insert([form]);
        if (error) throw error;
      }
      setShowModal(false);
      loadAgents();
      setForm({ agency_name: '', contact_person: '', mobile: '', email: '', address: '', credit_limit: 0, current_balance: 0, is_active: true });
      setEditingAgent(null);
    } catch (err) {
      console.error('Error saving agent:', err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = agents.filter(a => 
    a.agency_name.toLowerCase().includes(search.toLowerCase()) ||
    a.contact_person.toLowerCase().includes(search.toLowerCase()) ||
    a.mobile.includes(search)
  );

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">B2B Agency Partners</h2>
          <p className="text-sm text-neutral-500">Manage travel agency partners and credit limits</p>
        </div>
        <button 
          onClick={() => { setEditingAgent(null); setForm({ is_active: true }); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add New Partner
        </button>
      </div>

      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            className="input-field pl-9" 
            placeholder="Search by agency name, contact person or mobile..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-40">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Agency Partner</th>
                <th className="table-header text-left">Contact Info</th>
                <th className="table-header text-left">Office Address</th>
                <th className="table-header text-right">Credit Limit</th>
                <th className="table-header text-right">Current Balance</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400 text-sm">Loading partners...</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState 
                      icon={Building2} 
                      title="No partners found" 
                      description="Start by adding your first B2B travel agency partner."
                    />
                  </td>
                </tr>
              )}
              {filtered.map(agent => (
                <tr key={agent.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 size={16} className="text-primary-700" />
                      </div>
                      <div className="font-medium text-neutral-800">{agent.agency_name}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm font-medium text-neutral-700">{agent.contact_person}</div>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-0.5">
                      <Phone size={11} /> {agent.mobile}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500 max-w-[200px] truncate">
                      <MapPin size={11} className="shrink-0" /> {agent.address || 'No address'}
                    </div>
                  </td>
                  <td className="table-cell text-right font-mono text-sm">
                    {formatBDT(agent.credit_limit)}
                  </td>
                  <td className="table-cell text-right">
                    <span className={`font-mono text-sm font-bold ${agent.current_balance < 0 ? 'text-error-600' : 'text-success-600'}`}>
                      {formatBDT(agent.current_balance)}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <Badge variant={agent.is_active ? 'success' : 'neutral'}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="table-cell text-right">
                    <button 
                      onClick={() => handleEdit(agent)}
                      className="p-1.5 hover:bg-primary-50 text-neutral-400 hover:text-primary-600 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        title={editingAgent ? 'Edit B2B Partner' : 'Add New B2B Partner'}
        size="lg"
      >
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Agency Name *</label>
              <input 
                className="input-field" 
                value={form.agency_name} 
                onChange={e => setForm({...form, agency_name: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Contact Person *</label>
              <input 
                className="input-field" 
                value={form.contact_person} 
                onChange={e => setForm({...form, contact_person: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Mobile Number *</label>
              <input 
                className="input-field" 
                value={form.mobile} 
                onChange={e => setForm({...form, mobile: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input 
                className="input-field" 
                value={form.email} 
                onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>
            <div>
              <label className="label">Credit Limit (BDT)</label>
              <input 
                type="number"
                className="input-field" 
                value={form.credit_limit} 
                onChange={e => setForm({...form, credit_limit: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Office Address</label>
              <textarea 
                className="input-field" 
                rows={2}
                value={form.address} 
                onChange={e => setForm({...form, address: e.target.value})}
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input 
                  type="checkbox" 
                  checked={form.is_active} 
                  onChange={e => setForm({...form, is_active: e.target.checked})}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-neutral-700">Active Partner</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button 
              onClick={handleSave} 
              disabled={saving || !form.agency_name || !form.mobile}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : editingAgent ? 'Update Partner' : 'Create Partner'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
