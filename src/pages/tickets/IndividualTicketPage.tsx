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
  passport_number?: string;
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
  ticketing_source: 'gds' as 'gds' | 'non_gds',
  ticket_category: 'international' as 'domestic' | 'international',
  ticket_number: '',
  passenger_name: '',
  passport_number: '',
  passport_expiry: '',
  mobile: '',
  issue_date: new Date().toISOString().split('T')[0],
  airline: '',
  flight_number: '',
  pnr: '',
  origin: 'DAC',
  destination: '',
  travel_date: '',
  return_date: '',
  cabin_class: 'economy',
  base_fare: 0,
  total_fare_input: 0,
  
  // Tax fields breakdown (Domestic & International)
  ut: 0,
  bd: 0,
  e5: 0,
  ow: 0,
  p7: 0,
  p8: 0,
  e7: 0,
  g8: 0,
  ts: 0,
  custom_taxes: [] as { code: string; amount: number }[],

  commission_rate: 7,
  service_charge: 0,
  discount: 0,
  status: 'issued' as 'issued' | 'hold' | 'refunded' | 'voided',
  time_limit: '',
  supplier_id: '',
  metadata: [
    { key: 'Baggage', value: '30 KG' },
  ] as { key: string; value: string }[]
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [gdsText, setGdsText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [importError, setImportError] = useState('');
  const [invoiceData, setInvoiceData] = useState<any[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);

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
    let base = Math.max(0, Number(fData.base_fare) || 0);
    let total_input = Math.max(0, Number(fData.total_fare_input) || 0);
    
    const bd = Math.max(0, Number(fData.bd) || 0);
    const e5 = Math.max(0, Number(fData.e5) || 0);
    const ow = Math.max(0, Number(fData.ow) || 0);
    const p7 = Math.max(0, Number(fData.p7) || 0);
    const p8 = Math.max(0, Number(fData.p8) || 0);
    const ut = Math.max(0, Number(fData.ut) || 0);
    const e7 = Math.max(0, Number(fData.e7) || 0);
    const g8 = Math.max(0, Number(fData.g8) || 0);
    const ts = Math.max(0, Number(fData.ts) || 0);
    const discount = Math.max(0, Number(fData.discount) || 0);
    const customTaxSum = (fData.custom_taxes || []).reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);

    const itemizedTaxSum = bd + e5 + ow + p7 + p8 + ut + e7 + g8 + ts + customTaxSum;

    let tax_ait = itemizedTaxSum;
    if (tax_ait === 0 && total_input > base) {
      tax_ait = total_input - base;
    }

    if (total_input === 0 && base > 0) {
      total_input = base + tax_ait;
    } else if (base === 0 && total_input > 0) {
      base = Math.max(0, total_input - tax_ait);
    }

    const calculated_total_fare = total_input > 0 ? total_input : (base + tax_ait);

    const comm_rate = Math.max(0, Number(fData.commission_rate) || 0);
    const svc = Math.max(0, Number(fData.service_charge) || 0);

    const commission = Math.round(base * (comm_rate / 100));

    // AIT (BSP Bangladesh): (Total Fare − BD − UT − E5) × 0.30%
    const ait = Math.max(0, Math.round((calculated_total_fare - bd - ut - e5) * 0.003));

    // IATA Payment (BSP Net Remittance): Total − Commission − AIT
    const iata_payment = Math.max(0, Math.round(calculated_total_fare - commission - ait));

    // VAT 3% on base (kept for internal ledger)
    const vat = Math.round((calculated_total_fare - itemizedTaxSum) * 0.03);
    const net_commission = Math.round(commission - (vat * 0.5));

    const total_client_fare = calculated_total_fare + svc - discount;
    const net_profit = Math.round(commission + svc - discount);
    
    return { 
      base, 
      total_input: calculated_total_fare, 
      itemizedTaxSum,
      bd, e5, ow, p7, p8, ut, e7, g8, ts,
      discount,
      comm_rate, svc, tax_ait, vat, commission,
      net_commission,
      ait,
      iata_payment,
      total_client_fare,
      net_profit 
    };
  };

  const isFormValid = () => {
    return forms.every(f => 
      f.passenger_name?.trim() && 
      f.airline?.trim() && 
      f.origin?.trim() && 
      f.destination?.trim() && 
      f.travel_date?.trim() &&
      f.pnr?.trim()
    );
  };

  const handleClientAutofill = async (field: 'mobile' | 'passport_number', val: string) => {
    if (!val || val.length < 5) return;
    try {
      const { data } = await supabase.from('customers').select('full_name').eq(field, val).single();
      if (data && data.full_name) {
        setForms(prev => {
          const next = [...prev];
          if (!next[activeTab].passenger_name) {
             next[activeTab] = { ...next[activeTab], passenger_name: data.full_name };
          }
          return next;
        });
        setSuccess('Customer found! Name auto-filled.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      // Not found, ignore
    }
  };

  const handleSave = async () => {
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
    
    const payloads = forms.map((f) => {
      const fd = getFareData(f);
      const cost_fare = fd.total_client_fare - fd.net_profit;
      const combinedTaxes = {
        category: f.ticket_category,
        ticketing_source: f.ticketing_source,
        ut: f.ut, bd: f.bd, e5: f.e5, ow: f.ow, p7: f.p7, p8: f.p8, e7: f.e7, g8: f.g8, ts: f.ts,
        custom_taxes: f.custom_taxes || [],
        passport_number: f.passport_number || '',
        mobile: f.mobile || '',
        passport_expiry: f.passport_expiry || '',
        issue_date: f.issue_date || '',
        time_limit: f.time_limit || '',
        flight_number: f.flight_number || '',
        discount: f.discount || 0,
        ait: fd.ait,
        iata_payment: fd.iata_payment,
        metadata: f.metadata || []
      };

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
        ait_amount: fd.ait,
        service_charge: fd.svc,
        total_fare: fd.total_client_fare,
        cost_fare: cost_fare,
        profit: fd.net_profit,
        status: f.status,
        supplier_id: f.supplier_id || null,
        ticket_type: 'individual',
        sales_agent_id: profile?.id,
        metadata: JSON.stringify(combinedTaxes)
      };
    });

    const { error: err } = await supabase.from('air_tickets').insert(payloads);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(`${forms.length} Ticket(s) issued successfully!`);
      setInvoiceData(payloads);
      setShowForm(false);
      setForms([{ ...emptyForm }]);
      setActiveTab(0);
      loadTickets();
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error: updateErr } = await supabase.from('air_tickets').update({ status: newStatus }).eq('id', id);
      if (updateErr) throw updateErr;
      setTickets(tickets.map(t => t.id === id ? { ...t, status: newStatus } : t));
      setSuccess('Status updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filtered = tickets.filter(t =>
    t.passenger_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.pnr?.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.airline?.toLowerCase().includes(search.toLowerCase())
  );

  const updateActiveForm = (field: string, val: any) => {
    setForms(prev => {
      const next = [...prev];
      next[activeTab] = { ...next[activeTab], [field]: val };
      return next;
    });
  };

  const addCustomTaxField = () => {
    setForms(prev => {
      const next = [...prev];
      const list = [...(next[activeTab].custom_taxes || []), { code: '', amount: 0 }];
      next[activeTab] = { ...next[activeTab], custom_taxes: list };
      return next;
    });
  };

  const updateCustomTaxField = (idx: number, field: 'code' | 'amount', val: any) => {
    setForms(prev => {
      const next = [...prev];
      const list = [...(next[activeTab].custom_taxes || [])];
      list[idx] = { ...list[idx], [field]: field === 'amount' ? (Number(val) || 0) : val.toUpperCase() };
      next[activeTab] = { ...next[activeTab], custom_taxes: list };
      return next;
    });
  };

  const removeCustomTaxField = (idx: number) => {
    setForms(prev => {
      const next = [...prev];
      const list = [...(next[activeTab].custom_taxes || [])];
      list.splice(idx, 1);
      next[activeTab] = { ...next[activeTab], custom_taxes: list };
      return next;
    });
  };

  const copyFlightDetailsToNewPassenger = () => {
    const currentForm = forms[activeTab];
    const clonedForm = {
      ...currentForm,
      passenger_name: '',
      passport_number: '',
      mobile: '',
      ticket_number: ''
    };
    setForms(prev => [...prev, clonedForm]);
    setActiveTab(forms.length);
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
    setActiveTab(forms.length);
  };

  const removePassengerTab = (indexToRemove: number) => {
    if (forms.length <= 1) return;
    setForms(prev => prev.filter((_, i) => i !== indexToRemove));
    setActiveTab(prev => (prev >= indexToRemove ? Math.max(0, prev - 1) : prev));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setImportError('');
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setIsExtractingPdf(true);
      try {
        const text = await extractTextFromPdf(file);
        setGdsText(text);
        setSuccess('PDF text extracted successfully! You can now parse it.');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setImportError(err.message || 'Failed to extract text from PDF.');
      } finally {
        setIsExtractingPdf(false);
      }
    } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => setGdsText(e.target?.result as string);
      reader.readAsText(file);
    } else {
      setImportError('Please drop a valid PDF or text file.');
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load PDF parser library.'));
        document.body.appendChild(script);
      });
      const workerScript = document.createElement('script');
      workerScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = workerScript.src;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  };

  const parseGDS = () => {
    setImportError('');
    const text = gdsText.trim();
    if (!text) {
      setImportError('Please paste ticket text before parsing.');
      return;
    }

    const newData = { ...emptyForm };

    const forbiddenWords = [
      'PRIZE', 'PROMO', 'ERROR', 'MESSAGE', 'ECONOMY', 'BUSINESS', 'FIRST', 'ADULT',
      'CHILD', 'INFANT', 'TERMS', 'CONDITIONS', 'PAYMENT', 'METHOD', 'CREDIT', 'DEBIT',
      'TOTAL', 'FARE', 'TAX', 'FEE', 'REF', 'CODE', 'BOOKING', 'STATUS', 'ISSUED',
      'DATE', 'FLIGHT', 'TICKET', 'COUPON', 'NOTICE', 'AGENCY', 'COMPANY', 'US-BANGLA',
      'BIMAN', 'AIRLINE', 'AIRLINES', 'ROUTING', 'ENDORSEMENT', 'CHECK-IN', 'BAGGAGE',
      'SERVICE', 'CHARGE', 'PASSENGER', 'ITINERARY', 'RECEIPT', 'ELECTRONIC', 'RECORD',
      'AGENT', 'TRAVELS', 'PURANA', 'PALTAN', 'DARUS', 'SALAM', 'ADDRESS', 'TELEPHONE', 'IATA'
    ];

    // 1. TICKET NUMBER (Extracted first because it helps find the name in LCCs)
    let extractedTicket = '';
    const ticketPrefixMatch = text.match(/(?:TICKET|ETKT|TKT|ETICKET|TICKET NUMBER)\s*[:.#\-\s]*(\d{3})[.\-\s]*(\d{10})\b/i);
    if (ticketPrefixMatch) {
      extractedTicket = ticketPrefixMatch[1] + ticketPrefixMatch[2];
    } else {
      // Standalone 13 digit number (Very common in LCC tables)
      const standaloneTicket = text.match(/\b(\d{3})[-\s]?(\d{10})\b/);
      if (standaloneTicket) extractedTicket = standaloneTicket[1] + standaloneTicket[2];
    }
    if (extractedTicket) newData.ticket_number = extractedTicket;

    // 2. PASSENGER NAME
    let extractedName = '';
    
    // Strict GDS Format: LASTNAME/FIRSTNAME TITLE
    const strictSlashMatch = text.match(/\b([A-Za-z]{2,}\s*\/\s*[A-Za-z]{2,}\s+(?:MR|MS|MRS|MSTR|MISS))\b/i);
    if (strictSlashMatch) {
      extractedName = strictSlashMatch[1].trim();
    }

    if (!extractedName && extractedTicket) {
      // LCC Format: Title First Last 1234567890123
      const nameBeforeTicket = new RegExp(`(?:Mr\\.|Mrs\\.|Ms\\.|Mstr\\.|Mr |Ms |Mrs )\\s+([A-Za-z\\s.]+?)\\s+${extractedTicket}`, 'i');
      const lccMatch = text.match(nameBeforeTicket);
      if (lccMatch) extractedName = lccMatch[1].trim();
    }

    if (!extractedName) {
      const namePrefixMatch = 
        text.match(/(?:PASSENGER\s+NAME|PAX\s+NAME|NAME)\s*[:#\-=\s]+\s*([A-Za-z\s.,/]+?)(?=\s*(?:PNR|TICKET|ETKT|BOOKING|FLIGHT|DATE|TOTAL|FARE|CLASS|FORM OF|FOOP|RL|REF|RESERVATION|STATUS|ISSD|ISSUING|\r|\n|$))/i) ||
        text.match(/(?:1\.|2\.|3\.|01\.|02\.)\s*([A-Za-z\s.,/]+?)(?=\s*(?:PNR|TICKET|ETKT|BOOKING|FLIGHT|DATE|TOTAL|FARE|CLASS|\r|\n|$))/i);

      if (namePrefixMatch) {
        let cand = namePrefixMatch[1].replace(/[\r\n]+/g, ' ').trim();
        cand = cand.replace(/^[:\s-]+/, '').trim();
        const upperCand = cand.toUpperCase();
        if (!forbiddenWords.some(w => upperCand.includes(w)) && !upperCand.includes('BAG') && !upperCand.includes('ALLOWANCE') && !upperCand.includes('TICKET') && cand.length > 2) {
          extractedName = cand;
        }
      }
    }

    if (!extractedName) {
      const titleNameMatch = text.match(/(?:Mr\.|Mrs\.|Ms\.|Mstr\.|Mr |Ms |Mrs )\s+([A-Za-z\s.]+?)(?=\s+\d{10,14}|\s+MAAS|\s+Adult|\r|\n|$)/i);
      if (titleNameMatch) {
        extractedName = titleNameMatch[1].trim();
      }
    }

    if (extractedName) {
      newData.passenger_name = extractedName.toUpperCase();
    }

    // 3. PNR / BOOKING REFERENCE
    const invalidPnrs = ['ERENCE', 'NUMBER', 'AMADEU', 'GALILE', 'SABRE', 'REFNUM', 'CODE00', 'STATUS', 'DETAILS', 'TICKET', 'TRAVEL', 'FLIGHT', 'AGENCY', 'SYSTEM', 'OFFICE', 'ONLINE', 'BAGGAG', 'ALLOWA', 'BOOKIN'];
    const pnrMatches = [
      ...text.matchAll(/(?:PNR|BOOKING REFERENCE|BOOKING REF|RESERVATION CODE|RESERVATION NO|RECORD LOCATOR|CONFIRMATION|RL)\s*[:#\-=\s]*\s*(?:AMADEUS|GALILEO|SABRE|1A|1G|1P|1V|AIRLINE)?\s*[:#\s]*\s*(?:[A-Z0-9]{2}\/)?([A-Z0-9]{5,6})\b/gi)
    ];

    for (const match of pnrMatches) {
      const val = match[1].toUpperCase();
      if (!invalidPnrs.includes(val) && !/^\d+$/.test(val) && /^[A-Z0-9]{5,6}$/.test(val)) {
        newData.pnr = val;
        break;
      }
    }

    if (!newData.pnr) {
      // Check LCC trailing formats like "09KVG0 Booking reference"
      const trailingPnr = text.match(/\b([A-Z0-9]{6})\s+Booking reference/i);
      if (trailingPnr) {
         newData.pnr = trailingPnr[1].toUpperCase();
      } else {
        // Fallback: look for an isolated 6 character alphanumeric that mixes letters and numbers
        const pnrStandalone = text.match(/\b([A-Z0-9]{6})\b/gi);
        if (pnrStandalone) {
          for (const match of pnrStandalone) {
             const val = match.toUpperCase();
             if (!invalidPnrs.includes(val) && /[A-Z]/.test(val) && /[0-9]/.test(val)) {
               newData.pnr = val;
               break;
             }
          }
        }
      }
    }

    // 3. TICKET NUMBER
    const tktMatch = 
      text.match(/(?:TICKET NUMBER|ETKT|TICKET NO|TICKET)\s*[:#\s]*\s*([0-9\s-]{10,20})/i) ||
      text.match(/\b(\d{3}[-\s]?\d{10})\b/);
      
    if (tktMatch) {
      newData.ticket_number = tktMatch[1].replace(/[\s-]/g, '').trim();
    }

    // 4. AIRLINE DETECTION (Header vs Code Matching vs Ticket Prefix)
    let extractedAirline = '';
    const issuingMatch = text.match(/(?:ISSUING\s+AIRLINE|AIRLINE|CARRIER)\s*[:#\-=\s]*\s*([A-Z0-9\s-]+?)(?=\s*(?:TICKET|ETKT|BOOKING|DATE|PNR|\r|\n|$))/i);
    if (issuingMatch) {
      const cand = issuingMatch[1].trim();
      if (cand.length > 2 && !forbiddenWords.includes(cand.toUpperCase()) && !cand.toUpperCase().includes('NOT ')) {
        extractedAirline = cand;
      }
    }

    if (!extractedAirline) {
      if (/CATHAY\s*PACIFIC|\bCX\b/i.test(text)) extractedAirline = 'Cathay Pacific';
      else if (/US-BANGLA|US BANGLA|\bBS\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('321'))) extractedAirline = 'US-Bangla Airlines';
      else if (/\b(BIMAN|BANGLADESH AIRLINES)\b/i.test(text) || (extractedTicket && (extractedTicket.startsWith('997') || extractedTicket.startsWith('779')))) extractedAirline = 'Biman Bangladesh Airlines';
      else if (/AIR ARABIA|\bG9\b/i.test(text)) extractedAirline = 'Air Arabia';
      else if (/FLYDUBAI|\bFZ\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('141'))) extractedAirline = 'flydubai';
      else if (/EMIRATES|\bEK\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('176'))) extractedAirline = 'Emirates';
      else if (/SAUDIA|SAUDI ARABIAN|\bSV\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('065'))) extractedAirline = 'Saudia';
      else if (/QATAR|\bQR\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('157'))) extractedAirline = 'Qatar Airways';
      else if (/GULF AIR|\bGF\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('072'))) extractedAirline = 'Gulf Air';
      else if (/KUWAIT|\bKU\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('229'))) extractedAirline = 'Kuwait Airways';
      else if (/JAZEERA|\bJ9\b/i.test(text)) extractedAirline = 'Jazeera Airways';
      else if (/SALAMAIR|\bOV\b/i.test(text)) extractedAirline = 'SalamAir';
      else if (/MALAYSIA AIRLINES|\bMH\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('232'))) extractedAirline = 'Malaysia Airlines';
      else if (/SINGAPORE AIRLINES|\bSQ\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('618'))) extractedAirline = 'Singapore Airlines';
      else if (/THAI AIRWAYS|\bTG\b/i.test(text) || (extractedTicket && extractedTicket.startsWith('217'))) extractedAirline = 'Thai Airways';
      else if (/INDIGO|\b6E\b/i.test(text)) extractedAirline = 'IndiGo';
      else if (/NOVOAIR|NOVO AIR|\bVQ\b/i.test(text)) extractedAirline = 'Novoair';
      else if (/AIR ASTRA|\b2A\b/i.test(text)) extractedAirline = 'Air Astra';
    }

    const normalizeAirlineName = (raw: string, list: string[]) => {
      if (!raw) return '';
      const trimmed = raw.trim();
      const listMatch = list.find(a => a.toLowerCase() === trimmed.toLowerCase());
      if (listMatch) return listMatch;
      const subMatch = list.find(a => a.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(a.toLowerCase()));
      if (subMatch) return subMatch;
      return trimmed.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    };

    if (extractedAirline) {
      newData.airline = normalizeAirlineName(extractedAirline, airlineList);
    } else {
      const flightMatch = text.match(/\b([A-Z0-9]{2})\s*\d{3,4}\b/);
      if (flightMatch) {
        const code = flightMatch[1].toUpperCase();
        if (code === 'CX') newData.airline = 'Cathay Pacific';
        else if (code === 'BG') newData.airline = 'Biman Bangladesh Airlines';
        else if (code === 'BS') newData.airline = 'US-Bangla Airlines';
        else if (code === 'G9') newData.airline = 'Air Arabia';
        else if (code === 'FZ') newData.airline = 'flydubai';
        else if (code === 'EK') newData.airline = 'Emirates';
        else if (code === 'SV') newData.airline = 'Saudi Airlines (Saudia)';
        else if (code === 'QR') newData.airline = 'Qatar Airways';
        else if (code === 'SQ') newData.airline = 'Singapore Airlines';
        else if (code === 'MH') newData.airline = 'Malaysia Airlines';
        else if (code === 'TG') newData.airline = 'Thai Airways';
        else if (code === '6E') newData.airline = 'IndiGo';
        else if (code === 'VQ') newData.airline = 'Novoair';
        else if (code === '2A') newData.airline = 'Air Astra';
      }
    }

    // 5. ROUTE / ORIGIN & DESTINATION
    let routeCodeMatch = text.match(/\b([A-Z]{3})\s*(?:\([A-Z]{3}\))?\s*(?:-|TO|\/|\u2192|\u279C|➜|➔)\s*([A-Z]{3})\b/i);
    if (!routeCodeMatch) {
       routeCodeMatch = text.match(/\(([A-Z]{3})\)\s*[A-Za-z]+\s*\(([A-Z]{3})\)/i);
    }
    
    if (routeCodeMatch) {
      newData.origin = routeCodeMatch[1].toUpperCase();
      newData.destination = routeCodeMatch[2].toUpperCase();
    } else {
      const cityCodes: Record<string, string> = {
        'DHAKA': 'DAC', 'CHATTOGRAM': 'CGP', 'CHITTAGONG': 'CGP', 'COX': 'CXB', "COX'S BAZAR": 'CXB', 
        'SYLHET': 'ZYL', 'JASHORE': 'JSR', 'JESSORE': 'JSR', 'SAIDPUR': 'SPD', 'RAJSHAHI': 'RJH', 'BARISHAL': 'BZL',
        'DUBAI': 'DXB', 'SHARJAH': 'SHJ', 'ABU DHABI': 'AUH', 'DOHA': 'DOH', 'RIYADH': 'RUH', 'JEDDAH': 'JED', 
        'KUALA LUMPUR': 'KUL', 'SINGAPORE': 'SIN', 'BANGKOK': 'BKK', 'KOLKATA': 'CCU', 'DELHI': 'DEL', 'MUMBAI': 'BOM'
      };
      
      const cityNames = Object.keys(cityCodes).join('|');
      const routeWordMatch = text.match(new RegExp(`\\b(${cityNames})\\b\\s*(?:-|TO|/|➜|➔)\\s*\\b(${cityNames})\\b`, 'i'));
      if (routeWordMatch) {
        newData.origin = cityCodes[routeWordMatch[1].toUpperCase()];
        newData.destination = cityCodes[routeWordMatch[2].toUpperCase()];
      }
    }

    // 6. TRAVEL DATE (Flight Schedule Date vs Ticket Issue Date)
    const monthNames: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };

    let issueYear = new Date().getFullYear().toString(); // Default to current year instead of 2026
    const issueDateMatch = text.match(/(?:DATE|ISSUED)\s*[:#\s]*\s*\d{1,2}\s+[A-Z]{3}\s+(\d{4})/i);
    if (issueDateMatch) issueYear = issueDateMatch[1];

    const flightTableMatch = 
      text.match(/\b(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{2,4})\b/i) || 
      text.match(/\b(\d{1,2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d{2,4})?\b/i);

    if (flightTableMatch) {
      const day = flightTableMatch[1].padStart(2, '0');
      const month = monthNames[flightTableMatch[2].toUpperCase()];
      let year = flightTableMatch[3] || issueYear;
      if (year.length === 2) year = '20' + year;
      newData.travel_date = year + '-' + month + '-' + day;
    } else {
      const dateMatch = 
        text.match(/(?:TRAVEL DATE|DEPARTURE DATE|FLIGHT DATE|DEPARTURE)\s*[:#\-=\s]*\s*(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{2,4})/i) ||
        text.match(/\b(\d{1,2})\s*([A-Za-z]{3})\s*(\d{4})\b/i) ||
        text.match(/\b(\d{1,2})[-\s/]([A-Za-z]{3})[-\s/](\d{2})\b/i) ||
        text.match(/\b(\d{4})[-\s/](\d{1,2})[-\s/](\d{1,2})\b/) ||
        text.match(/\b(\d{1,2})[-\s/](\d{1,2})[-\s/](\d{4})\b/);

      if (dateMatch) {
        const potentialMonth = dateMatch[2]?.toUpperCase();
        if (potentialMonth && monthNames[potentialMonth]) {
          const day = dateMatch[1].padStart(2, '0');
          const month = monthNames[potentialMonth];
          let year = dateMatch[3] || issueYear;
          if (year.length === 2) year = '20' + year;
          newData.travel_date = year + '-' + month + '-' + day;
        } else if (dateMatch[1] && dateMatch[1].length === 4) {
          newData.travel_date = dateMatch[1] + '-' + dateMatch[2].padStart(2, '0') + '-' + dateMatch[3].padStart(2, '0');
        } else if (dateMatch[3] && dateMatch[3].length === 4) {
          newData.travel_date = dateMatch[3] + '-' + dateMatch[2].padStart(2, '0') + '-' + dateMatch[1].padStart(2, '0');
        }
      }
    }

    // 7. TOTAL & BASE FARES (Prioritizes BDT Equivalent / Equiv Fare Paid)
    const fareMatch = 
      text.match(/(?:EQUIV FARE(?:\s+PAID)?|EQUIV FARE AMOUNT|BASE FARE(?:\s+TOTAL)?(?:\s+AMOUNT)?)\s*[:#\s]*\s*(?:BDT|USD)?\s*([\d,]+(?:\.\d+)?)/i) ||
      text.match(/(?:AIR FARE|FARE AMOUNT)\s*[:#\s]*\s*(?:BDT|USD)?\s*([\d,]+(?:\.\d+)?)/i);
    
    const totalMatch = 
      text.match(/(?:TOTAL(?:\s+TICKET)?\s+FARE(?:\s+AMOUNT)?|TOTAL\s+AMOUNT|GRAND\s+TOTAL|\bTOTAL\b)\s*[:#\s]*\s*(?:BDT|USD)?\s*([\d,]+(?:\.\d+)?)/i) ||
      text.match(/BDT\s*([\d,]{4,8})/i);

    if (totalMatch && fareMatch) {
      const totalVal = parseInt(totalMatch[1].replace(/,/g, ''));
      const fareVal = parseInt(fareMatch[1].replace(/,/g, ''));
      if (totalVal > 0) newData.total_fare_input = totalVal;
      if (fareVal > 0) newData.base_fare = fareVal;
    } else if (totalMatch) {
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

    // 8. TAX BREAKDOWN (Domestic & International Tax Codes)
    const extractTax = (code: string): number => {
      const p1 = new RegExp(`\\b([\\d,]+(?:\\.\\d+)?)\\s*${code}\\b`, 'i');
      const p2 = new RegExp(`\\b${code}\\b\\s*[:#\\s]*\\s*([\\d,]+(?:\\.\\d+)?)`, 'i');
      const m1 = text.match(p1);
      if (m1) return parseInt(m1[1].replace(/,/g, ''));
      const m2 = text.match(p2);
      if (m2) return parseInt(m2[1].replace(/,/g, ''));
      return 0;
    };

    newData.ut = extractTax('UT');
    newData.bd = extractTax('BD');
    newData.e5 = extractTax('E5');
    newData.ow = extractTax('OW');
    newData.p7 = extractTax('P7');
    newData.p8 = extractTax('P8');
    newData.e7 = extractTax('E7');
    newData.g8 = extractTax('G8');
    newData.ts = extractTax('TS');

    // Extract extra/unrecognized taxes into custom_taxes (e.g. 1101G3, 1023I5)
    const taxBlockMatch = text.match(/(?:TAX|XT)\s*[:#\s]*\s*([\s\S]+?)(?=\s*(?:TOTAL|GRAND TOTAL|FLIGHT|SOURCE|\r\n\r\n|$))/i);
    const taxBlockText = taxBlockMatch ? taxBlockMatch[1] : text;

    const customTaxes: { code: string; amount: number }[] = [];
    const knownCodes = ['BD', 'E5', 'OW', 'P7', 'P8', 'UT', 'E7', 'G8', 'TS', 'USD', 'BDT', 'NUC', 'END', 'ROE', 'KG', 'CO2', 'MR', 'MS', 'PC', 'ST', 'CL', 'OK', 'NO'];
    const taxMatches = [...taxBlockText.matchAll(/\b([\d,]+(?:\.\d+)?)\s*([A-Z0-9]{2})\b/gi)];
    for (const tm of taxMatches) {
      const amt = parseInt(tm[1].replace(/,/g, ''));
      const code = tm[2].toUpperCase();
      if (amt > 10 && !knownCodes.includes(code) && !/^\d+$/.test(code)) {
        if (!customTaxes.some(t => t.code === code)) {
          customTaxes.push({ code, amount: amt });
        }
      }
    }
    newData.custom_taxes = customTaxes;

    // Auto detect domestic vs international correctly
    if (newData.destination && ['CXB', 'CGP', 'ZYL', 'SPD', 'JSR', 'RJH', 'BZL', 'COX', 'DAC'].includes(newData.destination.toUpperCase()) && ['CXB', 'CGP', 'ZYL', 'SPD', 'JSR', 'RJH', 'BZL', 'COX', 'DAC'].includes(newData.origin.toUpperCase())) {
      newData.ticket_category = 'domestic';
    } else if (newData.destination) {
      newData.ticket_category = 'international';
    }

    setForms([newData]);
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

      const prompt = `You are an expert aviation ticket parser for travel agencies in Bangladesh and worldwide. Analyze the following e-Ticket / GDS report text (from Cathay Pacific, US-Bangla Airlines, Biman Bangladesh, Air Arabia, flydubai, Saudia, Emirates, Amadeus, Sabre, Galileo, etc.) and extract an array of passenger ticket objects.

REQUIRED JSON FIELD SPECIFICATIONS:
1. "passenger_name": Full passenger name (e.g. "NOBEN/INMUR RASHID MR" or "MD NASARUL HASAN"). Look for "NAME:" or "PASSENGER NAME:". NEVER output document headers like "ELECTRONIC TICKET" or "ITINERARY RECEIPT".
2. "pnr": 6-character booking reference / PNR code (e.g. "9XEUBG" or "K9X2P4"). Strip any prefix like "AMADEUS:".
3. "ticket_number": 10 to 14 digit e-ticket number (e.g. "1604833304579" or "6102416456211"). Digits only.
4. "airline": Operating or Issuing airline name (e.g. "Cathay Pacific", "US-Bangla Airlines", "Biman Bangladesh Airlines", "Air Arabia", "flydubai", "Emirates", "Saudia", "Qatar Airways"). Look for "ISSUING AIRLINE:".
5. "origin": 3-letter IATA origin airport code (e.g. "DAC", "CGP", "ZYL").
6. "destination": 3-letter IATA destination airport code (e.g. "HKG", "ICN", "CXB", "CGP", "ZYL", "JED", "MED", "DXB", "KUL", "SIN", "BKK", "DOH").
7. "travel_date": Flight travel/departure date formatted as YYYY-MM-DD (e.g. "2026-08-28" for "28AUG"). Combine day-month with ticket issue year (e.g. 2026).
8. "base_fare": Base airfare amount in BDT as a number. Prioritize "EQUIV FARE PAID" or "EQUIV FARE" in BDT over USD airfare.
9. "total_fare": Total ticket price in BDT as a number (e.g. "62137").
10. "ut_tax", "bd_tax", "e5_tax", "ow_tax", "p7_tax", "p8_tax", "e7_tax", "g8_tax", "ts_tax": Specific tax breakdown numbers if mentioned (e.g. "500BD" -> bd_tax: 500, "446E5" -> e5_tax: 446, "2500OW" -> ow_tax: 2500, "1234P7" -> p7_tax: 1234, "1234P8" -> p8_tax: 1234, "6000UT" -> ut_tax: 6000).
11. "ticket_category": "domestic" or "international".
12. "extra_info": Array of key-value objects for baggage, class, meal, or custom tax codes like G3 (1101) and I5 (1023).

Text to parse:
"""
` + text + `
"""

Return ONLY a raw JSON array of passenger objects. Do NOT wrap in markdown syntax.`;

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
          ticket_category: p.ticket_category === 'domestic' ? 'domestic' : 'international',
          ticketing_source: 'gds', // Automatically sets to GDS if parsed from GDS text
          passenger_name: p.passenger_name || '',
          ticket_number: p.ticket_number || '',
          pnr: p.pnr || '',
          airline: p.airline || '',
          origin: p.origin || 'DAC',
          destination: p.destination || 'CXB',
          travel_date: p.travel_date || '',
          base_fare: Number(p.base_fare) || 0,
          total_fare_input: Number(p.total_fare) || 0,
          ut: Number(p.ut_tax) || 0,
          bd: Number(p.bd_tax) || 0,
          e5: Number(p.e5_tax) || 0,
          ow: Number(p.ow_tax) || 0,
          p7: Number(p.p7_tax) || 0,
          p8: Number(p.p8_tax) || 0,
          e7: Number(p.e7_tax) || 0,
          g8: Number(p.g8_tax) || 0,
          ts: Number(p.ts_tax) || 0,
          metadata: Array.isArray(p.extra_info) ? p.extra_info : []
        }));

        setForms(newForms);
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
  const fareData = getFareData(form);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (showForm && isFormValid() && !saving) {
          handleSave();
        }
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        if (showForm) {
          addNewPassengerTab();
        }
      }
      if (e.key === 'Escape') {
        if (showForm) setShowForm(false);
        if (showImportModal) setShowImportModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, showImportModal, forms, activeTab, saving]);

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
                    <div className="text-xs text-neutral-400">
                      {ticket.passport_number || (ticket.metadata ? JSON.parse(ticket.metadata).passport_number : '')}
                    </div>
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
                  <td className="table-cell text-right font-semibold text-sm">
                    <span className={ticket.profit >= 0 ? 'text-success-600' : 'text-error-600'}>
                      {formatBDT(ticket.profit)}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <select 
                      className={`text-[11px] font-bold rounded px-2 py-1 border-0 cursor-pointer outline-none shadow-sm ${
                        ticket.status === 'issued' ? 'bg-success-100 text-success-700' :
                        ticket.status === 'hold' ? 'bg-warning-100 text-warning-700' :
                        ticket.status === 'voided' ? 'bg-neutral-100 text-neutral-700' :
                        'bg-error-100 text-error-700'
                      }`}
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                    >
                      <option value="issued">Issued</option>
                      <option value="hold">Hold</option>
                      <option value="voided">Voided</option>
                      <option value="refunded">Refunded</option>
                      <option value="reissued">Reissued</option>
                    </select>
                    {ticket.status === 'hold' && ticket.metadata && JSON.parse(ticket.metadata).time_limit && (
                      <div className="text-[10px] mt-1.5 font-bold text-error-600 bg-error-50 px-1 py-0.5 rounded border border-error-100">
                        TTL: {new Date(JSON.parse(ticket.metadata).time_limit).toLocaleString()}
                      </div>
                    )}
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
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Issue Air Ticket" size="xl">
        <div className="space-y-3 max-h-[82vh] overflow-y-auto pr-1">
          
          {/* Sticky Top Header: Multi-Passenger Tabs & Clone Options */}
          <div className="sticky top-0 bg-white z-10 pt-1 pb-2 border-b border-neutral-200 flex items-center justify-between overflow-x-auto gap-2">
            <div className="flex gap-1 items-center">
              {forms.map((f, i) => (
                <div key={i} className={`flex items-center rounded-t-lg transition-colors border-b-2 ${activeTab === i ? 'bg-primary-50 border-primary-600' : 'hover:bg-neutral-50 border-transparent'}`}>
                  <button 
                    onClick={() => setActiveTab(i)}
                    className={`px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${activeTab === i ? 'text-primary-700 font-bold' : 'text-neutral-500'}`}
                  >
                    👤 {f.passenger_name || `Passenger ${i+1}`}
                  </button>
                  {forms.length > 1 && (
                    <button onClick={() => removePassengerTab(i)} className="pr-2 pl-1 text-neutral-400 hover:text-error-500 font-bold">&times;</button>
                  )}
                </div>
              ))}
              <button onClick={addNewPassengerTab} className="px-3 py-1.5 text-xs text-primary-600 font-semibold hover:bg-primary-50 rounded-t-lg flex items-center gap-1 border-b-2 border-transparent">
                <Plus size={12} /> Add Passenger
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {forms.length > 0 && (
                <button onClick={copyFlightDetailsToNewPassenger} className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 flex items-center gap-1 transition-colors shadow-sm" title="Copy current flight route to new passenger tab">
                  📋 Copy Route
                </button>
              )}
              <span className="text-[11px] font-mono font-bold text-primary-700 bg-primary-100/80 px-2.5 py-0.5 rounded-md border border-primary-300">
                PNR: {form.pnr || 'NOT SET'}
              </span>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 p-2 bg-error-50 border border-error-200 text-error-700 rounded-lg text-[11px]">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Platform & Category Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-100 flex flex-col sm:flex-row gap-3 justify-between items-start">
            <div className="flex flex-col gap-2 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider w-20 shrink-0">Platform:</span>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input type="radio" name={`platform_${activeTab}`} checked={form.ticketing_source === 'gds'} onChange={() => updateActiveForm('ticketing_source', 'gds')} className="text-indigo-600 focus:ring-indigo-500" />
                  🌐 GDS (Sabre/Amadeus/Galileo)
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input type="radio" name={`platform_${activeTab}`} checked={form.ticketing_source === 'non_gds'} onChange={() => updateActiveForm('ticketing_source', 'non_gds')} className="text-indigo-600 focus:ring-indigo-500" />
                  ✈️ Non-GDS (LCC/Portal)
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider w-20 shrink-0">Category:</span>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input type="radio" name={`cat_${activeTab}`} checked={form.ticket_category === 'domestic'} onChange={() => updateActiveForm('ticket_category', 'domestic')} className="text-primary-600 focus:ring-primary-500" />
                  🏠 Domestic (অভ্যন্তরীণ)
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                  <input type="radio" name={`cat_${activeTab}`} checked={form.ticket_category === 'international'} onChange={() => updateActiveForm('ticket_category', 'international')} className="text-primary-600 focus:ring-primary-500" />
                  🌍 International (আন্তর্জাতিক)
                </label>
              </div>
            </div>
            <button onClick={() => { setShowForm(false); setShowImportModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm shrink-0">
              <Download size={14} /> Import GDS Text
            </button>
          </div>

          {/* ─── Step 1: Passenger & Reservation Info ─── */}
          <div className="card p-3 border border-blue-100 bg-blue-50/20 space-y-2.5 shadow-xs rounded-xl">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider border-b border-blue-100 pb-1.5">
              👤 Step 1 — যাত্রীর তথ্য (Passenger Info)
            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-4">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Passenger Name *</label>
                <input className={`input-field py-1.5 px-2.5 text-xs font-medium ${!form.passenger_name?.trim() ? 'border-error-400 focus:border-error-500' : ''}`} value={form.passenger_name} onChange={e => updateActiveForm('passenger_name', e.target.value)} placeholder="As per passport / ticket" />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Passport No.</label>
                <input className="input-field py-1.5 px-2.5 text-xs font-mono uppercase" value={form.passport_number} onChange={e => updateActiveForm('passport_number', e.target.value.toUpperCase())} onBlur={(e) => handleClientAutofill('passport_number', e.target.value)} placeholder="Passport" />
              </div>
              <div className="col-span-6 sm:col-span-2 relative">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Pass. Expiry</label>
                <input type="date" title={form.passport_expiry && form.travel_date && (new Date(form.passport_expiry).getTime() - new Date(form.travel_date).getTime() < 15552000000) ? 'Passport expires within 6 months of travel date!' : ''} className={`input-field py-1.5 px-2.5 text-xs ${form.passport_expiry && form.travel_date && (new Date(form.passport_expiry).getTime() - new Date(form.travel_date).getTime() < 15552000000) ? 'border-error-400 bg-error-50 text-error-700' : ''}`} value={form.passport_expiry || ''} onChange={e => updateActiveForm('passport_expiry', e.target.value)} />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Mobile Number</label>
                <input className="input-field py-1.5 px-2.5 text-xs" value={form.mobile || ''} onChange={e => updateActiveForm('mobile', e.target.value)} onBlur={(e) => handleClientAutofill('mobile', e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Issue Date</label>
                <input type="date" className="input-field py-1.5 px-2.5 text-xs" value={form.issue_date || ''} onChange={e => updateActiveForm('issue_date', e.target.value)} />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">PNR / Booking Ref *</label>
                <input className={`input-field py-1.5 px-2.5 text-xs font-mono uppercase font-bold text-primary-700 ${!form.pnr?.trim() ? 'border-error-400 focus:border-error-500' : ''}`} value={form.pnr} onChange={e => updateActiveForm('pnr', e.target.value.toUpperCase())} placeholder="6-char PNR" />
              </div>
              <div className={`col-span-8 ${form.status === 'hold' ? 'sm:col-span-4' : 'sm:col-span-7'}`}>
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Ticket Number (e-Ticket)</label>
                <input className="input-field py-1.5 px-2.5 text-xs font-mono font-semibold" value={form.ticket_number || ''} onChange={e => updateActiveForm('ticket_number', e.target.value)} placeholder="13-digit e-Ticket Number" />
              </div>
              <div className="col-span-4 sm:col-span-3">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Ticket Status</label>
                <select className="input-field py-1.5 px-2.5 text-xs capitalize" value={form.status} onChange={e => updateActiveForm('status', e.target.value)}>
                  <option value="issued">Issued</option>
                  <option value="hold">Hold</option>
                  <option value="voided">Voided</option>
                  <option value="refunded">Refunded</option>
                  <option value="reissued">Reissued</option>
                </select>
              </div>
              {form.status === 'hold' && (
                <div className="col-span-12 sm:col-span-3">
                  <label className="text-[10px] font-semibold text-warning-600 mb-1 block">Time Limit (TTL)</label>
                  <input type="datetime-local" className="input-field py-1.5 px-2.5 text-xs font-bold text-warning-700 border-warning-300" value={form.time_limit || ''} onChange={e => updateActiveForm('time_limit', e.target.value)} />
                </div>
              )}
            </div>
          </div>

          {/* ─── Step 2: Flight Details ─── */}
          <div className="card p-3 border border-emerald-100 bg-emerald-50/20 space-y-2.5 shadow-xs rounded-xl">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider border-b border-emerald-100 pb-1.5">
              ✈️ Step 2 — ফ্লাইট তথ্য (Flight Details)
            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-12 sm:col-span-4">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Airline Name *</label>
                <select className={`input-field py-1.5 px-2.5 text-xs font-medium ${!form.airline?.trim() ? 'border-error-400 focus:border-error-500' : ''}`} value={form.airline} onChange={e => updateActiveForm('airline', e.target.value)}>
                  <option value="">Select airline</option>
                  {airlineList.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Flight No.</label>
                <input className="input-field py-1.5 px-2.5 text-xs font-mono uppercase font-semibold" value={form.flight_number || ''} onChange={e => updateActiveForm('flight_number', e.target.value.toUpperCase())} placeholder="e.g. BG-001" />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Origin *</label>
                <select className={`input-field py-1.5 px-2.5 text-xs font-mono font-bold text-primary-700 ${!form.origin?.trim() ? 'border-error-400 focus:border-error-500' : ''}`} value={form.origin || 'DAC'} onChange={e => updateActiveForm('origin', e.target.value)}>
                  {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code} - {ap.city}</option>)}
                </select>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Destination *</label>
                <select className={`input-field py-1.5 px-2.5 text-xs font-mono font-bold text-primary-700 ${!form.destination?.trim() ? 'border-error-400 focus:border-error-500' : ''}`} value={form.destination} onChange={e => updateActiveForm('destination', e.target.value)}>
                  <option value="">Select Dest.</option>
                  {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code} - {ap.city}</option>)}
                </select>
              </div>
              <div className="col-span-6 sm:col-span-2">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Class</label>
                <select className="input-field py-1.5 px-2.5 text-xs capitalize" value={form.cabin_class} onChange={e => updateActiveForm('cabin_class', e.target.value)}>
                  <option value="economy">Economy</option>
                  <option value="premium_economy">Premium Eco</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Departure Date *</label>
                <input type="date" className={`input-field py-1.5 px-2.5 text-xs ${!form.travel_date?.trim() ? 'border-error-400 focus:border-error-500' : ''}`} value={form.travel_date} onChange={e => updateActiveForm('travel_date', e.target.value)} />
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Return Date</label>
                <input type="date" className="input-field py-1.5 px-2.5 text-xs" value={form.return_date} onChange={e => updateActiveForm('return_date', e.target.value)} />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Supplier / Vendor</label>
                <select className="input-field py-1.5 px-2.5 text-xs font-medium" value={form.supplier_id} onChange={e => updateActiveForm('supplier_id', e.target.value)}>
                  <option value="">Direct / GDS / Self</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ─── Step 3: Fare & Financials ─── */}
          <div className="bg-amber-50/30 p-3 rounded-xl border border-amber-100 space-y-3 shadow-xs">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider border-b border-amber-100 pb-1.5">
              💰 Step 3 — মূল্য ও কমিশন (Fare & Financials)
            </div>

            {/* Main Fare Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Base Fare (BDT) *</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-bold text-neutral-800" value={form.base_fare} onChange={e => updateActiveForm('base_fare', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Total Fare (BDT) *</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-bold text-primary-700" value={form.total_fare_input} onChange={e => updateActiveForm('total_fare_input', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Commission (%)</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold" value={form.commission_rate} onChange={e => updateActiveForm('commission_rate', e.target.value)} placeholder="7" />
              </div>
            </div>

            {/* Tax Breakdown (compact inline grid) */}
            <div className="bg-white/80 rounded-lg p-2 border border-amber-100">
              <div className="text-[9px] font-bold text-neutral-400 uppercase mb-2 tracking-wider">
                Tax Breakdown — {form.ticket_category === 'international' ? 'International (BD, UT, E5, OW, P7, P8, E7, G8, TS)' : 'Domestic (BD, UT, E5)'}
              </div>
              <div className={`grid gap-1.5 ${form.ticket_category === 'international' ? 'grid-cols-5 sm:grid-cols-9' : 'grid-cols-3'}`}>
                {[
                  { key: 'bd', label: 'BD' }, { key: 'ut', label: 'UT' }, { key: 'e5', label: 'E5' },
                  ...(form.ticket_category === 'international' ? [
                    { key: 'ow', label: 'OW' }, { key: 'p7', label: 'P7' }, { key: 'p8', label: 'P8' },
                    { key: 'e7', label: 'E7' }, { key: 'g8', label: 'G8' }, { key: 'ts', label: 'TS' }
                  ] : [])
                ].map(t => (
                  <div key={t.key}>
                    <label className="text-[9px] font-bold text-neutral-400 block text-center">{t.label}</label>
                    <input type="number" min="0" className="input-field py-1 px-1 text-xs text-center font-semibold text-neutral-700" value={(form as any)[t.key]} onChange={e => updateActiveForm(t.key, e.target.value)} />
                  </div>
                ))}
              </div>
              {form.custom_taxes && form.custom_taxes.length > 0 && (
                <div className="mt-2 space-y-1.5 pt-1.5 border-t border-neutral-100">
                  {form.custom_taxes.map((ct, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input className="input-field py-1 px-2 text-xs font-mono font-bold w-20 bg-neutral-50" placeholder="Code" value={ct.code} onChange={e => updateCustomTaxField(idx, 'code', e.target.value)} />
                      <input type="number" min="0" className="input-field py-1 px-2 text-xs font-semibold flex-1" placeholder="Amount" value={ct.amount} onChange={e => updateCustomTaxField(idx, 'amount', e.target.value)} />
                      <button type="button" onClick={() => removeCustomTaxField(idx)} className="text-error-400 hover:text-error-600 p-1 rounded"><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={addCustomTaxField} className="mt-2 text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus size={10} /> Add Custom Tax Code
              </button>
            </div>

            {/* Service Charge & Discount */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Service Charge (BDT)</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold text-success-700" value={form.service_charge} onChange={e => updateActiveForm('service_charge', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Discount (BDT)</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold text-orange-600" value={form.discount || 0} onChange={e => updateActiveForm('discount', e.target.value)} placeholder="0" />
              </div>
            </div>

            {/* Auto-Calculated Results Panel (BSP Bangladesh) */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-3 space-y-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">⚡ Auto-Calculated (BSP Bangladesh)</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">AIT (0.30%)</div>
                  <div className="text-sm font-black text-yellow-300">{formatBDT(fareData.ait)}</div>
                  <div className="text-[8px] text-slate-500 mt-0.5">(Total−BD−UT−E5)×0.3%</div>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Commission</div>
                  <div className="text-sm font-black text-blue-300">{formatBDT(fareData.commission)}</div>
                  <div className="text-[8px] text-slate-500 mt-0.5">Base × {fareData.comm_rate}%</div>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">IATA Payment</div>
                  <div className="text-sm font-black text-orange-300">{formatBDT(fareData.iata_payment)}</div>
                  <div className="text-[8px] text-slate-500 mt-0.5">Total−Comm−AIT</div>
                </div>
                <div className="bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                  <div className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Net Profit</div>
                  <div className="text-sm font-black text-green-300">{formatBDT(fareData.net_profit)}</div>
                  <div className="text-[8px] text-slate-500 mt-0.5">Comm+Svc−Disc</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-primary-600 rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-primary-200 uppercase tracking-wider">Client Total Fare</div>
                    <div className="text-lg font-black text-white">{formatBDT(fareData.total_client_fare)}</div>
                  </div>
                  <span className="text-3xl opacity-10 font-black">৳</span>
                </div>
                <div className="bg-emerald-700 rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">IATA Payment</div>
                    <div className="text-lg font-black text-white">{formatBDT(fareData.iata_payment)}</div>
                  </div>
                  <span className="text-3xl opacity-10 font-black">↗</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Step 4: Dynamic Fields ─── */}
          <div className="bg-white border border-purple-100 rounded-xl p-3 shadow-xs space-y-2">
            <div className="flex justify-between items-center border-b border-purple-50 pb-1.5">
              <h3 className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">🧳 Step 4 — Dynamic Fields (Baggage, Meal & Extra)</h3>
              <button onClick={addMetadataField} className="text-[11px] text-primary-600 font-semibold flex items-center gap-1 hover:underline">
                <Plus size={12} /> Add Field
              </button>
            </div>
            {(!form.metadata || form.metadata.length === 0) && (
              <p className="text-xs text-neutral-400 italic">No fields added. E.g. Baggage: 30 KG, Meal: Standard, Seat: 22A</p>
            )}
            {form.metadata?.map((meta, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <select
                  className="input-field py-1 px-2 text-xs w-36 bg-neutral-50 font-semibold"
                  value={meta.key}
                  onChange={e => updateMetadata(idx, 'key', e.target.value)}
                >
                  <option value="">Select Field</option>
                  <option value="Baggage">🧳 Baggage</option>
                  <option value="Meal">🍽️ Meal</option>
                  <option value="Seat">💺 Seat</option>
                  <option value="Transit Visa">🛂 Transit Visa</option>
                  <option value="Lounge">🛋️ Lounge</option>
                  <option value="Special Assistance">♿ Special Assist</option>
                  <option value="Remarks">📝 Remarks</option>
                  {meta.key && !['Baggage','Meal','Seat','Transit Visa','Lounge','Special Assistance','Remarks'].includes(meta.key) && (
                    <option value={meta.key}>{meta.key}</option>
                  )}
                </select>
                <input
                  className="input-field py-1 px-2.5 text-xs flex-1"
                  placeholder="Value (e.g. 30 KG / Standard / 22A)"
                  value={meta.value}
                  onChange={e => updateMetadata(idx, 'value', e.target.value)}
                />
                <button onClick={() => removeMetadataField(idx)} className="text-error-400 hover:text-error-600 p-1 hover:bg-error-50 rounded transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-neutral-100 mt-1 sticky bottom-0 bg-white pb-1">
            <div className="flex items-center gap-4 text-xs font-bold text-neutral-600 bg-neutral-50 px-4 py-2 rounded-lg border border-neutral-200 shadow-sm w-full sm:w-auto">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider opacity-70">Total Invoice</span>
                <span className="text-primary-700 text-sm">{formatBDT(forms.reduce((sum, f) => sum + getFareData(f).total_client_fare, 0))}</span>
              </div>
              <div className="w-px h-6 bg-neutral-300"></div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider opacity-70">Total Profit</span>
                <span className="text-success-600 text-sm">{formatBDT(forms.reduce((sum, f) => sum + getFareData(f).net_profit, 0))}</span>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button onClick={() => setShowForm(false)} className="btn-ghost py-2 px-4 text-xs font-bold">Discard (Esc)</button>
              <button
                onClick={handleSave}
                disabled={saving || !isFormValid()}
                className={`py-2 px-6 text-xs font-bold flex items-center justify-center gap-2 rounded-lg transition-colors shadow-sm ${(saving || !isFormValid()) ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed' : 'btn-primary'}`}
              >
                {saving ? 'Processing...' : `Issue Ticket${forms.length > 1 ? ` (${forms.length})` : ''} & Save (Ctrl+S)`}
              </button>
            </div>
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

          <div 
            className={`relative border-2 border-dashed rounded-xl transition-colors ${
              isDragging ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 bg-white'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            onDrop={handleDrop}
          >
            <label className="label absolute -top-3 left-3 bg-white px-1 text-primary-700">Paste or Drop GDS Report PDF/Text *</label>
            <textarea 
              className="input-field min-h-[200px] font-mono text-xs leading-normal bg-transparent border-0 ring-0 focus:ring-0 resize-none p-4 w-full" 
              placeholder="NAME: RAHMAN/SAYEDUR... TICKET: 779... OR drag and drop a PDF file here"
              value={gdsText}
              onChange={e => { setGdsText(e.target.value); setImportError(''); }}
            />
            {isExtractingPdf && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-10">
                <div className="text-primary-700 font-bold flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                  Extracting PDF Text...
                </div>
              </div>
            )}
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

      {/* Invoice Prompt Modal */}
      <Modal isOpen={!!invoiceData} onClose={() => setInvoiceData(null)} title="Tickets Saved Successfully!">
        <div className="p-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="text-success-600 w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-neutral-800">Do you want to print the Client Invoice?</h3>
          <p className="text-sm text-neutral-500">
            This will generate a clean invoice for the client showing the total fare. Internal agency costs will be hidden.
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <button onClick={() => setInvoiceData(null)} className="btn-ghost px-6 py-2">
              Skip
            </button>
            <button 
              onClick={() => {
                setTimeout(() => window.print(), 100);
              }} 
              className="btn-primary px-8 py-2 flex items-center gap-2"
            >
              Print Invoice
            </button>
          </div>
        </div>
      </Modal>

      {/* Hidden Print View */}
      {invoiceData && (
        <div className="hidden print:block absolute top-0 left-0 w-full h-full bg-white z-[9999] p-8">
          <div className="text-center mb-8 border-b-2 border-neutral-800 pb-4">
            <h1 className="text-3xl font-black uppercase tracking-widest">TICKET INVOICE</h1>
            <p className="text-neutral-500 mt-1">Thank you for traveling with us</p>
          </div>
          <div className="space-y-8">
            {invoiceData.map((t, i) => (
              <div key={i} className="border border-neutral-300 rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-neutral-800">{t.passenger_name}</h3>
                    <p className="text-sm text-neutral-500">PNR: <span className="font-bold text-neutral-800">{t.pnr}</span> | Ticket No: {t.ticket_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-500">Flight Date</p>
                    <p className="font-bold">{t.travel_date}</p>
                  </div>
                </div>
                <div className="flex gap-4 items-center mb-6 py-4 border-y border-neutral-200">
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-black">{t.origin}</p>
                  </div>
                  <div className="flex-1 flex justify-center text-neutral-400">
                    <Plane size={24} />
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-black">{t.destination}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-neutral-50 p-4 rounded-lg">
                  <div>
                    <p className="text-sm text-neutral-500">Airline</p>
                    <p className="font-bold">{t.airline}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-neutral-500 uppercase tracking-wider">Total Amount</p>
                    <p className="text-2xl font-black text-neutral-800">BDT {t.total_fare.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
