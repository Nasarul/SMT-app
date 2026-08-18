import React, { useState, useEffect } from 'react';
import { Plane, Plus, Trash2, MapPin, Building2, Save, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AIRLINES_FROM_DAC, IATA_AIRPORTS } from '../../lib/constants';
import { useSettings } from '../../contexts/SettingsContext';

export function FlightSetupPage() {
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'airlines' | 'airports'>('airlines');

  // State for Airlines
  const [airlines, setAirlines] = useState<string[]>([]);
  const [newAirline, setNewAirline] = useState('');

  // State for Airports
  const [airports, setAirports] = useState<{ code: string; name: string; city: string }[]>([]);
  const [newAirport, setNewAirport] = useState({ code: '', name: '', city: '' });

  useEffect(() => {
    loadFlightMaster();
  }, []);

  const loadFlightMaster = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('settings').select('*').in('key', ['airline_list', 'airport_list']);
      
      const airlineSet = data?.find(s => s.key === 'airline_list');
      const airportSet = data?.find(s => s.key === 'airport_list');

      setAirlines(airlineSet ? airlineSet.value : AIRLINES_FROM_DAC);
      setAirports(airportSet ? airportSet.value : IATA_AIRPORTS);
    } catch (err) {
      console.error('Error loading flight master:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (key: string, value: any) => {
    setSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key,
        value,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      if (error) throw error;
      await refreshSettings();
      alert('✅ Updated successfully!');
    } catch (err: any) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addAirline = () => {
    if (!newAirline) return;
    if (airlines.includes(newAirline)) {
      alert('Airline already exists');
      return;
    }
    const updated = [...airlines, newAirline].sort();
    setAirlines(updated);
    setNewAirline('');
  };

  const removeAirline = (name: string) => {
    setAirlines(airlines.filter(a => a !== name));
  };

  const addAirport = () => {
    if (!newAirport.code || !newAirport.city) {
      alert('Code and City are required');
      return;
    }
    if (airports.find(a => a.code.toUpperCase() === newAirport.code.toUpperCase())) {
      alert('Airport code already exists');
      return;
    }
    const updated = [...airports, { ...newAirport, code: newAirport.code.toUpperCase() }].sort((a, b) => a.code.localeCompare(b.code));
    setAirports(updated);
    setNewAirport({ code: '', name: '', city: '' });
  };

  const removeAirport = (code: string) => {
    setAirports(airports.filter(a => a.code !== code));
  };

  if (loading) return <div className="p-12 text-center text-neutral-400">Loading flight configurations...</div>;

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in max-w-5xl mx-auto">

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-2">
            <button 
              onClick={() => setActiveTab('airlines')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'airlines' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <Building2 size={18} /> Airline List
            </button>
            <button 
              onClick={() => setActiveTab('airports')}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'airports' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-neutral-500 hover:bg-neutral-50'}`}
            >
              <Globe size={18} /> Origins & Destinations
            </button>
          </div>
          
          <div className="card p-5 bg-gradient-to-br from-neutral-800 to-neutral-900 text-white shadow-xl">
            <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-primary-400">
              <Save size={16} /> Quick Note
            </h4>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              Any changes made here will instantly appear in the "Issue Ticket" forms across the system.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'airlines' && (
            <div className="card p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-heading font-bold text-neutral-800 flex items-center gap-2 text-lg">
                  <Plane size={22} className="text-primary-500" /> Manage Airlines
                </h3>
                <button 
                  onClick={() => handleSave('airline_list', airlines)}
                  disabled={saving}
                  className="btn-primary py-2 px-6 text-xs flex items-center gap-2"
                >
                  <Save size={14} /> Save Airline List
                </button>
              </div>

              <div className="flex gap-2 mb-6">
                <input 
                  className="input-field flex-1" 
                  placeholder="Enter airline name (e.g. Qatar Airways)"
                  value={newAirline}
                  onChange={e => setNewAirline(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && addAirline()}
                />
                <button onClick={addAirline} className="btn-outline px-4 flex items-center gap-2">
                  <Plus size={16} /> Add
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto pr-2">
                {airlines.map(airline => (
                  <div key={airline} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 group">
                    <span className="text-sm font-medium text-neutral-700">{airline}</span>
                    <button 
                      onClick={() => removeAirline(airline)}
                      className="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'airports' && (
            <div className="card p-6 animate-in slide-in-from-right-2 duration-300">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-heading font-bold text-neutral-800 flex items-center gap-2 text-lg">
                  <MapPin size={22} className="text-indigo-500" /> Origins & Destinations (IATA)
                </h3>
                <button 
                  onClick={() => handleSave('airport_list', airports)}
                  disabled={saving}
                  className="btn-primary py-2 px-6 text-xs flex items-center gap-2"
                >
                  <Save size={14} /> Save Airport List
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-6 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
                <input 
                  className="input-field" 
                  placeholder="Code (e.g. DXB)"
                  maxLength={3}
                  value={newAirport.code}
                  onChange={e => setNewAirport({...newAirport, code: e.target.value.toUpperCase()})}
                />
                <input 
                  className="input-field" 
                  placeholder="City (e.g. Dubai)"
                  value={newAirport.city}
                  onChange={e => setNewAirport({...newAirport, city: e.target.value})}
                />
                <button onClick={addAirport} className="btn-primary px-4 flex items-center justify-center gap-2">
                  <Plus size={16} /> Add Airport
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
                {airports.map(ap => (
                  <div key={ap.code} className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-200 shadow-sm group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
                        {ap.code}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-neutral-800">{ap.city}</div>
                        <div className="text-[10px] text-neutral-400 truncate max-w-[150px]">{ap.name || 'Airport'}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeAirport(ap.code)}
                      className="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
