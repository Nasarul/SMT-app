import React, { useState, useEffect } from 'react';
import { Plane, Plus, Search, Download, CreditCard as Edit2, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate, getStatusColor, AIRLINES_FROM_DAC, IATA_AIRPORTS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Ticket {
  id: string;
  ticket_number: string;
  passenger_name: string;
  passport_number: string;
  airline: string;
  pnr: string;
  origin: string;
  destination: string;
  travel_date: string;
  cabin_class: string;
  base_fare: number;
  tax_amount: number;
  ait_amount: number;
  service_charge: number;
  total_fare: number;
  cost_fare: number;
  profit: number;
  status: string;
  created_at: string;
  supplier_id?: string;
  suppliers?: { company_name: string };
}

interface Supplier {
  id: string;
  company_name: string;
}

const emptyForm = {
  ticket_number: '', passenger_name: '', passport_number: '', airline: '', pnr: '',
  origin: 'DAC', destination: '', travel_date: '', return_date: '',
  cabin_class: 'economy', base_fare: 0, total_fare_input: 0, ut: 0, bd: 0, e5: 0, commission_rate: 7, tax_amount: 0, ait_amount: 0,
  service_charge: 0, cost_fare: 0, status: 'issued',
  supplier_id: '',
};

export function IndividualTicketPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [gdsText, setGdsText] = useState('');
  const [needsRecalc, setNeedsRecalc] = useState(false);

  // Dynamic Lists
  const [airlineList, setAirlineList] = useState<string[]>(AIRLINES_FROM_DAC);
  const [airportList, setAirportList] = useState<{ code: string; name: string; city: string }[]>(IATA_AIRPORTS);

  useEffect(() => { 
    loadTickets(); 
    loadMasterData();
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('id, company_name').order('company_name');
    setSuppliers(data || []);
  };

  const loadMasterData = async () => {
    try {
      const { data } = await supabase.from('settings').select('*').in('key', ['airline_list', 'airport_list']);
      const airlines = data?.find(s => s.key === 'airline_list')?.value;
      const airports = data?.find(s => s.key === 'airport_list')?.value;
      if (airlines) setAirlineList(airlines);
      if (airports) setAirportList(airports);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('air_tickets')
      .select('*, suppliers(company_name)')
      .eq('ticket_type', 'individual')
      .order('created_at', { ascending: false });
    setTickets(data || []);
    setLoading(false);
  };

  const getFareData = (fData: any = form) => {
    const base = Math.max(0, Number(fData.base_fare) || 0);
    const total_input = Math.max(0, Number(fData.total_fare_input) || 0);
    const ut = Math.max(0, Number(fData.ut) || 0);
    const bd = Math.max(0, Number(fData.bd) || 0);
    const e5 = Math.max(0, Number(fData.e5) || 0);
    const comm_rate = Math.max(0, Number(fData.commission_rate) || 0);
    const svc = Math.max(0, Number(fData.service_charge) || 0);

    const tax_ait = total_input - base;
    const vat = (total_input - (ut + bd + e5)) * 0.03;
    const commission = base * (comm_rate / 100);
    const total_commission = total_input - (commission + tax_ait + vat);
    const net_commission = total_commission - commission;
    const total_client_fare = total_input + svc;
    const net_profit = net_commission + svc;
    
    return { base, total_input, ut, bd, e5, comm_rate, svc, tax_ait, vat, commission, total_commission, net_commission, total_client_fare, net_profit };
  };

  const [fareData, setFareData] = useState(() => getFareData(emptyForm));

  const handleRecalculate = () => {
    setFareData(getFareData(form));
    setNeedsRecalc(false);
  };

  const handleSave = async () => {
    if (needsRecalc) {
      setError('Please click Recalculate before saving.');
      return;
    }
    if (!form.passenger_name || !form.airline || !form.origin || !form.destination || !form.travel_date) {
      setError('Please fill all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    
    const cost_fare = fareData.total_client_fare - fareData.net_profit;

    const payload = {
      ticket_number: form.ticket_number,
      passenger_name: form.passenger_name,
      passport_number: form.passport_number,
      airline: form.airline,
      pnr: form.pnr,
      origin: form.origin,
      destination: form.destination,
      travel_date: form.travel_date,
      return_date: form.return_date || null,
      cabin_class: form.cabin_class,
      base_fare: fareData.base,
      tax_amount: fareData.vat,
      ait_amount: fareData.tax_ait,
      service_charge: fareData.svc,
      total_fare: fareData.total_client_fare,
      cost_fare: cost_fare,
      profit: fareData.net_profit,
      status: form.status,
      supplier_id: form.supplier_id || null,
      ticket_type: 'individual',
      sales_agent_id: profile?.id,
    };

    const { error: err } = await supabase.from('air_tickets').insert([payload]);
    if (err) {
      setError(err.message);
    } else {
      setSuccess('Ticket issued successfully!');
      setShowForm(false);
      setForm(emptyForm);
      loadTickets();
    }
    setSaving(false);
  };

  const filtered = tickets.filter(t =>
    t.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.pnr?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.airline?.toLowerCase().includes(search.toLowerCase())
  );

  const fareFields = ['base_fare', 'total_fare_input', 'ut', 'bd', 'e5', 'commission_rate', 'service_charge'];
  const f = (field: string, val: any) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (fareFields.includes(field)) setNeedsRecalc(true);
  };

  const parseGDS = () => {
    const text = gdsText;
    const newData = { ...emptyForm };

    const nameMatch = text.match(/NAME:\s*([A-Z/,\s]+)/i) || 
                     text.match(/PASSENGER NAME:\s*([A-Z/,\s]+)/i) ||
                     text.match(/PREPARED FOR\s*([A-Z/,\s]+)/i);
    if (nameMatch) newData.passenger_name = nameMatch[1].trim();

    const pnrMatch = text.match(/BOOKING REF\s*:\s*AMADEUS:\s*([A-Z0-9]{6})/i) || 
                    text.match(/RESERVATION CODE\s*:\s*([A-Z0-9]{6})/i) ||
                    text.match(/RESERVATION NUMBER:\s*([A-Z0-9]{6})/i);
    if (pnrMatch) newData.pnr = pnrMatch[1].trim().toUpperCase();

    const tktMatch = text.match(/TICKET NUMBER\s*:?\s*([0-9\s-]{10,20})/i) || 
                    text.match(/ETKT\s*([0-9\s-]{10,20})/i);
    if (tktMatch) newData.ticket_number = tktMatch[1].replace(/[\s-]/g, '').trim();

    const totalMatch = text.match(/TOTAL\s*:\s*BDT\s*(\d+)/i) || 
                      text.match(/TOTAL\s*BDT\s*(\d+)/i);
    if (totalMatch) {
      const total = parseInt(totalMatch[1]);
      newData.base_fare = Math.round(total * 0.85);
      newData.total_fare_input = total;
    }

    const utMatch = text.match(/UT\s*:?\s*(\d+)/i) || text.match(/(\d+)\s*UT/i);
    if (utMatch) newData.ut = parseInt(utMatch[1]);

    const bdMatch = text.match(/BD\s*:?\s*(\d+)/i) || text.match(/(\d+)\s*BD/i);
    if (bdMatch) newData.bd = parseInt(bdMatch[1]);

    const e5Match = text.match(/E5\s*:?\s*(\d+)/i) || text.match(/(\d+)\s*E5/i);
    if (e5Match) newData.e5 = parseInt(e5Match[1]);

    setForm(prev => {
      const nextForm = { ...prev, ...newData };
      setFareData(getFareData(nextForm));
      setNeedsRecalc(false);
      return nextForm;
    });
    setShowImportModal(false);
    setGdsText('');
    setShowForm(true);
    setSuccess('Data parsed from GDS successfully! Please verify fields.');
  };

  return (
    <div className="p-4 lg:p-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Individual Air Tickets</h2>
          <p className="text-sm text-neutral-500">Retail ticket sales management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImportModal(true)} className="btn-outline flex items-center gap-2">
            <Download size={16} /> Import GDS PDF/Text
          </button>
          <button onClick={() => { setShowForm(true); setError(''); setSuccess(''); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Issue New Ticket
          </button>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name, PNR, ticket number, airline..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-40">
          <option value="">All Status</option>
          <option value="issued">Issued</option>
          <option value="voided">Voided</option>
          <option value="refunded">Refunded</option>
          <option value="reissued">Reissued</option>
        </select>
        <button className="btn-outline flex items-center gap-2 whitespace-nowrap">
          <Download size={15} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Ticket #</th>
                <th className="table-header text-left">Passenger</th>
                <th className="table-header text-left">Route</th>
                <th className="table-header text-left">Airline</th>
                <th className="table-header text-left">Supplier</th>
                <th className="table-header text-left">Travel Date</th>
                <th className="table-header text-right">Total Fare</th>
                <th className="table-header text-right">Profit</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="py-12 text-center text-neutral-400 text-sm">Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <EmptyState
                    icon={Plane}
                    title="No tickets found"
                    description="Issue your first ticket to get started"
                  />
                </td></tr>
              )}
              {filtered.map(ticket => (
                <tr key={ticket.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="table-cell">
                    <span className="text-xs font-mono text-primary-600">{ticket.ticket_number}</span>
                  </td>
                  <td className="table-cell">
                    <div className="font-medium text-neutral-800">{ticket.passenger_name}</div>
                    <div className="text-xs text-neutral-400">{ticket.passport_number}</div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-mono font-semibold text-primary-600">{ticket.origin}</span>
                      <Plane size={12} className="text-neutral-400 rotate-90" />
                      <span className="font-mono font-semibold text-primary-600">{ticket.destination}</span>
                    </div>
                    {ticket.pnr && <div className="text-xs text-neutral-400">PNR: {ticket.pnr}</div>}
                  </td>
                  <td className="table-cell text-sm">{ticket.airline}</td>
                  <td className="table-cell">
                    <div className="text-xs font-medium text-neutral-600">{ticket.suppliers?.company_name || 'Direct'}</div>
                  </td>
                  <td className="table-cell text-sm">{formatDate(ticket.travel_date)}</td>
                  <td className="table-cell text-right font-semibold text-neutral-800">{formatBDT(ticket.total_fare)}</td>
                  <td className={`table-cell text-right font-semibold text-sm ${ticket.profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                    {formatBDT(ticket.profit)}
                  </td>
                  <td className="table-cell text-center">
                    <Badge variant={getStatusColor(ticket.status) as any}>{ticket.status}</Badge>
                  </td>
                  <td className="table-cell text-right">
                    <button 
                      onClick={() => {
                        const text = `✈️ *Flight Details - ${ticket.airline}*\n\n👤 Passenger: ${ticket.passenger_name}\n🎫 Ticket #: ${ticket.ticket_number}\n🔢 PNR: ${ticket.pnr}\n📍 Route: ${ticket.origin} -> ${ticket.destination}\n📅 Date: ${formatDate(ticket.travel_date)}\n\n_Thank you for choosing Sonar Madina Travels!_`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="p-1.5 hover:bg-success-50 text-success-600 rounded-lg transition-colors"
                      title="Share on WhatsApp"
                    >
                      <MessageSquare size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Ticket Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Issue New Air Ticket" size="xl">
        <div className="p-5 flex flex-col gap-4">
          {error && (
            <div className="flex gap-2 p-2 bg-error-50 border border-error-200 text-error-700 rounded-lg text-[11px]">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Row 1: Passenger & Route Information */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Passenger Name *</label>
              <input className="input-field py-1.5 px-2.5 text-xs" value={form.passenger_name} onChange={e => f('passenger_name', e.target.value)} placeholder="As per passport" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Passport</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono uppercase" value={form.passport_number} onChange={e => f('passport_number', e.target.value.toUpperCase())} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">PNR *</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono uppercase" value={form.pnr} onChange={e => f('pnr', e.target.value.toUpperCase())} placeholder="6-char PNR" />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Ticket Number</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono" value={form.ticket_number || ''} onChange={e => f('ticket_number', e.target.value)} placeholder="13-digit" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Source</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.supplier_id} onChange={e => f('supplier_id', e.target.value)}>
                <option value="">Direct / GDS</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.company_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Flight Details */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Airline *</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.airline} onChange={e => f('airline', e.target.value)}>
                <option value="">Select airline</option>
                {airlineList.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Origin</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.origin} onChange={e => f('origin', e.target.value)}>
                {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Destination</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.destination} onChange={e => f('destination', e.target.value)}>
                <option value="">Select</option>
                {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Travel Date *</label>
              <input type="date" className="input-field py-1.5 px-2.5 text-xs" value={form.travel_date} onChange={e => f('travel_date', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Return Date</label>
              <input type="date" className="input-field py-1.5 px-2.5 text-xs" value={form.return_date} onChange={e => f('return_date', e.target.value)} />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Class</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.cabin_class} onChange={e => f('cabin_class', e.target.value)}>
                <option value="economy">Economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </div>
          </div>

          {/* Row 3: Fare Inputs */}
          <div className="grid grid-cols-7 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Base Fare *</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold text-neutral-800" value={form.base_fare} onChange={e => f('base_fare', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Total Fare *</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold text-neutral-800" value={form.total_fare_input} onChange={e => f('total_fare_input', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">UT</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs" value={form.ut} onChange={e => f('ut', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">BD</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs" value={form.bd} onChange={e => f('bd', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">E5</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs" value={form.e5} onChange={e => f('e5', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Comm. (%)</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs" value={form.commission_rate} onChange={e => f('commission_rate', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Service Chg</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold" value={form.service_charge} onChange={e => f('service_charge', e.target.value)} />
            </div>
          </div>

          {/* Row 4: Calculations & Totals */}
          <div className="flex justify-between items-end mb-2 mt-4">
             <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Calculation Results</h3>
             <button 
                onClick={handleRecalculate}
                disabled={!needsRecalc}
                className={`py-1.5 px-4 text-xs font-bold rounded-lg transition-colors shadow-sm ${needsRecalc ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
             >
               {needsRecalc ? 'Click to Recalculate' : 'Up to date'}
             </button>
          </div>
          <div className={`flex flex-col md:flex-row gap-4 p-3 rounded-xl border transition-all ${needsRecalc ? 'bg-neutral-50 border-neutral-200 opacity-60' : 'bg-primary-50/50 border-primary-100'}`}>
            <div className="flex-1 grid grid-cols-4 gap-2">
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${needsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${needsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>Tax/AIT</span>
                <span className={`text-xs font-bold ${needsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{needsRecalc ? '---' : formatBDT(fareData.tax_ait)}</span>
              </div>
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${needsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${needsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>VAT</span>
                <span className={`text-xs font-bold ${needsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{needsRecalc ? '---' : formatBDT(fareData.vat)}</span>
              </div>
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${needsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${needsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>Total Comm.</span>
                <span className={`text-xs font-bold ${needsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{needsRecalc ? '---' : formatBDT(fareData.total_commission)}</span>
              </div>
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${needsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${needsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>Net Comm.</span>
                <span className={`text-xs font-bold ${needsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{needsRecalc ? '---' : formatBDT(fareData.net_commission)}</span>
              </div>
            </div>
            
            <div className="flex items-stretch gap-2 shrink-0">
              <div className={`px-5 py-2 rounded-lg text-right flex flex-col justify-center shadow-sm ${needsRecalc ? 'bg-neutral-300 text-neutral-500' : 'bg-primary-600 text-white'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${needsRecalc ? 'text-neutral-400' : 'text-primary-200'}`}>Client Fare</span>
                <span className="text-sm font-black">{needsRecalc ? '---' : formatBDT(fareData.total_client_fare)}</span>
              </div>
              <div className={`px-5 py-2 rounded-lg text-right flex flex-col justify-center shadow-sm ${needsRecalc ? 'bg-neutral-300 text-neutral-500' : 'bg-success-600 text-white'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${needsRecalc ? 'text-neutral-400' : 'text-success-200'}`}>Net Profit</span>
                <span className="text-sm font-black">{needsRecalc ? '---' : formatBDT(fareData.net_profit)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-neutral-100 mt-1">
            <button onClick={() => setShowForm(false)} className="btn-ghost py-2 px-6 text-xs font-bold">Discard</button>
            <button onClick={handleSave} disabled={saving || needsRecalc} className={`py-2 px-8 text-xs font-bold flex items-center justify-center gap-2 rounded-lg transition-colors ${needsRecalc ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' : 'btn-primary'}`}>
              {saving ? 'Processing...' : (needsRecalc ? 'Recalculate First' : 'Issue Ticket & Save Account')}
            </button>
          </div>
        </div>
      </Modal>

      {/* GDS Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Ticket from GDS (Amadeus/Sabre/Galileo)">
        <div className="p-5 space-y-4">
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
            <p className="text-sm text-primary-800 leading-relaxed">
              <strong>How to use:</strong> Open your GDS PDF, select all text (Ctrl+A), copy it (Ctrl+C), and paste it into the box below. The system will automatically extract passenger, flight, and fare details.
            </p>
          </div>
          <div>
            <label className="label">Paste GDS Report Text *</label>
            <textarea 
              className="input-field min-h-[200px] font-mono text-xs leading-normal" 
              placeholder="NAME: RAHMAN/SAYEDUR... TICKET: 779..."
              value={gdsText}
              onChange={e => setGdsText(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowImportModal(false)} className="btn-ghost flex-1">Cancel</button>
            <button 
              onClick={parseGDS} 
              disabled={!gdsText.trim()} 
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              Analyze & Sync
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
