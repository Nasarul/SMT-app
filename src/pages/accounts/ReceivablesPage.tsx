import { useState, useEffect } from 'react';
import { Landmark, Users, Search, Download, AlertTriangle, FileText, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatBDT } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';

interface ReceivableItem {
  id: string;
  name: string;
  type: 'customer' | 'b2b_agent';
  mobile: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  last_transaction?: string;
}

export function ReceivablesPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReceivableItem[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  // Payment Modal State
  const [showPayment, setShowPayment] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ReceivableItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: agents } = await supabase.from('b2b_agents').select('id, agency_name, mobile, current_balance');
      const { data: tickets } = await supabase.from('air_tickets').select('total_fare, paid_amount, customer_id');
      const { data: visas } = await supabase.from('visas').select('total_amount, paid_amount, customer_id');
      const { data: tourBookings } = await supabase.from('tour_bookings').select('total_amount, paid_amount, customer_id');
      const { data: umrahPilgrims } = await supabase.from('umrah_pilgrims').select('package_price, total_paid, customer_id');
      const { data: customers } = await supabase.from('customers').select('id, full_name, mobile');
      const { data: generalReceipts } = await supabase.from('payment_receipts').select('amount, customer_id').eq('module', 'other');

      const receivables: ReceivableItem[] = [];

      // 1. Process B2B Agents (Directly from balance)
      agents?.forEach(agent => {
        if (Number(agent.current_balance) < 0) {
          receivables.push({
            id: agent.id,
            name: agent.agency_name,
            type: 'b2b_agent',
            mobile: agent.mobile,
            total_amount: 0,
            paid_amount: 0,
            balance: Math.abs(Number(agent.current_balance))
          });
        }
      });

      // 2. Process Customers (Calculate from bookings)
      customers?.forEach(cust => {
        let total = 0;
        let paid = 0;

        tourBookings?.filter(b => b.customer_id === cust.id).forEach(b => {
          total += Number(b.total_amount);
          paid += Number(b.paid_amount);
        });

        umrahPilgrims?.filter(p => p.customer_id === cust.id).forEach(p => {
          total += Number(p.package_price);
          paid += Number(p.total_paid);
        });

        tickets?.filter(t => t.customer_id === cust.id).forEach(t => {
          total += Number(t.total_fare);
          paid += Number(t.paid_amount || 0);
        });

        visas?.filter(v => v.customer_id === cust.id).forEach(v => {
          total += Number(v.total_amount);
          paid += Number(v.paid_amount || 0);
        });

        generalReceipts?.filter(r => r.customer_id === cust.id).forEach(r => {
          paid += Number(r.amount);
        });

        const balance = total - paid;
        if (balance > 0) {
          receivables.push({
            id: cust.id,
            name: cust.full_name,
            type: 'customer',
            mobile: cust.mobile,
            total_amount: total,
            paid_amount: paid,
            balance: balance
          });
        }
      });

      setItems(receivables.sort((a, b) => b.balance - a.balance));
    } catch (err) {
      console.error('Error loading receivables:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalOutstanding = items.reduce((sum, item) => sum + item.balance, 0);
  const filtered = items.filter(item => 
    (filter === 'all' || item.type === filter) &&
    (item.name.toLowerCase().includes(search.toLowerCase()) || item.mobile.includes(search))
  );

  const handleReceivePayment = async () => {
    if (!selectedCustomer) return;
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setError('Enter a valid amount');
      return;
    }
    
    setPaymentLoading(true);
    setError('');

    try {
      if (selectedCustomer.type === 'b2b_agent') {
        // B2B Agents update their current_balance natively via accounts_vouchers trigger or we can insert directly into payment_receipts if the trigger handles b2b correctly.
        // Actually, payment_receipts trigger updates b2b_agent balance ONLY if module='air_ticket'. 
        // We will insert into accounts_vouchers directly for B2B to act as a receipt.
        const { error: vErr } = await supabase.from('accounts_vouchers').insert([{
          voucher_type: 'receipt',
          party_name: selectedCustomer.name,
          cost_center: 'admin',
          description: `Due payment received from B2B Agent: ${selectedCustomer.name}`,
          amount: Number(paymentAmount),
          payment_mode: paymentMode,
          created_by: profile?.id
        }]);
        if (vErr) throw vErr;
        
        // Update B2B agent balance
        const { error: bErr } = await supabase.rpc('update_b2b_balance', { 
           agent_id: selectedCustomer.id, 
           amount: Number(paymentAmount) 
        });
        // fallback if rpc doesn't exist
        if (bErr) {
           const { data: aData } = await supabase.from('b2b_agents').select('current_balance').eq('id', selectedCustomer.id).single();
           if (aData) {
              await supabase.from('b2b_agents').update({ current_balance: Number(aData.current_balance) + Number(paymentAmount) }).eq('id', selectedCustomer.id);
           }
        }
      } else {
        // For general customers, insert into payment_receipts (which handles the voucher via trigger)
        const { error: pErr } = await supabase.from('payment_receipts').insert([{
          customer_id: selectedCustomer.id,
          module: 'other',
          amount: Number(paymentAmount),
          payment_mode: paymentMode,
          notes: 'General Due Payment',
          created_by: profile?.id
        }]);
        if (pErr) throw pErr;
      }
      
      setSuccess(`Payment of ${formatBDT(Number(paymentAmount))} received!`);
      setShowPayment(false);
      setPaymentAmount('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end gap-2 mb-4">
        <button className="btn-outline flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
          <Download size={16} /> Aging Report
        </button>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card p-6 border-l-4 border-l-warning-500">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-warning-50 text-warning-600 rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <Badge variant="warning">Attention Needed</Badge>
          </div>
          <div className="text-2xl font-bold text-neutral-800">{formatBDT(totalOutstanding)}</div>
          <div className="text-sm text-neutral-500 font-medium">Total Accounts Receivable</div>
        </div>

        <div className="card p-6 border-l-4 border-l-primary-500">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg">
              <Users size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-800">{items.filter(i => i.type === 'b2b_agent').length}</div>
          <div className="text-sm text-neutral-500 font-medium">Overdue B2B Partners</div>
        </div>

        <div className="card p-6 border-l-4 border-l-secondary-500">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-secondary-50 text-secondary-600 rounded-lg">
              <FileText size={20} />
            </div>
          </div>
          <div className="text-2xl font-bold text-neutral-800">{items.filter(i => i.type === 'customer').length}</div>
          <div className="text-sm text-neutral-500 font-medium">Pending Customer Dues</div>
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          {['all', 'customer', 'b2b_agent'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === t ? 'bg-primary-600 text-white shadow-md' : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {t === 'all' ? 'All Dues' : t === 'customer' ? 'Customers' : 'B2B Agents'}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            className="input-field pl-10" 
            placeholder="Search by name or mobile..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Receivables Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="table-header text-left">Entity Name</th>
                <th className="table-header text-center">Type</th>
                <th className="table-header text-right">Total Billing</th>
                <th className="table-header text-right">Paid Amount</th>
                <th className="table-header text-right">Outstanding Balance</th>
                <th className="table-header text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-neutral-400">Analyzing accounts...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-neutral-400">No outstanding balances found.</td></tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                    <td className="table-cell">
                      <div className="font-bold text-neutral-800">{item.name}</div>
                      <div className="text-xs text-neutral-400">{item.mobile}</div>
                    </td>
                    <td className="table-cell text-center">
                      <Badge variant={item.type === 'b2b_agent' ? 'primary' : 'neutral'}>
                        {item.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="table-cell text-right font-medium text-neutral-600">
                      {item.total_amount > 0 ? formatBDT(item.total_amount) : '—'}
                    </td>
                    <td className="table-cell text-right font-medium text-success-600">
                      {item.paid_amount > 0 ? formatBDT(item.paid_amount) : '—'}
                    </td>
                    <td className="table-cell text-right">
                      <div className="text-sm font-bold text-error-600 bg-error-50 px-3 py-1 rounded-lg inline-block">
                        {formatBDT(item.balance)}
                      </div>
                    </td>
                    <td className="table-cell text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedCustomer(item);
                            setPaymentAmount(item.balance.toString());
                            setShowPayment(true);
                          }}
                          className="bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Landmark size={14} /> Receive
                        </button>
                        <button className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 transition-colors" title="Send Reminder">
                          <Send size={16} />
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

      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)} title="Receive Due Payment">
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}
          
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100">
            <div className="text-sm text-neutral-500 mb-1">Receiving from:</div>
            <div className="font-bold text-lg text-neutral-800">{selectedCustomer?.name}</div>
            <div className="text-sm font-semibold text-error-600 mt-1">Current Due: {formatBDT(selectedCustomer?.balance || 0)}</div>
          </div>

          <div>
            <label className="label">Amount to Receive (BDT)</label>
            <input type="number" min="0" className="input-field text-lg font-bold text-success-700" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
          </div>

          <div>
            <label className="label">Payment Mode</label>
            <select className="input-field" value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button onClick={() => setShowPayment(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleReceivePayment} disabled={paymentLoading} className="btn-primary flex-1 flex justify-center items-center gap-2">
              {paymentLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Confirm Payment
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
