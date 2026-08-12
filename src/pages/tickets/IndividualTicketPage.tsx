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
  ticket_category: 'international' as 'domestic' | 'international',
  ticket_number: '',
  passenger_name: '',
  passport_number: '',
  airline: '',
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
  status: 'issued',
  supplier_id: '',
  metadata: [
    { key: 'Baggage', value: '30 KG' },
    { key: 'Value', value: '' }
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
    
    const bd = Math.max(0, Number(fData.bd) || 0);
    const e5 = Math.max(0, Number(fData.e5) || 0);
    const ow = Math.max(0, Number(fData.ow) || 0);
    const p7 = Math.max(0, Number(fData.p7) || 0);
    const p8 = Math.max(0, Number(fData.p8) || 0);
    const ut = Math.max(0, Number(fData.ut) || 0);
    const e7 = Math.max(0, Number(fData.e7) || 0);
    const g8 = Math.max(0, Number(fData.g8) || 0);
    const ts = Math.max(0, Number(fData.ts) || 0);
    const customTaxSum = (fData.custom_taxes || []).reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);

    const itemizedTaxSum = bd + e5 + ow + p7 + p8 + ut + e7 + g8 + ts + customTaxSum;

    // Calculate total tax and calculated total fare
    const tax_ait = total_input > 0 && total_input >= base ? (total_input - base) : itemizedTaxSum;
    const calculated_total_fare = total_input > 0 ? total_input : (base + itemizedTaxSum);

    const comm_rate = Math.max(0, Number(fData.commission_rate) || 0);
    const svc = Math.max(0, Number(fData.service_charge) || 0);

    // VAT 3% calculation on gross ticket margin / base fare
    const vat = Math.round((calculated_total_fare - itemizedTaxSum) * 0.03);
    const commission = Math.round(base * (comm_rate / 100));
    const total_commission = commission;
    const net_commission = Math.round(commission - (vat * 0.5));
    const total_client_fare = calculated_total_fare + svc;
    const net_profit = Math.round(commission + svc);
    
    return { 
      base, 
      total_input: calculated_total_fare, 
      itemizedTaxSum,
      bd, e5, ow, p7, p8, ut, e7, g8, ts,
      comm_rate, svc, tax_ait, vat, commission, 
      total_commission, net_commission, total_client_fare, net_profit 
    };
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
      const combinedTaxes = {
        category: f.ticket_category,
        ut: f.ut, bd: f.bd, e5: f.e5, ow: f.ow, p7: f.p7, p8: f.p8, e7: f.e7, g8: f.g8, ts: f.ts,
        custom_taxes: f.custom_taxes || [],
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
        ait_amount: fd.tax_ait,
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

  const fareFields = ['base_fare', 'total_fare_input', 'ut', 'bd', 'e5', 'ow', 'p7', 'p8', 'e7', 'g8', 'ts', 'commission_rate', 'service_charge'];
  
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

  const addCustomTaxField = () => {
    setForms(prev => {
      const next = [...prev];
      const list = [...(next[activeTab].custom_taxes || []), { code: '', amount: 0 }];
      next[activeTab] = { ...next[activeTab], custom_taxes: list };
      return next;
    });
    setNeedsRecalc(prev => {
      const next = [...prev];
      next[activeTab] = true;
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
    setNeedsRecalc(prev => {
      const next = [...prev];
      next[activeTab] = true;
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
    setNeedsRecalc(prev => {
      const next = [...prev];
      next[activeTab] = true;
      return next;
    });
  };

  const copyFlightDetailsToNewPassenger = () => {
    const currentForm = forms[activeTab];
    const clonedForm = {
      ...currentForm,
      passenger_name: '',
      passport_number: '',
      ticket_number: ''
    };
    setForms(prev => [...prev, clonedForm]);
    setFareDatas(prev => [...prev, getFareData(clonedForm)]);
    setNeedsRecalc(prev => [...prev, false]);
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

    // Common system / non-passenger words to exclude
    const forbiddenWords = ['PRIZE', 'PROMO', 'ERROR', 'MESSAGE', 'ECONOMY', 'BUSINESS', 'FIRST', 'ADULT', 'CHILD', 'INFANT', 'TERMS', 'CONDITIONS', 'PAYMENT', 'METHOD', 'CREDIT', 'DEBIT', 'TOTAL', 'FARE', 'TAX', 'FEE', 'REF', 'CODE', 'BOOKING', 'STATUS', 'ISSUED', 'DATE', 'FLIGHT', 'TICKET', 'COUPON', 'NOTICE', 'AGENCY', 'COMPANY', 'US-BANGLA', 'BIMAN', 'AIRLINE', 'AIRLINES', 'ROUTING', 'ENDORSEMENT', 'CHECK-IN', 'BAGGAGE', 'SERVICE', 'CHARGE', 'PASSENGER'];

    // 1. PASSENGER NAME
    let extractedName = '';

    const namePrefixMatch = 
      text.match(/(?:PASSENGER NAME|PASSENGER DETAILS|PASSENGER|PREPARED FOR|PAX NAME|NAME|PAX)\s*:?\s*([A-Z\s.,/]+?)(?=\s*(?:PNR|TICKET|ETKT|BOOKING|FLIGHT|DATE|TOTAL|FARE|CLASS|FORM OF|FOOP|RL|REF|RESERVATION|STATUS|ISSD|\r|\n|$))/i) ||
      text.match(/(?:1\.|2\.|3\.|01\.|02\.)\s*([A-Z\s.,/]+?)(?=\s*(?:PNR|TICKET|ETKT|BOOKING|FLIGHT|DATE|TOTAL|FARE|CLASS|\r|\n|$))/i);

    if (namePrefixMatch) {
      let cand = namePrefixMatch[1].replace(/[\r\n]+/g, ' ').trim();
      cand = cand.replace(/^[:\s-]+/, '').trim();
      const upperCand = cand.toUpperCase();
      if (!forbiddenWords.some(w => upperCand === w) && cand.length > 2) {
        extractedName = cand;
      }
    }

    if (!extractedName) {
      const surnameMatch = text.match(/\b([A-Z]{2,}\s*\/\s*[A-Z\s]{2,}(?:\s+(?:MR|MS|MRS|MSTR|MISS))?)\b/i);
      if (surnameMatch) {
        const cand = surnameMatch[1].trim();
        const upper = cand.toUpperCase();
        if (!forbiddenWords.some(w => upper === w)) {
          extractedName = cand;
        }
      }
    }

    if (extractedName) {
      newData.passenger_name = extractedName;
    }

    // 2. PNR / BOOKING REFERENCE (US-Bangla e.g. "Booking Reference : BS/K9X2P4" or "PNR : K9X2P4")
    const invalidPnrs = ['ERENCE', 'NUMBER', 'AMADEU', 'GALILE', 'SABRE', 'REFNUM', 'CODE00', 'STATUS', 'DETAILS'];
    
    const pnrMatches = [
      ...text.matchAll(/(?:PNR|BOOKING REFERENCE|BOOKING REF|RESERVATION CODE|RESERVATION NO|RECORD LOCATOR|CONFIRMATION|RL)\s*:?\s*(?:[A-Z2-9]{2}\/)?([A-Z0-9]{6})\b/gi)
    ];

    for (const match of pnrMatches) {
      const val = match[1].toUpperCase();
      if (!invalidPnrs.includes(val) && !/^\d{6}$/.test(val) && /^[A-Z0-9]{6}$/.test(val)) {
        newData.pnr = val;
        break;
      }
    }

    if (!newData.pnr) {
      const pnrStandalone = text.match(/\bPNR\s*:?\s*([A-Z0-9]{6})\b/i);
      if (pnrStandalone && !invalidPnrs.includes(pnrStandalone[1].toUpperCase()) && !/^\d{6}$/.test(pnrStandalone[1])) {
        newData.pnr = pnrStandalone[1].toUpperCase();
      }
    }

    // 3. TICKET NUMBER
    const tktMatch = 
      text.match(/(?:TICKET NUMBER|ETKT|TICKET NO|TICKET)\s*:?\s*([0-9\s-]{10,20})/i) ||
      text.match(/\b(\d{3}[-\s]?\d{10})\b/);
      
    if (tktMatch) {
      newData.ticket_number = tktMatch[1].replace(/[\s-]/g, '').trim();
    }

    // 4. AIRLINE DETECTION
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

    // 5. ROUTE / ORIGIN & DESTINATION (e.g. "DAC - CXB" or "Dhaka to Cox's Bazar")
    const cityToIata: Record<string, string> = {
      'COX\'S BAZAR': 'CXB', 'COXS BAZAR': 'CXB', 'COX BAZAR': 'CXB',
      'CHITTAGONG': 'CGP', 'CHATOGRAM': 'CGP', 'CHATTOGRAM': 'CGP',
      'SYLHET': 'ZYL', 'SAIDPUR': 'SPD', 'JESSORE': 'JSR', 'JASHORE': 'JSR',
      'RAJSHAHI': 'RJH', 'BARISAL': 'BZL', 'BARISHAL': 'BZL',
      'JEDDAH': 'JED', 'MADINAH': 'MED', 'MEDINA': 'MED', 'RIYADH': 'RUH',
      'DUBAI': 'DXB', 'SHARJAH': 'SHJ', 'ABU DHABI': 'AUH',
      'KUALA LUMPUR': 'KUL', 'SINGAPORE': 'SIN', 'BANGKOK': 'BKK',
      'DOHA': 'DOH', 'KOLKATA': 'CCU', 'DELHI': 'DEL'
    };

    const routeCodeMatch = text.match(/\b([A-Z]{3})\s*(?:\([A-Z]{3}\))?\s*(?:-|TO|\/|\u2192)\s*([A-Z]{3})\b/i);
    if (routeCodeMatch) {
      newData.origin = routeCodeMatch[1].toUpperCase();
      newData.destination = routeCodeMatch[2].toUpperCase();
    } else {
      const upperText = text.toUpperCase();
      for (const [city, code] of Object.entries(cityToIata)) {
        if (upperText.includes(city)) {
          newData.destination = code;
          break;
        }
      }
    }

    // 6. TRAVEL DATE (e.g. "15 AUG 2026", "15-08-2026", "15/08/2026")
    const monthNames: Record<string, string> = {
      JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
      JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
    };

    const dateMatch = 
      text.match(/(?:DATE|TRAVEL DATE|DEPARTURE DATE|FLIGHT DATE)\s*:?\s*(\d{1,2})[-\s/]([A-Z]{3})[-\s/](\d{2,4})/i) ||
      text.match(/\b(\d{1,2})\s*([A-Z]{3})\s*(\d{4})\b/i) ||
      text.match(/\b(\d{1,2})[-\s/]([A-Z]{3})[-\s/](\d{2})\b/i) ||
      text.match(/\b(\d{4})[-\s/](\d{1,2})[-\s/](\d{1,2})\b/) ||
      text.match(/\b(\d{1,2})[-\s/](\d{1,2})[-\s/](\d{4})\b/);

    if (dateMatch) {
      if (monthNames[dateMatch[2]?.toUpperCase()]) {
        const day = dateMatch[1].padStart(2, '0');
        const month = monthNames[dateMatch[2].toUpperCase()];
        let year = dateMatch[3];
        if (year.length === 2) year = `20${year}`;
        newData.travel_date = `${year}-${month}-${day}`;
      } else if (dateMatch[1].length === 4) {
        newData.travel_date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      } else if (dateMatch[3]?.length === 4) {
        newData.travel_date = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`;
      }
    }

    // 7. TOTAL & BASE FARES
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

    // 8. TAX BREAKDOWN (Domestic & International Codes)
    const utMatch = text.match(/UT\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*UT/i);
    if (utMatch) newData.ut = parseInt(utMatch[1].replace(/,/g, ''));

    const bdMatch = text.match(/BD\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*BD/i);
    if (bdMatch) newData.bd = parseInt(bdMatch[1].replace(/,/g, ''));

    const e5Match = text.match(/E5\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*E5/i);
    if (e5Match) newData.e5 = parseInt(e5Match[1].replace(/,/g, ''));

    const owMatch = text.match(/OW\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*OW/i);
    if (owMatch) newData.ow = parseInt(owMatch[1].replace(/,/g, ''));

    const p7Match = text.match(/P7\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*P7/i);
    if (p7Match) newData.p7 = parseInt(p7Match[1].replace(/,/g, ''));

    const p8Match = text.match(/P8\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*P8/i);
    if (p8Match) newData.p8 = parseInt(p8Match[1].replace(/,/g, ''));

    const e7Match = text.match(/E7\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*E7/i);
    if (e7Match) newData.e7 = parseInt(e7Match[1].replace(/,/g, ''));

    const g8Match = text.match(/G8\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*G8/i);
    if (g8Match) newData.g8 = parseInt(g8Match[1].replace(/,/g, ''));

    const tsMatch = text.match(/TS\s*:?\s*([\d,]+)/i) || text.match(/([\d,]+)\s*TS/i);
    if (tsMatch) newData.ts = parseInt(tsMatch[1].replace(/,/g, ''));

    // Check if origin or destination is non-BD to auto-set international
    if (newData.origin !== 'DAC' || (newData.destination && !['CXB', 'CGP', 'ZYL', 'SPD', 'JSR', 'RJH', 'BZL'].includes(newData.destination))) {
      newData.ticket_category = 'international';
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

      const prompt = `You are an expert aviation ticket parser for travel agencies in Bangladesh and worldwide. Analyze the following e-Ticket / GDS report text (from US-Bangla Airlines, Biman Bangladesh, Air Arabia, flydubai, Saudia, Emirates, Amadeus, Sabre, Galileo, etc.) and extract an array of passenger ticket objects.

REQUIRED JSON FIELD SPECIFICATIONS:
1. "passenger_name": Full passenger name (e.g. "HASAN / MD NASARUL" or "MD NASARUL HASAN"). NEVER output dictionary words or headers.
2. "pnr": 6-character booking reference / PNR code (e.g. "K9X2P4" or "A1B2C3"). Strip any airline prefix like "BS/".
3. "ticket_number": 10 to 14 digit e-ticket number (e.g. "6102416456211"). Digits only.
4. "airline": Operating airline name (e.g. "US-Bangla Airlines", "Biman Bangladesh Airlines", "Air Arabia", "flydubai", "Emirates", "Saudia", "Qatar Airways").
5. "origin": 3-letter IATA origin airport code (e.g. "DAC", "CGP", "ZYL"). Default to "DAC" if departing Bangladesh.
6. "destination": 3-letter IATA destination airport code (e.g. "CXB", "CGP", "ZYL", "SPD", "JSR", "JED", "MED", "DXB", "KUL", "SIN", "BKK", "DOH", "AUH").
7. "travel_date": Date of flight formatted as YYYY-MM-DD (e.g. "2026-08-15").
8. "base_fare": Base airfare amount as a number.
9. "total_fare": Total price paid as a number.
10. "ut_tax", "bd_tax", "e5_tax", "ow_tax", "p7_tax", "p8_tax", "e7_tax", "g8_tax", "ts_tax": Specific tax breakdown numbers if mentioned.
11. "ticket_category": "domestic" or "international".
12. "extra_info": Array of key-value objects for baggage, class, meal, etc.

Text to parse:
"""
${text}
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
          ow: p.ow_tax || 0,
          p7: p.p7_tax || 0,
          p8: p.p8_tax || 0,
          e7: p.e7_tax || 0,
          g8: p.g8_tax || 0,
          ts: p.ts_tax || 0,
          metadata: p.extra_info || [
            { key: 'Baggage', value: '30 KG' },
            { key: 'Value', value: '' }
          ]
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
                    <button 
                      onClick={() => removePassengerTab(i)}
                      className="pr-2 pl-1 text-neutral-400 hover:text-error-500 font-bold"
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
                <Plus size={12} /> Add Passenger
              </button>
            </div>

            {forms.length > 0 && (
              <button
                onClick={copyFlightDetailsToNewPassenger}
                className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 flex items-center gap-1 transition-colors shrink-0 shadow-sm"
                title="Copy current flight route & fare to new passenger tab under same PNR"
              >
                📋 Copy Route to New Pax
              </button>
            )}
          </div>

          {error && (
            <div className="flex gap-2 p-2 bg-error-50 border border-error-200 text-error-700 rounded-lg text-[11px]">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          {/* Ticket Type / Category Selector */}
          <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-neutral-700">Ticket Type:</span>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name={`ticket_cat_${activeTab}`}
                  checked={form.ticket_category === 'domestic'}
                  onChange={() => updateActiveForm('ticket_category', 'domestic')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                🏠 Domestic (অভ্যন্তরীণ)
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                <input
                  type="radio"
                  name={`ticket_cat_${activeTab}`}
                  checked={form.ticket_category === 'international'}
                  onChange={() => updateActiveForm('ticket_category', 'international')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                ✈️ International (আন্তর্জাতিক)
              </label>
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">
              {form.ticket_category === 'international' ? 'Full International Tax Breakdown Enabled' : 'Standard Domestic Taxes'}
            </span>
          </div>

          {/* Row 1: Passenger & Route Information */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Passenger Name *</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-medium" value={form.passenger_name} onChange={e => updateActiveForm('passenger_name', e.target.value)} placeholder="As per passport" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Passport</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono uppercase" value={form.passport_number} onChange={e => updateActiveForm('passport_number', e.target.value.toUpperCase())} placeholder="Passport No." />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">PNR *</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono uppercase font-bold text-primary-700" value={form.pnr} onChange={e => updateActiveForm('pnr', e.target.value.toUpperCase())} placeholder="6-char PNR" />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Ticket Number</label>
              <input className="input-field py-1.5 px-2.5 text-xs font-mono font-semibold" value={form.ticket_number || ''} onChange={e => updateActiveForm('ticket_number', e.target.value)} placeholder="13-digit Ticket No." />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Source / Vendor</label>
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
              <select className="input-field py-1.5 px-2.5 text-xs font-medium" value={form.airline} onChange={e => updateActiveForm('airline', e.target.value)}>
                <option value="">Select airline</option>
                {airlineList.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Origin</label>
              <select className="input-field py-1.5 px-2.5 text-xs font-mono font-bold" value={form.origin} onChange={e => updateActiveForm('origin', e.target.value)}>
                {airportList.map(ap => <option key={ap.code} value={ap.code}>{ap.code}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-neutral-500 mb-1 block">Destination</label>
              <select className="input-field py-1.5 px-2.5 text-xs font-mono font-bold" value={form.destination} onChange={e => updateActiveForm('destination', e.target.value)}>
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
              <select className="input-field py-1.5 px-2.5 text-xs capitalize" value={form.cabin_class} onChange={e => updateActiveForm('cabin_class', e.target.value)}>
                <option value="economy">Economy</option>
                <option value="premium_economy">Prem. Eco</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </div>
          </div>

          {/* Row 3: Fare & Base Financials */}
          <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 space-y-3">
            <div className="flex justify-between items-center border-b border-neutral-200 pb-1.5">
              <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Fare & Commission Inputs</span>
              <span className="text-[10px] text-neutral-500 font-semibold">Enter Base & Total Fare or Tax Breakdown</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Base Fare (BDT) *</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-bold text-neutral-800" value={form.base_fare} onChange={e => updateActiveForm('base_fare', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Total Fare (BDT) *</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-bold text-primary-700" value={form.total_fare_input} onChange={e => updateActiveForm('total_fare_input', e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Comm. (%)</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold text-neutral-800" value={form.commission_rate} onChange={e => updateActiveForm('commission_rate', e.target.value)} placeholder="7" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-neutral-600 mb-1 block uppercase">Service Charge (BDT)</label>
                <input type="number" min="0" className="input-field py-1.5 px-2.5 text-xs font-semibold text-success-700" value={form.service_charge} onChange={e => updateActiveForm('service_charge', e.target.value)} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Row 4: Tax Breakdown Grid (Domestic & International Codes) */}
          <div className="card p-3 border border-neutral-200 space-y-2 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
              <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                💸 Itemized Tax Breakdown {form.ticket_category === 'international' ? '(BD, E5, OW, P7, P8, UT, E7, G8, TS)' : '(BD, UT, E5)'}
              </span>
              <button
                type="button"
                onClick={addCustomTaxField}
                className="text-[11px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus size={12} /> Add Custom Tax Code
              </button>
            </div>

            {/* Standard Taxes Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
              <div>
                <label className="text-[9px] font-bold text-neutral-500 block uppercase">BD Tax</label>
                <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.bd} onChange={e => updateActiveForm('bd', e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-bold text-neutral-500 block uppercase">E5 Tax</label>
                <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.e5} onChange={e => updateActiveForm('e5', e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-bold text-neutral-500 block uppercase">UT Tax</label>
                <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.ut} onChange={e => updateActiveForm('ut', e.target.value)} />
              </div>
              {form.ticket_category === 'international' && (
                <>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-500 block uppercase">OW Tax</label>
                    <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.ow} onChange={e => updateActiveForm('ow', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-500 block uppercase">P7 Tax</label>
                    <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.p7} onChange={e => updateActiveForm('p7', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-500 block uppercase">P8 Tax</label>
                    <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.p8} onChange={e => updateActiveForm('p8', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-500 block uppercase">E7 Tax</label>
                    <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.e7} onChange={e => updateActiveForm('e7', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-500 block uppercase">G8 Tax</label>
                    <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.g8} onChange={e => updateActiveForm('g8', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-neutral-500 block uppercase">TS Tax</label>
                    <input type="number" min="0" className="input-field py-1 px-1.5 text-xs font-semibold text-neutral-700" value={form.ts} onChange={e => updateActiveForm('ts', e.target.value)} />
                  </div>
                </>
              )}
            </div>

            {/* Custom Tax Codes List */}
            {form.custom_taxes && form.custom_taxes.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-neutral-100">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Additional Custom Tax Codes:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {form.custom_taxes.map((ct, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-neutral-50 p-1.5 rounded-lg border border-neutral-200">
                      <input
                        className="input-field py-1 px-2 text-xs font-mono font-bold w-1/3 bg-white"
                        placeholder="Tax Code (e.g. YQ)"
                        value={ct.code}
                        onChange={e => updateCustomTaxField(idx, 'code', e.target.value)}
                      />
                      <input
                        type="number"
                        min="0"
                        className="input-field py-1 px-2 text-xs font-semibold flex-1 bg-white"
                        placeholder="Amount"
                        value={ct.amount}
                        onChange={e => updateCustomTaxField(idx, 'amount', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomTaxField(idx)}
                        className="text-error-400 hover:text-error-600 p-1 rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Dynamic Custom Fields / Baggage & Value */}
          <div className="bg-white border rounded-xl p-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-[11px] font-bold text-neutral-600 uppercase">Additional Info (Dynamic Fields: Baggage & Value)</h3>
              <button onClick={addMetadataField} className="text-[11px] text-primary-600 font-semibold flex items-center gap-1 hover:underline">
                <Plus size={12} /> Add Custom Field
              </button>
            </div>
            {(!form.metadata || form.metadata.length === 0) && (
               <p className="text-xs text-neutral-400 italic">No custom fields added. E.g. Baggage, Meal Preference, Seat.</p>
            )}
            {form.metadata?.map((meta, idx) => (
              <div key={idx} className="flex gap-2 mb-1.5">
                <input 
                  className="input-field py-1 px-2.5 text-xs w-1/3 bg-neutral-50 font-semibold" 
                  placeholder="Field Name (e.g. Baggage / Value)" 
                  value={meta.key} 
                  onChange={e => updateMetadata(idx, 'key', e.target.value)} 
                />
                <input 
                  className="input-field py-1 px-2.5 text-xs flex-1" 
                  placeholder="Value (e.g. 30 KG / 2 Pieces)" 
                  value={meta.value} 
                  onChange={e => updateMetadata(idx, 'value', e.target.value)} 
                />
                <button 
                  onClick={() => removeMetadataField(idx)} 
                  className="text-error-400 hover:text-error-600 p-1 hover:bg-error-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Row 5: Calculations & Financial Totals */}
          <div className="flex justify-between items-end mb-1 mt-1">
             <h3 className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Calculation Results & Financials</h3>
             <button 
                onClick={handleRecalculate}
                disabled={!currentNeedsRecalc}
                className={`py-1.5 px-4 text-xs font-bold rounded-lg transition-colors shadow-sm ${currentNeedsRecalc ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
             >
               {currentNeedsRecalc ? 'Click to Recalculate' : 'Up to date'}
             </button>
          </div>
          <div className={`flex flex-col md:flex-row gap-3 p-3 rounded-xl border transition-all ${currentNeedsRecalc ? 'bg-neutral-50 border-neutral-200 opacity-60' : 'bg-primary-50/50 border-primary-100'}`}>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${currentNeedsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>Total Tax / AIT</span>
                <span className={`text-xs font-bold ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-900'}`}>{currentNeedsRecalc ? '---' : formatBDT(fareData.tax_ait)}</span>
              </div>
              <div className={`bg-white px-3 py-2 rounded-lg border flex flex-col justify-center ${currentNeedsRecalc ? 'border-neutral-200' : 'border-primary-100/50'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-400'}`}>VAT (3%)</span>
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
              <div className={`px-4 py-2 rounded-lg text-right flex flex-col justify-center shadow-sm ${currentNeedsRecalc ? 'bg-neutral-300 text-neutral-500' : 'bg-primary-600 text-white'}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider block mb-0.5 ${currentNeedsRecalc ? 'text-neutral-400' : 'text-primary-200'}`}>Client Fare</span>
                <span className="text-sm font-black">{currentNeedsRecalc ? '---' : formatBDT(fareData.total_client_fare)}</span>
              </div>
              <div className={`px-4 py-2 rounded-lg text-right flex flex-col justify-center shadow-sm ${currentNeedsRecalc ? 'bg-neutral-300 text-neutral-500' : 'bg-success-600 text-white'}`}>
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
