import React, { useState } from 'react';
import { Settings as SettingsIcon, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

export function HotelSettingsPage() {
  const [activeTab, setActiveTab] = useState<'room' | 'meal'>('room');
  
  const [roomCategories, setRoomCategories] = useState([
    { id: '1', name: 'Single', description: 'Single Room' },
    { id: '2', name: 'Double', description: 'Double / Twin Room' },
    { id: '3', name: 'Triple', description: 'Triple Room' },
    { id: '4', name: 'Quad', description: 'Quad Room' },
    { id: '5', name: 'Suite', description: 'Suite' },
    { id: '6', name: 'Family', description: 'Family Room' },
  ]);

  const [mealPlans, setMealPlans] = useState([
    { id: '1', name: 'Room Only', code: 'RO' },
    { id: '2', name: 'Breakfast Included', code: 'BB' },
    { id: '3', name: 'Half Board', code: 'HB' },
    { id: '4', name: 'Full Board', code: 'FB' },
    { id: '5', name: 'All Inclusive', code: 'AI' },
  ]);

  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newItemName) return;
    if (activeTab === 'room') {
      setRoomCategories([...roomCategories, { id: Date.now().toString(), name: newItemName, description: newItemDesc }]);
    } else {
      setMealPlans([...mealPlans, { id: Date.now().toString(), name: newItemName, code: newItemDesc }]);
    }
    setNewItemName('');
    setNewItemDesc('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (activeTab === 'room') {
      setRoomCategories(roomCategories.filter(r => r.id !== id));
    } else {
      setMealPlans(mealPlans.filter(m => m.id !== id));
    }
  };

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <SettingsIcon className="text-primary-600" size={24} /> Hotel Settings
          </h2>
          <p className="text-sm text-neutral-500">Manage Room Categories and Meal Plans</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add {activeTab === 'room' ? 'Category' : 'Plan'}
        </button>
      </div>

      <div className="card mb-6">
        <div className="flex border-b border-neutral-100">
          <button
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'room' ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
            onClick={() => { setActiveTab('room'); setIsAdding(false); }}
          >
            Room Categories
          </button>
          <button
            className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'meal' ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
            onClick={() => { setActiveTab('meal'); setIsAdding(false); }}
          >
            Meal Plans
          </button>
        </div>
        
        <div className="p-4">
          {isAdding && (
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 mb-4 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="label">Name *</label>
                <input
                  className="input-field bg-white"
                  placeholder="e.g. Standard"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                />
              </div>
              <div className="flex-1 w-full">
                <label className="label">{activeTab === 'room' ? 'Description' : 'Code'}</label>
                <input
                  className="input-field bg-white"
                  placeholder={activeTab === 'room' ? 'e.g. Standard Room' : 'e.g. STD'}
                  value={newItemDesc}
                  onChange={e => setNewItemDesc(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={handleAdd} className="btn-primary flex-1 flex items-center justify-center gap-1">
                  <Check size={16} /> Save
                </button>
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 bg-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-300 transition-colors font-bold flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="table-header text-left">Name</th>
                  <th className="table-header text-left">{activeTab === 'room' ? 'Description' : 'Code'}</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {(activeTab === 'room' ? roomCategories : mealPlans).map(item => (
                  <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="table-cell font-bold text-neutral-800">{item.name}</td>
                    <td className="table-cell text-neutral-600">
                      {'description' in item ? item.description : item.code}
                    </td>
                    <td className="table-cell text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 hover:bg-error-50 text-neutral-400 hover:text-error-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {(activeTab === 'room' ? roomCategories : mealPlans).length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-neutral-400 text-sm">
                      No items found. Add one above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
