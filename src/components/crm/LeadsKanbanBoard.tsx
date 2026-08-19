import { Phone, MessageSquare, Calendar, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatDate } from '../../lib/constants';

interface Lead {
  id: string;
  full_name: string;
  mobile: string;
  email: string;
  source: string;
  interest: string;
  status: string;
  follow_up_date: string;
  notes: string;
  created_at: string;
}

interface LeadsKanbanBoardProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: string) => void;
  onEditLead?: (lead: Lead) => void;
}

const columns = [
  { id: 'new', title: 'New Leads', color: 'border-t-sky-500 bg-sky-50/30' },
  { id: 'contacted', title: 'Contacted', color: 'border-t-indigo-500 bg-indigo-50/30' },
  { id: 'quoted', title: 'Quotation Sent', color: 'border-t-amber-500 bg-amber-50/30' },
  { id: 'negotiating', title: 'Negotiating', color: 'border-t-purple-500 bg-purple-50/30' },
  { id: 'won', title: 'Won / Booked', color: 'border-t-emerald-500 bg-emerald-50/30' },
  { id: 'lost', title: 'Lost', color: 'border-t-rose-500 bg-rose-50/30' },
];

const interestLabels: Record<string, { label: string; bg: string }> = {
  umrah: { label: 'Umrah Package', bg: 'bg-amber-100 text-amber-800' },
  hajj: { label: 'Hajj 2025', bg: 'bg-indigo-100 text-indigo-800' },
  ticket: { label: 'Air Ticket', bg: 'bg-sky-100 text-sky-800' },
  tour: { label: 'Holiday Tour', bg: 'bg-pink-100 text-pink-800' },
  visa: { label: 'Visa Service', bg: 'bg-teal-100 text-teal-800' },
  hotel: { label: 'Hotel Booking', bg: 'bg-emerald-100 text-emerald-800' },
};

export function LeadsKanbanBoard({ leads, onStatusChange, onEditLead }: LeadsKanbanBoardProps) {
  const getNextStatus = (current: string) => {
    const order = ['new', 'contacted', 'quoted', 'negotiating', 'won'];
    const idx = order.indexOf(current);
    return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
  };

  const getPrevStatus = (current: string) => {
    const order = ['new', 'contacted', 'quoted', 'negotiating', 'won'];
    const idx = order.indexOf(current);
    return idx > 0 ? order[idx - 1] : null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.id);

        return (
          <div
            key={col.id}
            className={`flex flex-col bg-slate-50/80 rounded-3xl border border-slate-200/80 p-3.5 min-h-[500px] ${col.color}`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 py-1.5 mb-3 border-b border-slate-200/60 pb-2.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">{col.title}</span>
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white text-slate-700 shadow-2xs">
                {colLeads.length}
              </span>
            </div>

            {/* Lead Cards List */}
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {colLeads.length === 0 ? (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 font-medium italic">
                  No leads in stage
                </div>
              ) : (
                colLeads.map((lead) => {
                  const next = getNextStatus(lead.status);
                  const prev = getPrevStatus(lead.status);
                  const interest = interestLabels[lead.interest] || {
                    label: lead.interest || 'General',
                    bg: 'bg-slate-100 text-slate-700',
                  };

                  return (
                    <div
                      key={lead.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-3"
                    >
                      {/* Name & Interest */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <h4
                            onClick={() => onEditLead?.(lead)}
                            className="font-bold text-slate-900 text-sm hover:text-primary-600 transition-colors cursor-pointer truncate"
                          >
                            {lead.full_name}
                          </h4>
                        </div>
                        <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-md ${interest.bg}`}>
                          {interest.label}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div className="text-xs text-slate-600 space-y-1">
                        {lead.mobile && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Phone:</span>
                            <span className="font-semibold text-slate-800">{lead.mobile}</span>
                          </div>
                        )}
                        {lead.follow_up_date && (
                          <div className="flex items-center justify-between text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                            <span className="flex items-center gap-1 font-bold">
                              <Calendar className="w-3 h-3" /> Follow-up:
                            </span>
                            <span className="font-bold">{formatDate(lead.follow_up_date)}</span>
                          </div>
                        )}
                      </div>

                      {/* Quick Communication Actions */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                        {lead.mobile && (
                          <>
                            <a
                              href={`tel:${lead.mobile}`}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`https://wa.me/${lead.mobile.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs transition-colors"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          </>
                        )}

                        {/* Stage transition buttons */}
                        <div className="flex-1 flex items-center justify-end gap-1">
                          {prev && (
                            <button
                              onClick={() => onStatusChange(lead.id, prev)}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-md transition-colors text-xs"
                              title="Move back"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {next && (
                            <button
                              onClick={() => onStatusChange(lead.id, next)}
                              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs"
                              title="Advance to next stage"
                            >
                              <span>Next</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
