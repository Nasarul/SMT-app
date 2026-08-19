import { useState, useEffect } from 'react';
import { Building2, Plus, Search, AlertCircle, CheckCircle, Plane, Ticket as TicketIcon } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatBDT, formatDate, AIRLINES_FROM_DAC, IATA_AIRPORTS } from '../../lib/constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface B2BAgent {
  id: string;
  agency_name: string;
  contact_person: string;
  mobile: string;
  credit_limit: number;
  current_balance: number;
  commission_rate: number;
  atab_number: string;
  is_active: boolean;
}

interface Ticket {
  id: string;
  ticket_number: string;
  passenger_name: string;
  airline: string;
  pnr: string;
  origin: string;
  destination: string;
  travel_date: string;
  total_fare: number;
  profit: number;
  status: string;
  b2b_agents?: { agency_name: string };
  suppliers?: { company_name: string };
  supplier_id?: string;
}

interface Supplier {
  id: string;
  company_name: string;
}

const emptyAgentForm = {
  agency_name: '', trade_license: '', atab_number: '', toab_number: '',
  contact_person: '', mobile: '', email: '', address: '',
  credit_limit: 100000, commission_rate: 2.5,
};

const emptyGroupForm = {
  b2b_agent_id: '', passenger_name: '', ticket_number: '', airline: '', pnr: '',
  origin: 'DAC', destination: '', travel_date: '', cabin_class: 'economy',
  base_fare: 0, tax_amount: 0, service_charge: 300, cost_fare: 0,
  supplier_id: '',
};

