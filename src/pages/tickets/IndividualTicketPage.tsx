import React, { useState, useEffect } from 'react';
import { Plane, Plus, Search, Download, CreditCard as Edit2, CheckCircle, AlertCircle, MessageSquare, Trash2 } from 'lucide-react';
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
  metadata?: string;
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
  metadata: [] as {key: string, value: string}[]
};

export function IndividualTicketPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Multi-Passenger State
  const [showForm, setShowForm] = useState(false);
  const [forms, setForms] = useState([{ ...emptyForm }]);
  const [activeTab, setActiveTab] = useState(0);
  const [needsRecalc, setNeedsRecalc] = useState<boolean[]>([false]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [gdsText, setGdsText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [importError, setImportError] = useState('');

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

  const getFareData = (fData: any) => {
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

  const [fareDatas, setFareDatas] = useState<any[]>([getFareData(emptyForm)]);

  const handleRecalculate = () => {
    setFareDatas(prev => {
      const next = [...prev];
      next[activeTab] = getFareData(forms[activeTab]);
      return next;
    });
    setNeedsRecalc(prev => {
      const next = [...prev];
      next[activeTab] = false;
      return next;
    });
  };

  const handleSave = async () => {
    if (needsRecalc.some(r => r)) {
      setError('Please click Recalculate for all pending tabs before saving.');
      return;
    }
    
    for (let i = 0; i < forms.length; i++) {
      const f = forms[i];
      if (!f.passenger_name || !f.airline || !f.origin || !f.destination || !f.travel_date) {
        setError(`Please fill all required fields for passenger ${i+1}.`);
        setActiveTab(i);
        return;
      }
    }
    
    setSaving(true);
    setError('');
    
    const payloads = forms.map((f, i) => {
      const fd = fareDatas[i];
      const cost_fare = fd.total_client_fare - fd.net_profit;
      return {
        ticket_number: f.ticket_number,
        passenger_name: f.passenger_name,
        passport_number: f.passport_number,
        airline: f.airline,
        pnr: f.pnr,
        origin: f.origin,
        destination: f.destination,
        travel_date: f.travel_date,
        return_date: f.return_date || null,
        cabin_class: f.cabin_class,
        base_fare: fd.base,
        tax_amount: fd.vat,
        ait_amount: fd.tax_ait,
        service_charge: fd.svc,
        total_fare: fd.total_client_fare,
        cost_fare: cost_fare,
        profit: fd.net_profit,
        status: f.status,
        supplier_id: f.supplier_id || null,
        ticket_type: 'individual',
        sales_agent_id: profile?.id,
        metadata: JSON.stringify(f.metadata || [])
      };
    });

    const { error: err } = await supabase.from('air_tickets').insert(payloads);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(`${forms.length} Ticket(s) issued successfully!`);
      setShowForm(false);
      setForms([{ ...emptyForm }]);
      setFareDatas([getFareData(emptyForm)]);
      setNeedsRecalc([false]);
      setActiveTab(0);
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
  
  const updateActiveForm = (field: string, val: any) => {
    setForms(prev => {
      const next = [...prev];
      next[activeTab] = { ...next[activeTab], [field]: val };
      return next;
    });
    if (fareFields.includes(field)) {
      setNeedsRecalc(prev => {
        const next = [...prev];
        next[activeTab] = true;
        return next;
      });
    }
  };
  
  const updateMetadata = (idx: number, field: 'key' | 'value', val: string) => {
    setForms(prev => {
      const next = [...prev];
      const newMeta = [...(next[activeTab].metadata || [])];
      newMeta[idx] = { ...newMeta[idx], [field]: val };
      next[activeTab] = { ...next[activeTab], metadata: newMeta };
      return next;
    });
  };
  
  const addMetadataField = () => {
    setForms(prev => {
      const next = [...prev];
      const newMeta = [...(next[activeTab].metadata || []), { key: '', value: '' }];
      next[activeTab] = { ...next[activeTab], metadata: newMeta };
      return next;
    });
  };
  
  const removeMetadataField = (idx: number) => {
    setForms(prev => {
      const next = [...prev];
      const newMeta = [...(next[activeTab].metadata || [])];
      newMeta.splice(idx, 1);
      next[activeTab] = { ...next[activeTab], metadata: newMeta };
      return next;
    });
  };
  
  const addNewPassengerTab = () => {
    setForms(prev => [...prev, { ...emptyForm }]);
    setFareDatas(prev => [...prev, getFareData(emptyForm)]);
    setNeedsRecalc(prev => [...prev, false]);
    setActiveTab(forms.length);
  };
  
  const removePassengerTab = (indexToRemove: number) => {
    if (forms.length <= 1) return;
    setForms(prev => prev.filter((_, i) => i !== indexToRemove));
    setFareDatas(prev => prev.filter((_, i) => i !== indexToRemove));
    setNeedsRecalc(prev => prev.filter((_, i) => i !== indexToRemove));
    setActiveTab(prev => (prev >= indexToRemove ? Math.max(0, prev - 1) : prev));
  };

  const parseGDS = () => {
    setImportError('');
    const text = gdsText.trim();
    if (!text) {
      setImportError('Please paste ticket text before parsing.');
      return;
    }

    const newData = { ...emptyForm };

    // 1. Passenger Name (Filter out dictionary/system terms like Prize/Promo, error/message, Economy, etc.)
    const forbiddenWords = ['PRIZE', 'PROMO', 'ERROR', 'MESSAGE', 'ECONOMY', 'BUSINESS', 'FIRST', 'ADULT', 'CHILD', 'INFANT', 'TERMS', 'CONDITIONS', 'PAYMENT', 'METHOD', 'CREDIT', 'DEBIT', 'TOTAL', 'FARE', 'TAX', 'FEE', 'REF', 'CODE', 'BOOKING', 'STATUS', 'ISSUED', 'DATE', 'FLIGHT', 'TICKET', 'COUPON', 'NOTICE', 'AGENCY', 'COMPANY', 'US-BANGLA', 'BIMAN', 'AIRLINE', 'AIRLINES', 'ROUTING', 'ENDORSEMENT', 'CHECK-IN', 'BAGGAGE'];

    let extractedName = '';

    const namePrefixMatch = 
      text.match(/(?:PASSENGER NAME|PASSENGER|PREPARED FOR|NAME|PAX)\s*:?\s*([A-Z\s.,/]+?)(?=\s*(?:PNR|TICKET|ETKT|BOOKING|FLIGHT|DATE|TOTAL|FARE|CLASS|FORM OF|FOOP|RL|REF|\r|\n|$))/i) ||
      text.match(/(?:1\.|2\.|3\.)\s*([A-Z\s.,/]+?)(?=\s*(?:PNR|TICKET|ETKT|BOOKING|FLIGHT|DATE|TOTAL|FARE|CLASS|\r|\n|$))/i);

    if (namePrefixMatch) {
      const candidate = namePrefixMatch[1].replace(/[\r\n]+/g, ' ').trim();
      const upperCand = candidate.toUpperCase();
      if (!forbiddenWords.some(w => upperCand.includes(w)) && candidate.length > 2) {
        extractedName = candidate;
      }
    }

    if (!extractedName) {
      const surnameMatch = text.match(/\b([A-Z]{2,}\/[A-Z\s]{2,}(?:\s+(?:MR|MS|MRS|MSTR|MISS))\b)/i);
      if (surnameMatch) {
        const cand = surnameMatch[1].trim();
        const upper = cand.toUpperCase();
        if (!forbiddenWords.some(w => upper.includes(w))) {
          extractedName = cand;
        }
      }
    }

    if (extractedName) {
      newData.passenger_name = extractedName;
    }

    // 2. PNR / Booking Ref (Strict 6-char alphanumeric check excluding ERENCE, NUMBER, etc.)
    const invalidPnrs = ['ERENCE', 'NUMBER', 'AMADEU', 'GALILE', 'SABRE', 'REFNUM', 'CODE00', 'STATUS'];
    const pnrMatches = [
      ...text.matchAll(/(?:PNR|BOOKING REF|RESERVATION CODE|RESERVATION NO|RECORD LOCATOR|CONFIRMATION|RL)\s*:?\s*([A-Z0-9]{6})\b/gi)
    ];

    for (const match of pnrMatches) {
      const val = match[1].toUpperCase();
      if (!invalidPnrs.includes(val) && !/^\d{6}$/.test(val) && /^[A-Z0-9]{6}$/.test(val)) {
        newData.pnr = val;
        break;
      }
    }

    // 3. Ticket Number (10 to 14 digits)
    const tktMatch = 
      text.match(/(?:TICKET NUMBER|ETKT|TICKET)\s*:?\s*([0-9\s-]{10,20})/i) ||
      text.match(/\b(\d{3}[-\s]?\d{10})\b/);
      
    if (tktMatch) {
      newData.ticket_number = tktMatch[1].replace(/[\s-]/g, '').trim();
    }

    // 4. Airline Detection
    if (/US-BANGLA|US BANGLA|BS\b/i.test(text)) newData.airline = 'US-Bangla Airlines';
    else if (/BIMAN|BANGLADESH AIRLINES|BG\b/i.test(text)) newData.airline = 'Biman Bangladesh Airlines';
    else if (/AIR ARABIA|G9\b/i.test(text)) newData.airline = 'Air Arabia';
    else if (/FLYDUBAI|FZ\b/i.test(text)) newData.airline = 'flydubai';
    else if (/EMIRATES|EK\b/i.test(text)) newData.airline = 'Emirates';
    else if (/SAUDIA|SAUDI ARABIAN|SV\b/i.test(text)) newData.airline = 'Saudia';
    else if (/QATAR|QR\b/i.test(text)) newData.airline = 'Qatar Airways';
    else if (/GULF AIR|GF\b/i.test(text)) newData.airline = 'Gulf Air';
    else if (/KUWAIT|KU\b/i.test(text)) newData.airline = 'Kuwait Airways';
    else if (/JAZEERA|J9\b/i.test(text)) newData.airline = 'Jazeera Airways';
    else if (/SALAMAIR|OV\b/i.test(text)) newData.airline = 'SalamAir';
    else if (/MALAYSIA AIRLINES|MH\b/i.test(text)) newData.airline = 'Malaysia Airlines';
    else if (/SINGAPORE AIRLINES|SQ\b/i.test(text)) newData.airline = 'Singapore Airlines';
    else if (/THAI AIRWAYS|TG\b/i.test(text)) newData.airline = 'Thai Airways';
    else if (/INDIGO|6E\b/i.test(text)) newData.airline = 'IndiGo';

    // 5. Total & Base Fare Extraction
    const fareMatch = 
      text.match(/(?:BASE FARE|EQUIV FARE|FARE AMOUNT|FARE)\s*:?\s*(?:BDT|USD)?\s*([\d,]+)/i);
    
    const totalMatch = 
      text.match(/(?:TOTAL FARE|TOTAL AMOUNT|GRAND TOTAL|TOTAL)\s*:?\s*(?:BDT|USD)?\s*([\d,]+)/i) ||
      text.match(/BDT\s*([\d,]{4,8})/i);

    if (totalMatch) {
      const totalVal = parseInt(totalMatch[1].replace(/,/g, ''));
      if (totalVal > 0) {
        newData.total_fare_input = totalVal;
        if (fareMatch) {
          const fareVal = parseInt(fareMatch[1].replace(/,/g, ''));
          newData.base_fare = fareVal > 0 ? fareVal : Math.round(totalVal * 0.85);
        } else {
          newData.base_fare = Math.round(totalVal * 0.85);
        }
      }
    } else if (fareMatch) {
      const fareVal = parseInt(fareMatch[1].replace(/,/g, ''));
      if (fareVal > 0) {
        newData.base_fare = fareVal;
        newData.total_fare_input = Math.round(fareVal * 1.15);
      }
    }

    // 6. Tax Breakdown
    const utMatch = text.match(/UT\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*UT/i);
    if (utMatch) newData.ut = parseInt(utMatch[1].replace(/,/g, ''));

    const bdMatch = text.match(/BD\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*BD/i);
    if (bdMatch) newData.bd = parseInt(bdMatch[1].replace(/,/g, ''));

    const e5Match = text.match(/E5\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*E5/i);
    if (e5Match) newData.e5 = parseInt(e5Match[1].replace(/,/g, ''));

    // Validation check
    if (!newData.passenger_name && !newData.pnr && !newData.ticket_number && !newData.total_fare_input) {
      setImportError('Could not detect passenger name or PNR in the pasted text. Please paste the ticket itinerary / booking confirmation containing passenger name and PNR.');
      return;
    }

    setForms([newData]);
    setFareDatas([getFareData(newData)]);
    setNeedsRecalc([false]);
    setActiveTab(0);
    
    setShowImportModal(false);
    setGdsText('');
    setShowForm(true);
    setSuccess('Data parsed from GDS successfully! Please verify extracted fields.');
  };
  
  const parseWithAI = async () => {
    setImportError('');
    const text = gdsText.trim();
    if (!text) {
      setImportError('Please paste ticket text before parsing.');
      return;
    }

    setIsAiParsing(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Google AI API Key (VITE_GEMINI_API_KEY) not found in configuration.");
      }

      const prompt = `You are an expert aviation and travel agency ticket parser. Analyze the following GDS / e-Ticket text (from Amadeus, Sabre, Galileo, US-Bangla Airlines, Biman Bangladesh, Air Arabia, flydubai, Saudia, Emirates, etc.) and extract an array of passenger ticket objects.

CRITICAL PARSING RULES:
1. "passenger_name": Extract ONLY actual human passenger names (e.g. "RAHMAN/SAYEDUR MR" or "MD NASARUL HASAN"). NEVER output dictionary words, legal notices, terms, disclaimers, or labels like "Prize/Promo", "error/message", "Terms/Conditions", "Adult/Child", "Economy", "Payment".
2. "pnr": Extract the 6-character alphanumeric booking reference / PNR code (e.g. "A1B2C3"). Do NOT output words like "ERENCE" or "NUMBER".
3. "ticket_number": Extract 10 to 14 digit e-ticket numbers (e.g. "7791234567890" or "202-9876543210"). Digits only.
4. "airline": Detect the operating/issuing airline (e.g. "US-Bangla Airlines", "Biman Bangladesh Airlines", "Air Arabia", "flydubai", "Emirates", "Saudia", "Qatar Airways").
5. "origin" & "destination": 3-letter IATA airport/city codes (e.g. "DAC", "CGP", "ZYL", "DXB", "JED", "MED", "RUH", "KUL", "SIN", "BKK").
6. "travel_date": Date of flight in YYYY-MM-DD format.
7. "base_fare": Base flight fare as a number.
8. "total_fare": Total ticket price paid as a number.
9. "ut_tax", "bd_tax", "e5_tax": Tax breakdown amounts if present.
10. "extra_info": Array of key-value objects for baggage allowance, meal, seat, class, etc.

Text to parse:
"""
${text}
"""

Return ONLY a raw JSON array of passenger objects. Do NOT wrap in markdown code blocks or add explanatory text.`;

      const candidateModels = [
        'gemini-2.0-flash',
        'gemini-2.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash'
      ];

      let aiResponseText = '';
      let fetchSuccess = false;
      let lastErrorMessage = '';

      for (const model of candidateModels) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });

          if (res.ok) {
            const data = await res.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textContent) {
              aiResponseText = textContent;
              fetchSuccess = true;
              break;
            }
          } else {
            const errData = await res.json();
            lastErrorMessage = errData.error?.message || `Model ${model} returned HTTP ${res.status}`;
          }
        } catch (e: any) {
          lastErrorMessage = e.message || `Failed to call ${model}`;
        }
      }

      if (!fetchSuccess) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          });
          if (res.ok) {
            const data = await res.json();
            const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textContent) {
              aiResponseText = textContent;
              fetchSuccess = true;
            }
          }
        } catch (e: any) {
          // ignore fallback error
        }
      }

      if (!fetchSuccess || !aiResponseText) {
        throw new Error(lastErrorMessage || "Failed to parse ticket with AI models.");
      }

      let cleanedText = aiResponseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedPassengers = JSON.parse(cleanedText);

      if (Array.isArray(parsedPassengers) && parsedPassengers.length > 0) {
        const newForms = parsedPassengers.map(p => ({
          ...emptyForm,
          passenger_name: p.passenger_name || '',
          ticket_number: p.ticket_number || '',
          pnr: p.pnr || '',
          airline: p.airline || '',
          origin: p.origin || 'DAC',
          destination: p.destination || '',
          travel_date: p.travel_date || '',
          base_fare: p.base_fare || 0,
          total_fare_input: p.total_fare || 0,
          ut: p.ut_tax || 0,
          bd: p.bd_tax || 0,
          e5: p.e5_tax || 0,
          metadata: p.extra_info || []
        }));

        setForms(newForms);
        setFareDatas(newForms.map(f => getFareData(f)));
        setNeedsRecalc(newForms.map(() => false));
        setActiveTab(0);

        setShowImportModal(false);
        setGdsText('');
        setShowForm(true);
        setSuccess(`AI Parsed successfully! Extracted ${newForms.length} passenger(s).`);
      } else {
        throw new Error("AI returned empty or invalid passenger data.");
      }
    } catch (err: any) {
      console.error('AI Parsing error:', err);
      setImportError(`AI Parse Note: ${err.message || 'Failed to parse text.'} Falling back to Standard Parse...`);
      setTimeout(() => {
        parseGDS();
      }, 1200);
    } finally {
      setIsAiParsing(false);
    }
  };

  const form = forms[activeTab] || emptyForm;
  const fareData = fareDatas[activeTab] || getFareData(emptyForm);
  const currentNeedsRecalc = needsRecalc[activeTab] || false;

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
          <button onClick={() => { 
            setShowForm(true); 
            setError(''); 
            setSuccess(''); 
            setForms([{ ...emptyForm }]);
            setFareDatas([getFareData(emptyForm)]);
            setNeedsRecalc([false]);
            setActiveTab(0);
          }} className="btn-primary flex items-center gap-2">
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
                <tr><td colSpan={10} className="py-12 text-center text-neutral-400 text-sm">Loading...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={10}>
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
          
          {/* Multi-Passenger Tabs */}
          <div className="flex gap-1 border-b border-neutral-200 pb-2 mb-2 overflow-x-auto">
            {forms.map((f, i) => (
              <div key={i} className={`flex items-center rounded-t-lg transition-colors border-b-2 ${activeTab === i ? 'bg-primary-50 border-primary-600' : 'hover:bg-neutral-50 border-transparent'}`}>
                <button 
                  onClick={() => setActiveTab(i)}
                  className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${activeTab === i ? 'text-primary-700' : 'text-neutral-500'}`}
                >
                  {f.passenger_name || `Passenger ${i+1}`}
                </button>
                {forms.length > 1 && (
                  <button 
                    onClick={() => removePassengerTab(i)}
                    className="pr-2 pl-1 text-neutral-400 hover:text-error-500"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button 
              onClick={addNewPassengerTab}
              className="px-3 py-1.5 text-xs text-primary-600 font-semibold hover:bg-primary-50 rounded-t-lg flex items-center gap-1 border-b-2 border-transparent"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {error && (
            <div className="flex gap-2 p-2 bg-error-50 border border-error-200 text-error-700 rounded-lg text-[11px]">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Row 1: Passenger & Route Information */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Passenger Name *</label>
              <input className="input-field py-1.5 px-2.5 text-xs" value={form.passenger_name} onChange={e => updateActiveForm('passenger_name', e.target.value)} placeholder="As per passport" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Passport</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono uppercase" value={form.passport_number} onChange={e => updateActiveForm('passport_number', e.target.value.toUpperCase())} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">PNR *</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono uppercase" value={form.pnr} onChange={e => updateActiveForm('pnr', e.target.value.toUpperCase())} placeholder="6-char PNR" />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Ticket Number</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono" value={form.ticket_number || ''} onChange={e => updateActiveForm('ticket_number', e.target.value)} placeholder="13-digit" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Source</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.supplier_id} onChange={e => updateActiveForm('supplier_id', e.target.value)}>
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
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.airline} onChange={e => updateActiveForm('airline', e.target.value)}>
                <option value="">Select airline</option>
                {airlineList.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Origin</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.origin} onChange={e => updateActiveForm('origin', e.target.value)}>
                {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Destination</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.destination} onChange={e => updateActiveForm('destination', e.target.value)}>
                <option value="">Select</option>
                {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Travel Date *</label>
              <input type="date" className="input-field py-1.5 px-2.5 text-xs" value={form.travel_date} onChange={e => updateActiveForm('travel_date', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Return Date</label>
              <input type="date" className="input-field py-1.5 px-2.5 text-xs" value={form.return_date} onChange={e => updateActiveForm('return_date', e.target.value)} />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Class</label>
              <select className="input-field py-1.5 px-2.5 text-xs" value={form.cabin_class} onChange={e => updateActiveForm('cabin_class', e.target.value)}>
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
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold text-neutral-800" value={form.base_fare} onChange={e => updateActiveForm('base_fare', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Total Fare *</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold text-neutral-800" value={form.total_fare_input} onChange={e => updateActiveForm('total_fare_input', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">UT</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs" value={form.ut} onChange={e => updateActiveForm('ut', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">BD</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs" value={form.bd} onChange={e => updateActiveForm('bd', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">E5</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs" value={form.e5} onChange={e => updateActiveForm('e5', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Comm. (%)</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs" value={form.commission_rate} onChange={e => updateActiveForm('commission_rate', e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Service Chg</label>
              <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold" value={form.service_charge} onChange={e => updateActiveForm('service_charge', e.target.value)} />
            </div>
          </div>
          
          {/* Dynamic Custom Fields */}
          <div className="bg-white border rounded-xl p-3">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[11px] font-bold text-neutral-600 uppercase">Additional Info (Dynamic Fields)</h3>
              <button onClick={addMetadataField} className="text-[11px] text-primary-600 font-semibold flex items-center gap-1 hover:underline">
                <Plus size={12} /> Add Custom Field
              </button>
            </div>
            {(!form.metadata || form.metadata.length === 0) && (
               <p className="text-xs text-neutral-400 italic">No custom fields added. E.g. Baggage, Meal Preference, Seat.</p>
            )}
            {form.metadata?.map((meta, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input 
                  className="input-field py-1.5 px-2.5 text-xs w-1/3 bg-neutral-50" 
                  placeholder="Field Name (e.g. Baggage)" 
                  value={meta.key} 
                  onChange={e => updateMetadata(idx, 'key', e.target.value)} 
                />
                <input 
                  className="input-field py-1.5 px-2.5 text-xs flex-1" 
                  placeholder="Value (e.g. 30 KG)" 
                  value={meta.value} 
                  onChange={e => updateMetadata(idx, 'value', e.target.value)} 
                />
                <button 
                  onClick={() => removeMetadataField(idx)} 
                  className="text-error-400 hover:text-error-600 p-1.5 hover:bg-error-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Row 4: Calculations & Totals */}
          <div className="flex justify-between items-end mb-2 mt-2">
             <h3 className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Calculation Results</h3>
             <button 
                onClick={handleRecalculate}
                disabled={!currentNeedsRecalc}
                className={`py-1.5 px-4 text-xs font-bold rounded-lg transition-colors shadow-sm ${currentNeedsRecalc ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
             >
               {currentNeedsRecalc ? 'Click to Recalculate' : 'Up to date'}
             </button>
          </div>
          <div className={`flex flex-col md:flex-row gap-4 p-3 rounded-xl border transition-all ${currentNeedsRecalc ? 'bg-neutral-50 border-neutral-200 opacity-60' : 'bg-primary-50/50 border-primary-100'}`}>
            <div className="flex-1 grid grid-cols-4 gap-2">
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${currentNeedsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>Tax/AIT</span>
                <span className={`text-xs font-bold ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{currentNeedsRecalc ? '---' : formatBDT(fareData.tax_ait)}</span>
              </div>
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${currentNeedsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>VAT</span>
                <span className={`text-xs font-bold ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{currentNeedsRecalc ? '---' : formatBDT(fareData.vat)}</span>
              </div>
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${currentNeedsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>Total Comm.</span>
                <span className={`text-xs font-bold ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{currentNeedsRecalc ? '---' : formatBDT(fareData.total_commission)}</span>
              </div>
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${currentNeedsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>Net Comm.</span>
                <span className={`text-xs font-bold ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{currentNeedsRecalc ? '---' : formatBDT(fareData.net_commission)}</span>
              </div>
            </div>
            
            <div className="flex items-stretch gap-2 shrink-0">
              <div className={`px-5 py-2 rounded-lg text-right flex flex-col justify-center shadow-sm ${currentNeedsRecalc ? 'bg-neutral-300 text-neutral-500' : 'bg-primary-600 text-white'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-200'}`}>Client Fare</span>
                <span className="text-sm font-black">{currentNeedsRecalc ? '---' : formatBDT(fareData.total_client_fare)}</span>
              </div>
              <div className={`px-5 py-2 rounded-lg text-right flex flex-col justify-center shadow-sm ${currentNeedsRecalc ? 'bg-neutral-300 text-neutral-500' : 'bg-success-600 text-white'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-success-200'}`}>Net Profit</span>
                <span className="text-sm font-black">{currentNeedsRecalc ? '---' : formatBDT(fareData.net_profit)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-neutral-100 mt-1">
            <button onClick={() => setShowForm(false)} className="btn-ghost py-2 px-6 text-xs font-bold">Discard</button>
            <button 
              onClick={handleSave} 
              disabled={saving || needsRecalc.some(r => r)} 
              className={`py-2 px-8 text-xs font-bold flex items-center justify-center gap-2 rounded-lg transition-colors ${needsRecalc.some(r => r) ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' : 'btn-primary'}`}
            >
              {saving ? 'Processing...' : (needsRecalc.some(r => r) ? 'Recalculate Pending Tabs' : 'Issue Ticket & Save Account')}
            </button>
          </div>
        </div>
      </Modal>

      {/* GDS Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => { setShowImportModal(false); setImportError(''); }} title="Import Ticket from GDS (Amadeus/Sabre/Galileo)">
        <div className="p-5 space-y-4">
          <div className="p-4 bg-primary-50 rounded-lg border border-primary-100">
            <p className="text-sm text-primary-800 leading-relaxed">
              <strong>How to use:</strong> Open your GDS PDF, select all text (Ctrl+A), copy it (Ctrl+C), and paste it into the box below. The system will automatically extract passenger, flight, and fare details. You can use standard parsing or AI parsing.
            </p>
          </div>

          {importError && (
            <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-medium animate-shake">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{importError}</div>
            </div>
          )}

          <div>
            <label className="label">Paste GDS Report Text *</label>
            <textarea 
              className="input-field min-h-[200px] font-mono text-xs leading-normal" 
              placeholder="NAME: RAHMAN/SAYEDUR... TICKET: 779..."
              value={gdsText}
              onChange={e => { setGdsText(e.target.value); setImportError(''); }}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowImportModal(false); setImportError(''); }} className="btn-ghost flex-1">Cancel</button>
            <button 
              onClick={parseGDS} 
              disabled={!gdsText.trim() || isAiParsing} 
              className="btn-outline flex-1 flex items-center justify-center gap-2"
              title="Fast Regex Parser"
            >
              Standard Parse
            </button>
            <button 
              onClick={parseWithAI} 
              disabled={!gdsText.trim() || isAiParsing} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex-1 flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              title="Smart AI Parser (Recommended for complex or multi-passenger tickets)"
            >
              {isAiParsing ? 'AI Parsing...' : 'Parse with AI (Smart)'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
