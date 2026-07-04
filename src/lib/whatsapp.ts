/**
 * Utility to send WhatsApp messages using the wa.me API
 * @param phone The phone number (with or without country code)
 * @param message The pre-formatted message
 */
export function sendWhatsAppMessage(phone: string, message: string) {
  // Clean phone number: remove spaces, dashes, and handle missing country code
  let cleanPhone = phone.replace(/[^\d]/g, '');
  
  // If no country code, prepend Bangladesh (+880)
  if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
    cleanPhone = '88' + cleanPhone;
  } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('88')) {
    cleanPhone = '880' + cleanPhone;
  }

  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  
  window.open(url, '_blank');
}

/**
 * Format ticket details for WhatsApp
 */
export function formatTicketWhatsApp(data: any) {
  return `*✈️ Sonar Madina Travels — Ticket Details*

*Passenger:* ${data.passenger_name}
*Route:* ${data.route || 'N/A'}
*Airline:* ${data.airline || 'N/A'}
*PNR/Ticket:* ${data.pnr_number || data.ticket_number || 'N/A'}
*Travel Date:* ${data.travel_date || 'N/A'}
*Total Fare:* BDT ${data.total_fare || 0}

_Thank you for choosing Sonar Madina Travels._`;
}

/**
 * Format visa status for WhatsApp
 */
export function formatVisaWhatsApp(data: any) {
  return `*🛂 Sonar Madina Travels — Visa Update*

*Passenger:* ${data.passenger_name}
*Passport:* ${data.passport_number}
*Country:* ${data.country}
*Visa Type:* ${data.visa_type}
*Current Status:* ${data.status.toUpperCase()}

_We will notify you once further updates are available._`;
}

/**
 * Format payment receipt for WhatsApp
 */
export function formatReceiptWhatsApp(data: any) {
  return `*💰 Sonar Madina Travels — Payment Receipt*

*Voucher #:* ${data.voucher_number || 'N/A'}
*Date:* ${data.voucher_date}
*Party:* ${data.party_name}
*Amount:* BDT ${data.amount}
*Mode:* ${data.payment_mode.toUpperCase()}
*Description:* ${data.description}

_This is an automated confirmation of your payment._`;
}
