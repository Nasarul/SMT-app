import React, { useState, useEffect } from 'react';
import { Plane, Tent, Home, Bus, CheckCircle, Info, Search, Filter, Edit3, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

interface LogisticsRecord {
  id: string;
  pilgrim_id: string;
  flight_dep_no: string;
  flight_dep_time: string | null;
  flight_ret_no: string;
  flight_ret_time: string | null;
  mina_tent: string;
  arafat_camp: string;
  muzdalifa_status: boolean;
  makkah_room: string;
  madinah_room: string;
  bus_number: string;
  is_training_complete: boolean;
  is_visa_issued: boolean;
  is_kit_provided: boolean;
  hajj_pilgrims?: {
    full_name: string;
    passport_number: string;
    hajj_serial: string;
  };
}

export function HajjLogisticsPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<LogisticsRecord[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<LogisticsRecord>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: pilgrims } = await supabase
        .from('hajj_pilgrims')
        .select('id, full_name, passport_number, hajj_serial');

      const { data: logistics } = await supabase
        .from('hajj_logistics')
        .select('*, hajj_pilgrims(full_name, passport_number, hajj_serial)');

      // Merge or initialize
      const merged: LogisticsRecord[] = pilgrims?.map(p => {
        const log = logistics?.find(l => l.pilgrim_id === p.id);
        return log || {
          id: '',
          pilgrim_id: p.id,
          flight_dep_no: '',
          flight_dep_time: null,
          flight_ret_no: '',
          flight_ret_time: null,
          mina_tent: '',
          arafat_camp: '',
          muzdalifa_status: false,
          makkah_room: '',
          madinah_room: '',
          bus_number: '',
          is_training_complete: false,
          is_visa_issued: false,
          is_kit_provided: false,
          hajj_pilgrims: p
        };
      }) || [];

      setRecords(merged);
    } catch (err) {
      console.error('Error loading hajj logistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: LogisticsRecord) => {
    setEditingId(record.pilgrim_id);
    setEditForm(record);
  };

  const handleSave = async () => {
    try {
      const { id, hajj_pilgrims, ...payload } = editForm as any;
      
      const { error } = await supabase
        .from('hajj_logistics')
        .upsert({ ...payload, pilgrim_id: editingId }, { onConflict: 'pilgrim_id' });

      if (error) throw error;
      
      setEditingId(null);
      loadData();
    } catch (err) {
      console.error('Error saving logistics:', err);
    }
  };

  const filtered = records.filter(r => 
    r.hajj_pilgrims?.full_name.toLowerCase().includes(search.toLowerCase()) ||
    r.hajj_pilgrims?.passport_number.toLowerCase().includes(search.toLowerCase()) ||
    r.hajj_pilgrims?.hajj_serial.includes(search)
  );

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Hajj Logistics Tracking</h2>
          <p className="text-sm text-neutral-500">Manage flights, tents, and accommodation for pilgrims</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Visa Issued', count: records.filter(r => r.is_visa_issued).length, icon: CheckCircle, color: 'text-success-600' },
          { label: 'Training Done', count: records.filter(r => r.is_training_complete).length, icon: Info, color: 'text-primary-600' },
          { label: 'Flight Ready', count: records.filter(r => r.flight_dep_no).length, icon: Plane, color: 'text-secondary-600' },
          { label: 'Tent Assigned', count: records.filter(r => r.mina_tent).length, icon: Tent, color: 'text-warning-600' },
        ].map(stat => (
          <div key={stat.label} className="card p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-50 ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-neutral-800">{stat.count}</div>
              <div className="text-xs text-neutral-400 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            className="input-field pl-9" 
            placeholder="Search by pilgrim name, passport or serial..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Pilgrim</th>
                <th className="table-header text-left">Flights</th>
                <th className="table-header text-left">Tent & Camp</th>
                <th className="table-header text-left">Accommodation</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-neutral-400">Loading logistics data...</td></tr>
              ) : filtered.map(record => (
                <tr key={record.pilgrim_id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell">
                    <div className="font-medium text-neutral-800">{record.hajj_pilgrims?.full_name}</div>
                    <div className="text-[10px] text-neutral-400 font-mono">SN: {record.hajj_pilgrims?.hajj_serial || 'PENDING'}</div>
                  </td>
                  <td className="table-cell">
                    {record.flight_dep_no ? (
                      <div className="space-y-1">
                        <div className="text-xs flex items-center gap-1 text-neutral-700">
                          <Plane size={10} className="text-primary-500" /> {record.flight_dep_no}
                        </div>
                        <div className="text-[10px] text-neutral-400">{formatDate(record.flight_dep_time)}</div>
                      </div>
                    ) : <span className="text-xs text-neutral-300 italic">No flight info</span>}
                  </td>
                  <td className="table-cell">
                    {record.mina_tent ? (
                      <div className="space-y-1">
                        <div className="text-xs flex items-center gap-1 text-neutral-700">
                          <Tent size={10} className="text-warning-500" /> Mina: {record.mina_tent}
                        </div>
                        <div className="text-[10px] text-neutral-400">Arafat: {record.arafat_camp || '—'}</div>
                      </div>
                    ) : <span className="text-xs text-neutral-300 italic">No tent info</span>}
                  </td>
                  <td className="table-cell">
                    {record.makkah_room ? (
                      <div className="space-y-1">
                        <div className="text-xs flex items-center gap-1 text-neutral-700">
                          <Home size={10} className="text-secondary-500" /> Mak: {record.makkah_room}
                        </div>
                        <div className="text-[10px] text-neutral-400">Mad: {record.madinah_room || '—'}</div>
                      </div>
                    ) : <span className="text-xs text-neutral-300 italic">No room info</span>}
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${record.is_visa_issued ? 'bg-success-100 text-success-700' : 'bg-neutral-100 text-neutral-400'}`} title="Visa">V</div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${record.is_training_complete ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-400'}`} title="Training">T</div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${record.is_kit_provided ? 'bg-warning-100 text-warning-700' : 'bg-neutral-100 text-neutral-400'}`} title="Kit">K</div>
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    <button 
                      onClick={() => handleEdit(record)}
                      className="p-1.5 rounded-lg hover:bg-primary-50 text-neutral-400 hover:text-primary-600 transition-colors"
                    >
                      <Edit3 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Logistics Modal */}
      <Modal 
        isOpen={!!editingId} 
        onClose={() => setEditingId(null)} 
        title="Edit Logistics Details"
        size="lg"
      >
        <div className="p-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Flight Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Plane size={14} /> Flight Details
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Dep. Flight</label>
                  <input 
                    className="input-field" 
                    value={editForm.flight_dep_no || ''} 
                    onChange={e => setEditForm({...editForm, flight_dep_no: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Dep. Time</label>
                  <input 
                    type="datetime-local"
                    className="input-field text-xs" 
                    value={editForm.flight_dep_time ? new Date(editForm.flight_dep_time).toISOString().slice(0, 16) : ''} 
                    onChange={e => setEditForm({...editForm, flight_dep_time: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Ret. Flight</label>
                  <input 
                    className="input-field" 
                    value={editForm.flight_ret_no || ''} 
                    onChange={e => setEditForm({...editForm, flight_ret_no: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Ret. Time</label>
                  <input 
                    type="datetime-local"
                    className="input-field text-xs" 
                    value={editForm.flight_ret_time ? new Date(editForm.flight_ret_time).toISOString().slice(0, 16) : ''} 
                    onChange={e => setEditForm({...editForm, flight_ret_time: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Camp Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Tent size={14} /> Camp & Accommodation
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Mina Tent</label>
                  <input 
                    className="input-field" 
                    value={editForm.mina_tent || ''} 
                    onChange={e => setEditForm({...editForm, mina_tent: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Arafat Camp</label>
                  <input 
                    className="input-field" 
                    value={editForm.arafat_camp || ''} 
                    onChange={e => setEditForm({...editForm, arafat_camp: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Makkah Room</label>
                  <input 
                    className="input-field" 
                    value={editForm.makkah_room || ''} 
                    onChange={e => setEditForm({...editForm, makkah_room: e.target.value})}
                  />
                </div>
                <div>
                  <label className="label">Madinah Room</label>
                  <input 
                    className="input-field" 
                    value={editForm.madinah_room || ''} 
                    onChange={e => setEditForm({...editForm, madinah_room: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Checklists */}
          <div className="p-4 bg-neutral-50 rounded-xl">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Service Checklist</h4>
            <div className="grid grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editForm.is_visa_issued} 
                  onChange={e => setEditForm({...editForm, is_visa_issued: e.target.checked})}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">Visa Issued</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editForm.is_training_complete} 
                  onChange={e => setEditForm({...editForm, is_training_complete: e.target.checked})}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">Training Complete</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editForm.is_kit_provided} 
                  onChange={e => setEditForm({...editForm, is_kit_provided: e.target.checked})}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">Kit Provided</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setEditingId(null)}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