export function B2BTicketPage() {
  const { profile } = useAuth();
  const [agents, setAgents] = useState<B2BAgent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTab, setActiveTab] = useState<'tickets' | 'agents'>('tickets');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [ticketForm, setTicketForm] = useState(emptyGroupForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Dynamic Lists
  const [airlineList, setAirlineList] = useState<string[]>(AIRLINES_FROM_DAC);
  const [airportList, setAirportList] = useState<{ code: string; name: string; city: string }[]>(IATA_AIRPORTS);

  useEffect(() => { 
    loadData(); 
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

  const loadData = async () => {
    setLoading(true);
    const [agentsRes, ticketsRes] = await Promise.all([
      supabase.from('b2b_agents').select('*').order('agency_name'),
      supabase.from('air_tickets').select('*, b2b_agents(agency_name), suppliers(company_name)').eq('ticket_type', 'b2b_group').order('created_at', { ascending: false })
    ]);
    setAgents(agentsRes.data || []);
    setTickets(ticketsRes.data || []);
    setLoading(false);
  };

  const handleSaveAgent = async () => {
    if (!agentForm.agency_name || !agentForm.contact_person || !agentForm.mobile) {
      setError('Agency name, contact person and mobile are required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('b2b_agents').insert([agentForm]);
    if (err) { setError(err.message); } else {
      setSuccess('B2B agent registered!');
      setShowAgentForm(false);
      setAgentForm(emptyAgentForm);
      loadData();
    }
    setSaving(false);
  };

  const handleSaveTicket = async () => {
    if (!ticketForm.b2b_agent_id || !ticketForm.passenger_name || !ticketForm.airline || !ticketForm.destination || !ticketForm.travel_date) {
      setError('Please fill all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    const lines = ticketForm.passenger_name.split('\n').map(n => n.trim()).filter(n => n !== '');
    const total = Number(ticketForm.base_fare) + Number(ticketForm.tax_amount) + Number(ticketForm.service_charge);
    const profit = total - Number(ticketForm.cost_fare);
    
    // Parse range if present
    let rangeTickets: string[] = [];
    if (ticketForm.ticket_number.includes('-')) {
      const [start, endPart] = ticketForm.ticket_number.split('-').map(s => s.trim());
      if (/^\d+$/.test(start) && /^\d+$/.test(endPart)) {
        const prefix = start.slice(0, start.length - endPart.length);
        const startNum = BigInt(start);
        const endNum = BigInt(prefix + endPart);
        const count = Number(endNum - startNum) + 1;
        if (count > 0 && count <= 200) {
          for (let i = 0n; i < BigInt(count); i++) {
            rangeTickets.push((startNum + i).toString());
          }
        }
      }
    }

    const ticketsToInsert = lines.map((line, index) => {
      const [name, tktNum] = line.split('|').map(s => s.trim());
      return {
        ...ticketForm,
        passenger_name: name,
        ticket_number: tktNum || rangeTickets[index] || ticketForm.ticket_number,
        supplier_id: ticketForm.supplier_id || null,
        ticket_type: 'b2b_group',
        total_fare: total,
        profit,
        sales_agent_id: profile?.id,
      };
    });

    const { error: err } = await supabase.from('air_tickets').insert(ticketsToInsert);
    if (err) { setError(err.message); } else {
      setSuccess('Group ticket issued!');
      setShowTicketForm(false);
      setTicketForm(emptyGroupForm);
      loadData();
    }
    setSaving(false);
  };

  const filteredAgents = agents.filter(a =>
    a.agency_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTickets = tickets.filter(t =>
    t.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.pnr?.toLowerCase().includes(search.toLowerCase()) ||
    t.b2b_agents?.agency_name?.toLowerCase().includes(search.toLowerCase())
  );

  const af = (f: string, v: any) => setAgentForm(prev => ({ ...prev, [f]: v }));
  const tf = (f: string, v: any) => setTicketForm(prev => ({ ...prev, [f]: v }));

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end gap-2 mb-4">
        <button onClick={() => { setShowTicketForm(true); setError(''); }} className="btn-outline flex items-center gap-2 bg-white">
          <Plus size={16} /> Issue Group Ticket
        </button>
        <button onClick={() => { setShowAgentForm(true); setError(''); }} className="btn-primary flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
          <Building2 size={16} /> Register Agency
        </button>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b border-neutral-100">
        <button 
          onClick={() => setActiveTab('tickets')}
          className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'tickets' ? 'text-primary-600' : 'text-neutral-400 hover:text-neutral-600'}`}
        >
          <div className="flex items-center gap-2">
            <TicketIcon size={16} /> B2B Group Tickets
          </div>
          {activeTab === 'tickets' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('agents')}
          className={`pb-2 px-1 text-sm font-medium transition-colors relative ${activeTab === 'agents' ? 'text-primary-600' : 'text-neutral-400 hover:text-neutral-600'}`}
        >
          <div className="flex items-center gap-2">
            <Building2 size={16} /> Partner Agencies
          </div>
          {activeTab === 'agents' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />}
        </button>
      </div>

      {/* Search */}
      <div className="card p-4 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            className="input-field pl-9" 
            placeholder={activeTab === 'tickets' ? "Search by passenger, PNR or agency..." : "Search agencies..."} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading...</div>
      ) : activeTab === 'tickets' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="table-header text-left">Ticket Info</th>
                  <th className="table-header text-left">Passenger</th>
                  <th className="table-header text-left">Buyer Agency</th>
                  <th className="table-header text-left">Supplier</th>
                  <th className="table-header text-left">Route</th>
                  <th className="table-header text-right">Total Fare</th>
                  <th className="table-header text-right">Profit</th>
                  <th className="table-header text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 ? (
                  <tr><td colSpan={7} className="py-12"><EmptyState icon={TicketIcon} title="No tickets found" description="Issue a B2B ticket to see it here" /></td></tr>
                ) : (
                  filteredTickets.map(ticket => (
                    <tr key={ticket.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                      <td className="table-cell">
                        <div className="text-xs font-mono text-primary-600">{ticket.ticket_number || 'PENDING'}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{ticket.airline} · {ticket.pnr}</div>
                      </td>
                      <td className="table-cell">
                        <div className="font-medium text-neutral-800">{ticket.passenger_name}</div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm text-neutral-600">{ticket.b2b_agents?.agency_name}</div>
                      </td>
                      <td className="table-cell">
                        <div className="text-xs text-neutral-400 font-medium italic">{ticket.suppliers?.company_name || 'Direct'}</div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 uppercase">
                          {ticket.origin} <Plane size={10} className="text-neutral-400 rotate-90" /> {ticket.destination}
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{formatDate(ticket.travel_date)}</div>
                      </td>
                      <td className="table-cell text-right font-mono text-sm font-semibold">
                        {formatBDT(ticket.total_fare)}
                      </td>
                      <td className="table-cell text-right">
                        <span className={`font-mono text-xs font-bold ${ticket.profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                          {formatBDT(ticket.profit)}
                        </span>
                      </td>
                      <td className="table-cell text-center">
                        <Badge variant="primary" className="text-[10px] uppercase">{ticket.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Agencies Table */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="table-header text-left">Agency Partner</th>
                  <th className="table-header text-left">Contact Info</th>
                  <th className="table-header text-right">Credit Limit</th>
                  <th className="table-header text-right">Commission</th>
                  <th className="table-header text-center">Status</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.length === 0 ? (
                  <tr><td colSpan={6} className="py-12"><EmptyState icon={Building2} title="No agencies found" description="Register a B2B partner agency" /></td></tr>
                ) : (
                  filteredAgents.map(agent => (
                    <tr key={agent.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center shrink-0">
                            <Building2 size={16} className="text-secondary-600" />
                          </div>
                          <div className="font-medium text-neutral-800">{agent.agency_name}</div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-medium text-neutral-700">{agent.contact_person}</div>
                        <div className="text-xs text-neutral-400 mt-0.5">{agent.mobile}</div>
                      </td>
                      <td className="table-cell text-right font-mono text-sm">
                        {formatBDT(agent.credit_limit)}
                      </td>
                      <td className="table-cell text-right text-sm">
                        {agent.commission_rate}%
                      </td>
                      <td className="table-cell text-center">
                        <Badge variant={agent.is_active ? 'success' : 'neutral'}>
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => { setTicketForm(prev => ({ ...prev, b2b_agent_id: agent.id })); setShowTicketForm(true); }}
                          className="btn-primary text-[10px] py-1 px-2"
                        >
                          Issue Ticket
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Agency Modal */}
      <Modal isOpen={showAgentForm} onClose={() => setShowAgentForm(false)} title="Register B2B Partner Agency">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          <div className="form-grid">
            <div className="sm:col-span-2">
              <label className="label">Agency Name *</label>
              <input className="input-field" value={agentForm.agency_name} onChange={e => af('agency_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Trade License</label>
              <input className="input-field" value={agentForm.trade_license} onChange={e => af('trade_license', e.target.value)} />
            </div>
            <div>
              <label className="label">ATAB Number</label>
              <input className="input-field" value={agentForm.atab_number} onChange={e => af('atab_number', e.target.value)} />
            </div>
            <div>
              <label className="label">TOAB Number</label>
              <input className="input-field" value={agentForm.toab_number} onChange={e => af('toab_number', e.target.value)} />
            </div>
            <div>
              <label className="label">Contact Person *</label>
              <input className="input-field" value={agentForm.contact_person} onChange={e => af('contact_person', e.target.value)} />
            </div>
            <div>
              <label className="label">Mobile *</label>
              <input className="input-field" value={agentForm.mobile} onChange={e => af('mobile', e.target.value)} placeholder="01XXXXXXXXX" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={agentForm.email} onChange={e => af('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Credit Limit (BDT)</label>
              <input type="number" className="input-field" value={agentForm.credit_limit} onChange={e => af('credit_limit', e.target.value)} />
            </div>
            <div>
              <label className="label">Commission Rate (%)</label>
              <input type="number" step="0.5" className="input-field" value={agentForm.commission_rate} onChange={e => af('commission_rate', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input className="input-field" value={agentForm.address} onChange={e => af('address', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAgentForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSaveAgent} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving...' : 'Register Agency'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showTicketForm} onClose={() => setShowTicketForm(false)} title="Issue B2B Group Ticket" size="xl">
        <div className="flex flex-col lg:flex-row max-h-[85vh]">
          {/* Left Column: Details & Flight */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-neutral-100 bg-neutral-50/30">
            {error && (
              <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm mb-4">
                <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
              </div>
            )}
            <div className="space-y-6">
              {/* Agency Section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-primary-500 rounded-full" />
                  <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Booking Core</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">B2B Agency Partner *</label>
                    <select className="input-field bg-white" value={ticketForm.b2b_agent_id} onChange={e => tf('b2b_agent_id', e.target.value)}>
                      <option value="">Select agency</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.agency_name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Purchase Source (Supplier) *</label>
                    <select className="input-field bg-white" value={ticketForm.supplier_id} onChange={e => tf('supplier_id', e.target.value)}>
                      <option value="">Direct / GDS</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                    </select>
                  </div>
                </div>
              </section>

              {/* Flight Section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 bg-secondary-500 rounded-full" />
                  <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Flight Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Airline *</label>
                    <select className="input-field bg-white" value={ticketForm.airline} onChange={e => tf('airline', e.target.value)}>
                      <option value="">Select airline</option>
                      {airlineList.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">PNR</label>
                    <input className="input-field bg-white font-mono" value={ticketForm.pnr} onChange={e => tf('pnr', e.target.value.toUpperCase())} placeholder="6-digit PNR" />
                  </div>
                  <div>
                    <label className="label">Origin</label>
                    <select className="input-field bg-white" value={ticketForm.origin} onChange={e => tf('origin', e.target.value)}>
                      {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code} — {ap.city}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Destination *</label>
                    <select className="input-field bg-white" value={ticketForm.destination} onChange={e => tf('destination', e.target.value)}>
                      <option value="">Select</option>
                      {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code} — {ap.city}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Travel Date *</label>
                    <input type="date" className="input-field bg-white" value={ticketForm.travel_date} onChange={e => tf('travel_date', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Cabin Class</label>
                    <select className="input-field bg-white" value={ticketForm.cabin_class} onChange={e => tf('cabin_class', e.target.value)}>
                      <option value="economy">Economy</option>
                      <option value="business">Business</option>
                      <option value="first">First Class</option>
                    </select>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Right Column: Passengers & Financials */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Passengers Section */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-success-500 rounded-full" />
                    <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-wider">Passenger Management</h3>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-primary-50 text-primary-600 rounded-md border border-primary-100">
                      Names: {ticketForm.passenger_name.split('\n').filter(l => l.trim()).length}
                    </span>
                    {ticketForm.ticket_number.includes('-') && (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-success-50 text-success-600 rounded-md border border-success-100">
                        Range: {(() => {
                          const [s, e] = ticketForm.ticket_number.split('-').map(x => x.trim());
                          if (!/^\d+$/.test(s) || !/^\d+$/.test(e)) return 0;
                          const start = BigInt(s);
                          const end = BigInt(s.slice(0, s.length - e.length) + e);
                          return Number(end - start) + 1;
                        })()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="label">Passenger List (Name | Ticket Number) *</label>
                    <textarea 
                      className="input-field min-h-[140px] py-2 resize-none leading-relaxed text-sm bg-white border-neutral-200 focus:border-primary-500" 
                      value={ticketForm.passenger_name} 
                      onChange={e => tf('passenger_name', e.target.value)} 
                      placeholder="Enter names (one per line)...&#10;Example: Md. Hasan | 7792415123"
                    />
                  </div>
                  <div>
                    <label className="label">Ticket Serial Range (Optional)</label>
                    <input className="input-field font-mono bg-white" value={ticketForm.ticket_number} onChange={e => tf('ticket_number', e.target.value)} placeholder="e.g. 789...455-459" />
                  </div>
                </div>
              </section>

              {/* Financials Section */}
              <section className="p-4 bg-neutral-900 rounded-xl text-white">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-primary-400 rounded-full" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Financial Breakdown</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest block mb-1">Base Fare</label>
                    <input type="number" className="w-full bg-neutral-800 border-0 rounded-lg px-3 py-2 text-white font-mono focus:ring-1 focus:ring-primary-500" value={ticketForm.base_fare} onChange={e => tf('base_fare', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest block mb-1">Tax</label>
                    <input type="number" className="w-full bg-neutral-800 border-0 rounded-lg px-3 py-2 text-white font-mono focus:ring-1 focus:ring-primary-500" value={ticketForm.tax_amount} onChange={e => tf('tax_amount', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest block mb-1">Svc Charge</label>
                    <input type="number" className="w-full bg-neutral-800 border-0 rounded-lg px-3 py-2 text-white font-mono focus:ring-1 focus:ring-primary-500" value={ticketForm.service_charge} onChange={e => tf('service_charge', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest block mb-1">Net Cost</label>
                    <input type="number" className="w-full bg-neutral-800 border-0 rounded-lg px-3 py-2 text-white font-mono focus:ring-1 focus:ring-primary-500" value={ticketForm.cost_fare} onChange={e => tf('cost_fare', e.target.value)} />
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase font-bold mb-0.5 tracking-wider">Cash Received (Total Sale)</div>
                    <div className="text-2xl font-black text-primary-400 font-mono">
                      {formatBDT(Number(ticketForm.base_fare) + Number(ticketForm.tax_amount) + Number(ticketForm.service_charge))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold mb-0.5 tracking-wider">Airline / Agency Payment</div>
                    <div className="text-xl font-bold text-neutral-300 font-mono">
                      {formatBDT(Number(ticketForm.cost_fare))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg border border-neutral-800 flex items-center justify-between">
                  <div className="text-[10px] text-neutral-300 uppercase font-bold tracking-widest">Net Profit / Commission</div>
                  <div className={`text-2xl font-black font-mono ${(Number(ticketForm.base_fare) + Number(ticketForm.tax_amount) + Number(ticketForm.service_charge)) - Number(ticketForm.cost_fare) >= 0 ? 'text-success-400' : 'text-error-400'}`}>
                    {formatBDT((Number(ticketForm.base_fare) + Number(ticketForm.tax_amount) + Number(ticketForm.service_charge)) - Number(ticketForm.cost_fare))}
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowTicketForm(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleSaveTicket} disabled={saving} className="btn-primary flex-[2] flex items-center justify-center gap-2">
                  {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Processing...' : 'Issue Group Tickets'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
