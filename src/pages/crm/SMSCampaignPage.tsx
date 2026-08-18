import React, { useState } from 'react';
import { Send, Users, MessageCircle, CheckCircle, AlertCircle } from 'lucide-react';

const CAMPAIGN_TEMPLATES = [
  { id: 1, name: 'Eid Greeting', text: 'Eid Mubarak! Sonar Madina Travels wishes you and your family a blessed Eid. Contact us for Hajj/Umrah packages: 01XXXXXXXXX' },
  { id: 2, name: 'Hajj Quota Alert', text: 'Hajj Quota is open! Limited seats available at Sonar Madina Travels. Register now. Call: 01XXXXXXXXX' },
  { id: 3, name: 'Umrah Package Promo', text: 'Ramadan Special Umrah Package - starting from BDT 89,000. 3-star to 5-star hotels. Sonar Madina Travels. 01XXXXXXXXX' },
  { id: 4, name: 'New Tour Package', text: 'Cox\'s Bazar Eid Special Tour Package! 3 Days/4 Nights for only BDT 8,500/-. Limited seats. Booking: 01XXXXXXXXX - Sonar Madina Travels' },
];

export function SMSCampaignPage() {
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState('all');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [charCount, setCharCount] = useState(0);

  const handleTemplate = (text: string) => {
    setMessage(text);
    setCharCount(text.length);
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    setCharCount(text.length);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    setSuccess('Campaign queued successfully! Messages will be sent via SSL Wireless Bangladesh.');
    setSending(false);
  };

  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <div className="px-4 lg:px-6 pb-6 pt-2 lg:pt-3 animate-fade-in">

      {success && (
        <div className="flex items-center gap-2 p-3 bg-success-50 border border-success-200 text-success-700 rounded-lg mb-4 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compose */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <MessageCircle size={16} className="text-primary-500" /> Compose Message
            </h3>
            <div className="space-y-3">
              <div>
                <label className="label">Target Group</label>
                <select className="input-field" value={targetGroup} onChange={e => setTargetGroup(e.target.value)}>
                  <option value="all">All Customers</option>
                  <option value="umrah_alumni">Umrah Alumni</option>
                  <option value="hajj_alumni">Hajj Alumni</option>
                  <option value="vip">VIP Customers</option>
                  <option value="leads">Active Leads</option>
                  <option value="b2b">B2B Agents</option>
                </select>
              </div>

              <div>
                <label className="label">Message (SMS)</label>
                <textarea
                  className="input-field"
                  rows={5}
                  value={message}
                  onChange={e => handleMessageChange(e.target.value)}
                  placeholder="Type your SMS message here..."
                />
                <div className="flex justify-between mt-1 text-xs text-neutral-400">
                  <span>{charCount} characters</span>
                  <span>{smsCount} SMS{smsCount > 1 ? 's' : ''} per recipient</span>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg text-xs space-y-1 text-neutral-600">
                <div className="flex justify-between"><span>Est. Recipients:</span><span className="font-semibold">—</span></div>
                <div className="flex justify-between"><span>SMS per recipient:</span><span className="font-semibold">{smsCount}</span></div>
                <div className="flex justify-between border-t border-neutral-200 pt-1"><span className="font-medium">Est. Total SMS:</span><span className="font-bold text-primary-600">—</span></div>
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                {sending ? 'Sending...' : 'Send Campaign'}
              </button>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-heading font-semibold text-neutral-700 mb-4 flex items-center gap-2">
              <MessageCircle size={16} className="text-primary-500" /> Message Templates
            </h3>
            <div className="space-y-2">
              {CAMPAIGN_TEMPLATES.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => handleTemplate(tmpl.text)}
                  className="w-full text-left p-3 rounded-xl border border-neutral-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                >
                  <div className="text-sm font-medium text-neutral-700 mb-1">{tmpl.name}</div>
                  <div className="text-xs text-neutral-400 line-clamp-2">{tmpl.text}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="card p-4 bg-primary-50 border-primary-100">
            <h4 className="text-sm font-semibold text-primary-700 mb-2 flex items-center gap-2">
              <AlertCircle size={14} /> SMS Gateway
            </h4>
            <p className="text-xs text-primary-600">
              This platform integrates with <strong>SSL Wireless Bangladesh</strong> for bulk SMS delivery.
              Configure your API credentials in system settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
