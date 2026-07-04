import React, { useState, useEffect } from 'react';
import { MapPin, Users, DollarSign, Calendar, Search, Plus, Filter, CheckCircle, XCircle, Clock, MoreVertical, CreditCard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatBDT, formatDate } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

interface TourBooking {
  id: string;
  tour_id: string;
  customer_id: string;
  booking_date: string;
  participants: number;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes: string;
  tours?: {
    tour_name: string;
    destination: string;
    departure_date: string;
  };
  customers?: {
    full_name: string;
    mobile: string;
  };
}

interface Tour {
  id: string;
  tour_name: string;
  price_per_person: number;
}

interface Customer {
  id: string;
  full_name: string;
}

export function TourBookingsPage() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<TourBooking[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    tour_id: '',
    customer_id: '',
    participants: 1,
    total_amount: 0,
    paid_amount: 0,
    status: 'pending' as const,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: bookingData } = await supabase
        .from('tour_bookings')
        .select('*, tours(tour_name, destination, departure_date), customers(full_name, mobile)')
        .order('booking_date', { ascending: false });

      const { data: tourData } = await supabase.from('tours').select('id, tour_name, price_per_person').eq('status', 'active');
      const { data: custData } = await supabase.from('customers').select('id, full_name');

      setBookings(bookingData || []);
      setTours(tourData || []);
      setCustomers(custData || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTourChange = (tourId: string) => {
    const tour = tours.find(t => t.id === tourId);
    if (tour) {
      setForm({
        ...form,
        tour_id: tourId,
        total_amount: tour.price_per_person * form.participants
      });
    }
  };

  const handleParticipantsChange = (count: number) => {
    const tour = tours.find(t => t.id === form.tour_id);
    setForm({
      ...form,
      participants: count,
      total_amount: tour ? tour.price_per_person * count : 0
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('tour_bookings').insert([form]);
      if (error) throw error;
      setShowAddModal(false);
      loadData();
    } catch (err) {
      console.error('Error saving booking:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      await supabase.from('tour_bookings').update({ status }).eq('id', id);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filtered = bookings.filter(b => 
    b.customers?.full_name.toLowerCase().includes(search.toLowerCase()) ||
    b.tours?.tour_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tour Bookings</h2>
          <p className="text-sm text-neutral-500">Manage participant lists and payments for tour packages</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> New Booking
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Bookings', value: bookings.length, icon: Users, color: 'text-primary-600' },
          { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, icon: CheckCircle, color: 'text-success-600' },
          { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, icon: Clock, color: 'text-warning-600' },
          { label: 'Total Revenue', value: formatBDT(bookings.reduce((sum, b) => sum + Number(b.total_amount), 0)), icon: DollarSign, color: 'text-secondary-600' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-50 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <div className="text-xs text-neutral-400 font-semibold uppercase">{stat.label}</div>
                <div className="text-lg font-bold text-neutral-800">{stat.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            className="input-field pl-9" 
            placeholder="Search by customer or tour name..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-xs py-1.5"><Filter size={14} className="inline mr-1" /> Filters</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Booking Info</th>
                <th className="table-header text-left">Tour Details</th>
                <th className="table-header text-center">Participants</th>
                <th className="table-header text-right">Payment</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-neutral-400">Loading bookings...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState 
                      icon={MapPin} 
                      title="No bookings found" 
                      description="Start by adding a new tour booking for a customer."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map(booking => (
                  <tr key={booking.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="font-medium text-neutral-800">{booking.customers?.full_name}</div>
                      <div className="text-xs text-neutral-400">{booking.customers?.mobile}</div>
                      <div className="text-[10px] text-neutral-300 mt-1 uppercase font-bold">Booked: {formatDate(booking.booking_date)}</div>
                    </td>
                    <td className="table-cell">
                      <div className="text-sm font-semibold text-primary-700">{booking.tours?.tour_name}</div>
                      <div className="text-xs text-neutral-500 flex items-center gap-1">
                        <MapPin size={10} /> {booking.tours?.destination}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">Travels on {formatDate(booking.tours?.departure_date)}</div>
                    </td>
                    <td className="table-cell text-center">
                      <Badge variant="neutral" className="px-3">
                        {booking.participants} Person{booking.participants > 1 ? 's' : ''}
                      </Badge>
                    </td>
                    <td className="table-cell text-right">
                      <div className="text-sm font-bold text-neutral-800">{formatBDT(booking.total_amount)}</div>
                      <div className="text-xs">
                        {booking.paid_amount >= booking.total_amount ? (
                          <span className="text-success-600 font-medium">Fully Paid</span>
                        ) : (
                          <span className="text-warning-600">Paid: {formatBDT(booking.paid_amount)}</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <Badge variant={booking.status === 'confirmed' ? 'success' : booking.status === 'cancelled' ? 'error' : 'warning'}>
                        {booking.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-1">
                        {booking.status === 'pending' && (
                          <button 
                            onClick={() => updateStatus(booking.id, 'confirmed')}
                            className="p-1.5 rounded-lg hover:bg-success-50 text-success-600"
                            title="Confirm Booking"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Booking Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        title="New Tour Booking"
        size="lg"
      >
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Customer *</label>
              <select 
                className="input-field"
                value={form.customer_id}
                onChange={e => setForm({...form, customer_id: e.target.value})}
              >
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Select Tour Package *</label>
              <select 
                className="input-field"
                value={form.tour_id}
                onChange={e => handleTourChange(e.target.value)}
              >
                <option value="">Select a tour</option>
                {tours.map(t => <option key={t.id} value={t.id}>{t.tour_name} ({formatBDT(t.price_per_person)}/person)</option>)}
              </select>
            </div>
            <div>
              <label className="label">Number of Participants</label>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleParticipantsChange(Math.max(1, form.participants - 1))}
                  className="w-10 h-10 border border-neutral-200 rounded-lg flex items-center justify-center hover:bg-neutral-50"
                >-</button>
                <input 
                  type="number" 
                  className="input-field text-center" 
                  value={form.participants}
                  onChange={e => handleParticipantsChange(parseInt(e.target.value) || 1)}
                />
                <button 
                  onClick={() => handleParticipantsChange(form.participants + 1)}
                  className="w-10 h-10 border border-neutral-200 rounded-lg flex items-center justify-center hover:bg-neutral-50"
                >+</button>
              </div>
            </div>
            <div>
              <label className="label">Total Amount (BDT)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm font-bold">৳</span>
                <input className="input-field pl-8 font-bold bg-neutral-50" value={form.total_amount} readOnly />
              </div>
            </div>
            <div>
              <label className="label">Initial Paid Amount</label>
              <div className="relative">
                <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input 
                  type="number" 
                  className="input-field pl-9" 
                  value={form.paid_amount}
                  onChange={e => setForm({...form, paid_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            <div>
              <label className="label">Booking Status</label>
              <select 
                className="input-field"
                value={form.status}
                onChange={e => setForm({...form, status: e.target.value as any})}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea 
                className="input-field" 
                rows={3} 
                placeholder="Any special requests or requirements..."
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              onClick={() => setShowAddModal(false)}
              className="btn-ghost flex-1"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving || !form.tour_id || !form.customer_id}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
