import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Plane, Download, PieChart, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatBDT } from '../../lib/constants';
import { Badge } from '../../components/ui/Badge';

interface TicketReport {
  totalTickets: number;
  totalSales: number;
  totalProfit: number;
  salesByAirline: Record<string, number>;
  salesByType: Record<string, number>;
  profitBySupplier: Record<string, number>;
}

export function TicketReportsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<TicketReport>({
    totalTickets: 0,
    totalSales: 0,
    totalProfit: 0,
    salesByAirline: {},
    salesByType: {},
    profitBySupplier: {}
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: tickets } = await supabase.from('air_tickets').select('*, suppliers(company_name)');

      const r: TicketReport = {
        totalTickets: tickets?.length || 0,
        totalSales: 0,
        totalProfit: 0,
        salesByAirline: {},
        salesByType: {},
        profitBySupplier: {}
      };

      tickets?.forEach(t => {
        r.totalSales += Number(t.total_fare);
        r.totalProfit += Number(t.profit);
        r.salesByAirline[t.airline] = (r.salesByAirline[t.airline] || 0) + Number(t.total_fare);
        r.salesByType[t.ticket_type] = (r.salesByType[t.ticket_type] || 0) + Number(t.total_fare);
        
        if (t.suppliers?.company_name) {
          r.profitBySupplier[t.suppliers.company_name] = (r.profitBySupplier[t.suppliers.company_name] || 0) + Number(t.profit);
        } else {
          r.profitBySupplier['Direct / GDS'] = (r.profitBySupplier['Direct / GDS'] || 0) + Number(t.profit);
        }
      });

      setReport(r);
    } catch (err) {
      console.error('Error loading ticket reports:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 lg:px-6 py-12 text-center text-neutral-400 text-sm">
        Generating ticket reports & analytics...
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">
      <div className="flex justify-end mb-4">
        <button onClick={() => window.print()} className="btn-outline flex items-center gap-2 bg-white">
          <Download size={16} /> Print / Export
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-primary-50 text-primary-600 rounded-lg"><Plane size={20} /></div>
            <Badge variant="primary">Total Issued</Badge>
          </div>
          <div className="text-2xl font-bold text-neutral-800">{report.totalTickets}</div>
          <div className="text-xs text-neutral-400 font-medium">Tickets this year</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-success-50 text-success-600 rounded-lg"><DollarSign size={20} /></div>
            <Badge variant="success">+15%</Badge>
          </div>
          <div className="text-2xl font-bold text-neutral-800">{formatBDT(report.totalSales)}</div>
          <div className="text-xs text-neutral-400 font-medium">Gross Sales Revenue</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-secondary-50 text-secondary-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <div className="text-2xl font-bold text-neutral-800">{formatBDT(report.totalProfit)}</div>
          <div className="text-xs text-neutral-400 font-medium">Net Profit Margin</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-warning-50 text-warning-600 rounded-lg"><Users size={20} /></div>
          </div>
          <div className="text-2xl font-bold text-neutral-800">{Object.keys(report.salesByAirline).length}</div>
          <div className="text-xs text-neutral-400 font-medium">Airlines Partners</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Airline */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-semibold text-neutral-800 flex items-center gap-2">
              <BarChart3 size={18} className="text-primary-500" /> Sales by Airline
            </h3>
          </div>
          <div className="space-y-4">
            {Object.entries(report.salesByAirline).map(([airline, sales]) => (
              <div key={airline} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-neutral-700">{airline}</span>
                  <span className="font-bold text-neutral-800">{formatBDT(sales)}</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-2">
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${(sales / report.totalSales) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {Object.keys(report.salesByAirline).length === 0 && (
              <div className="text-center py-8 text-neutral-400 italic">No sales data available</div>
            )}
          </div>
        </div>

        {/* Ticket Type Distribution */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-semibold text-neutral-800 flex items-center gap-2">
              <PieChart size={18} className="text-secondary-500" /> Ticket Type Distribution
            </h3>
          </div>
          <div className="flex flex-col items-center justify-center h-full pb-8">
            <div className="grid grid-cols-2 gap-8 w-full max-w-xs">
              {Object.entries(report.salesByType).map(([type, sales]) => (
                <div key={type} className="text-center">
                  <div className={`text-3xl font-bold ${type === 'individual' ? 'text-primary-600' : 'text-secondary-600'}`}>
                    {((sales / report.totalSales) * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-neutral-400 uppercase font-bold mt-1">{type.replace('_', ' ')}</div>
                  <div className="text-sm font-semibold text-neutral-700 mt-2">{formatBDT(sales)}</div>
                </div>
              ))}
            </div>
            {Object.keys(report.salesByType).length === 0 && (
              <div className="text-center py-8 text-neutral-400 italic">No distribution data</div>
            )}
          </div>
        </div>
      </div>

      {/* Supplier Profit Analysis */}
      <div className="card p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading font-semibold text-neutral-800 flex items-center gap-2">
            <TrendingUp size={18} className="text-success-500" /> Commission/Profit by Supplier
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(report.profitBySupplier).map(([supplier, profit]) => (
            <div key={supplier} className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col justify-between">
              <div className="text-xs text-neutral-400 uppercase font-bold tracking-wider mb-1">{supplier}</div>
              <div className={`text-xl font-mono font-bold ${profit >= 0 ? 'text-success-600' : 'text-error-600'}`}>
                {formatBDT(profit)}
              </div>
              <div className="mt-3 w-full bg-neutral-200 rounded-full h-1.5">
                <div 
                  className="bg-success-500 h-1.5 rounded-full" 
                  style={{ width: `${Math.max(0, Math.min(100, (profit / report.totalProfit) * 100))}%` }}
                />
              </div>
            </div>
          ))}
          {Object.keys(report.profitBySupplier).length === 0 && (
            <div className="col-span-full text-center py-8 text-neutral-400 italic">No supplier data recorded</div>
          )}
        </div>
      </div>
    </div>
  );
}
