import { Plane, QrCode, ShieldCheck } from 'lucide-react';
import { formatBDT, formatDate, getStatusColor } from '../../lib/constants';
import { Badge } from '../ui/Badge';

interface FlightBoardingPassCardProps {
  ticket: any;
  onEdit?: (ticket: any) => void;
  onPrint?: (ticket: any) => void;
}

export function FlightBoardingPassCard({ ticket, onEdit, onPrint }: FlightBoardingPassCardProps) {
  return (
    <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col md:flex-row group">
      {/* Left Main Boarding Pass Section */}
      <div className="flex-1 p-6 flex flex-col justify-between space-y-6">
        {/* Top Header: Airline & PNR */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                {ticket.airline || 'Saudia Airlines'}
              </h4>
              <p className="text-xs text-slate-400 font-medium">Flight No: {ticket.flight_number || 'SV-803'}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">GDS / PNR</span>
            <span className="text-sm font-mono font-black text-sky-600 tracking-widest bg-sky-50 px-2.5 py-1 rounded-lg">
              {ticket.pnr || 'X9Q8KL'}
            </span>
          </div>
        </div>

        {/* Middle Route & City Nodes */}
        <div className="flex items-center justify-between py-2">
          {/* Origin */}
          <div className="text-left">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{ticket.origin || 'DAC'}</span>
            <p className="text-xs text-slate-400 font-medium">Dhaka, Bangladesh</p>
          </div>

          {/* Flight Path Graphic */}
          <div className="flex-1 px-6 flex flex-col items-center">
            <div className="w-full flex items-center justify-center relative">
              <div className="w-full border-t-2 border-dashed border-slate-200 absolute top-1/2" />
              <div className="w-8 h-8 rounded-full bg-sky-50 border-2 border-sky-500 flex items-center justify-center z-10 text-sky-600 shadow-sm group-hover:translate-x-3 transition-transform duration-500">
                <Plane className="w-4 h-4" />
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-500 mt-2 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Non-Stop • Economy
            </span>
          </div>

          {/* Destination */}
          <div className="text-right">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{ticket.destination || 'JED'}</span>
            <p className="text-xs text-slate-400 font-medium">Jeddah, Saudi Arabia</p>
          </div>
        </div>

        {/* Passenger & Date info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block font-semibold">PASSENGER NAME</span>
            <span className="font-bold text-slate-800 text-sm">{ticket.passenger_name}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">DEPARTURE DATE</span>
            <span className="font-bold text-slate-800">{formatDate(ticket.travel_date)}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">STATUS</span>
            <Badge variant={getStatusColor(ticket.status) as any} className="text-[11px] px-2 py-0.5 mt-0.5">
              {ticket.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Dotted Tear Line */}
      <div className="relative flex md:flex-col items-center justify-between my-0 md:my-4">
        <div className="w-4 h-4 rounded-full bg-slate-50 border border-slate-200 -ml-2 md:-ml-0 md:-mt-2" />
        <div className="w-full md:w-px h-px md:h-full border-t md:border-t-0 md:border-l-2 border-dashed border-slate-200" />
        <div className="w-4 h-4 rounded-full bg-slate-50 border border-slate-200 -mr-2 md:-mr-0 md:-mb-2" />
      </div>

      {/* Right Stub Section (Financials, QR & Action) */}
      <div className="w-full md:w-64 bg-slate-50/70 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold uppercase">Customer Fare</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
            {formatBDT(ticket.total_fare)}
          </div>
          <p className="text-xs text-emerald-600 font-bold">Profit: +{formatBDT(ticket.profit || 0)}</p>
        </div>

        {/* QR Code / Stub Identifier */}
        <div className="my-4 p-3 bg-white rounded-2xl border border-slate-200/60 flex items-center gap-3">
          <QrCode className="w-10 h-10 text-slate-800 shrink-0" />
          <div className="text-[10px] text-slate-400 leading-tight">
            <span className="font-bold text-slate-700 block">E-TICKET VERIFIED</span>
            <span>Ticket: {ticket.ticket_number || 'TKT-88401'}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              onClick={() => onEdit(ticket)}
              className="flex-1 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors shadow-2xs"
            >
              Edit
            </button>
          )}
          {onPrint && (
            <button
              onClick={() => onPrint(ticket)}
              className="flex-1 py-2 px-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Print
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
