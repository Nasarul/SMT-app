import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar, ActiveModule } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { IndividualTicketPage } from './pages/tickets/IndividualTicketPage';
import { B2BTicketPage } from './pages/tickets/B2BTicketPage';
import { TicketReportsPage } from './pages/tickets/TicketReportsPage';
import { FlightSetupPage } from './pages/tickets/FlightSetupPage';
import { SuppliersPage } from './pages/tickets/SuppliersPage';
import { UmrahPackagesPage } from './pages/umrah/UmrahPackagesPage';
import { UmrahGroupsPage } from './pages/umrah/UmrahGroupsPage';
import { UmrahPilgrimsPage } from './pages/umrah/UmrahPilgrimsPage';
import { HajjPackagesPage } from './pages/hajj/HajjPackagesPage';
import { HajjPilgrimsPage } from './pages/hajj/HajjPilgrimsPage';
import { HajjLogisticsPage } from './pages/hajj/HajjLogisticsPage';
import { ToursPage } from './pages/tours/ToursPage';
import { TourBookingsPage } from './pages/tours/TourBookingsPage';
import { HotelBookingsPage } from './pages/hotels/HotelBookingsPage';
import { HotelDirectoryPage } from './pages/hotels/HotelDirectoryPage';
import { HotelSettingsPage } from './pages/hotels/HotelSettingsPage';
import { CustomersPage } from './pages/crm/CustomersPage';
import { LeadsPage } from './pages/crm/LeadsPage';
import { SMSCampaignPage } from './pages/crm/SMSCampaignPage';
import { B2BAgentsPage } from './pages/crm/B2BAgentsPage';
import { VisaPage } from './pages/crm/VisaPage';
import { initOfflineSync } from './lib/offlineSync';
import { QuotationsPage } from './pages/crm/QuotationsPage';
import { MobileDashboard } from './pages/MobileDashboard';
import { AuditLogPage } from './pages/AuditLogPage';
import { VouchersPage } from './pages/accounts/VouchersPage';
import { CashBookPage } from './pages/accounts/CashBookPage';
import { FinancialReportsPage } from './pages/accounts/FinancialReportsPage';
import { ReceivablesPage } from './pages/accounts/ReceivablesPage';
import { SupplierAgingPage } from './pages/accounts/SupplierAgingPage';
import { AssetsPage } from './pages/accounts/AssetsPage';
import { EmployeesPage } from './pages/hrm/EmployeesPage';
import { AttendancePage } from './pages/hrm/AttendancePage';
import { PayrollPage } from './pages/hrm/PayrollPage';
import { LeavesPage } from './pages/hrm/LeavesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

const moduleTitles: Record<ActiveModule, { title: string; subtitle?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of all operations' },
  'mobile-dashboard': { title: 'Management View', subtitle: 'Live mobile-optimized stats' },
  'tickets-individual': { title: 'Individual Air Tickets', subtitle: 'Retail ticket issuance' },
  'tickets-b2b': { title: 'B2B Group Tickets', subtitle: 'Agency-to-agency bookings' },
  'tickets-suppliers': { title: 'Ticket Suppliers', subtitle: 'Agencies we purchase from' },
  'tickets-report': { title: 'Ticket Reports', subtitle: 'Revenue and sales analytics' },
  'tickets-setup': { title: 'Flight Master Setup', subtitle: 'Manage airlines and destinations' },
  'hotels-bookings': { title: 'Hotel Bookings', subtitle: 'Hotel reservation & voucher management' },
  'hotels-directory': { title: 'Hotel Directory & Info', subtitle: 'Partner hotel directory & room rates' },
  'hotels-settings': { title: 'Hotel Settings', subtitle: 'Manage Room Categories & Meal Plans' },
  'umrah-packages': { title: 'Umrah Packages', subtitle: 'Package management' },
  'umrah-groups': { title: 'Umrah Groups', subtitle: 'Group travel management' },
  'umrah-pilgrims': { title: 'Umrah Pilgrims', subtitle: 'Pilgrim registration & tracking' },
  'hajj-packages': { title: 'Hajj Packages', subtitle: 'Government & private packages' },
  'hajj-pilgrims': { title: 'Hajj Pilgrims', subtitle: 'Pilgrim registration & tracking' },
  'hajj-logistics': { title: 'Hajj Logistics', subtitle: 'Flight & accommodation tracking' },
  'tours-domestic': { title: 'Domestic Tours', subtitle: 'Bangladesh tour packages' },
  'tours-international': { title: 'International Tours', subtitle: 'Overseas tour packages' },
  'tours-bookings': { title: 'Tour Bookings', subtitle: 'Booking management' },
  'hrm-employees': { title: 'Employees', subtitle: 'HR management' },
  'hrm-attendance': { title: 'Attendance', subtitle: 'Daily attendance tracking' },
  'hrm-leaves': { title: 'Leave Management', subtitle: 'Leave applications & approvals' },
  'hrm-payroll': { title: 'Payroll', subtitle: 'Monthly salary processing' },
  'accounts-vouchers': { title: 'Voucher Entry', subtitle: 'Payment, Receipt, Journal, Contra' },
  'accounts-cashbook': { title: 'Daily Cash Book', subtitle: 'Cash transaction ledger' },
  'accounts-receivables': { title: 'Receivables & Payables', subtitle: 'Outstanding management' },
  'accounts-suppliers-aging': { title: 'Supplier Aging Report', subtitle: 'Detailed accounts payable aging' },
  'accounts-reports': { title: 'Financial Reports', subtitle: 'P&L, Balance Sheet, Trial Balance' },
  'accounts-assets': { title: 'Assets & Investment', subtitle: 'Company inventory & capital' },
  'crm-customers': { title: 'Customer Database', subtitle: 'Customer records management' },
  'crm-leads': { title: 'Lead Management', subtitle: 'Sales pipeline tracking' },
  'crm-b2b': { title: 'B2B Partners', subtitle: 'Travel agency management' },
  'crm-visa': { title: 'Visa Processing', subtitle: 'Application tracking & status' },
  'crm-quotations': { title: 'Quotation Generator', subtitle: 'Create professional PDF quotes' },
  'audit-logs': { title: 'Audit Trail', subtitle: 'Full system activity history' },
  'crm-campaigns': { title: 'SMS Campaigns', subtitle: 'Bulk messaging via SSL Wireless' },
  notifications: { title: 'Notifications', subtitle: 'Alerts & reminders' },
  settings: { title: 'System Settings', subtitle: 'Company & Integration configuration' },
  profile: { title: 'My Profile', subtitle: 'Manage your personal information & security' },
};

function AppContent() {
  const { user, loading } = useAuth();
  const [active, setActive] = useState<ActiveModule>('dashboard');
  const [forceLoaded, setForceLoaded] = useState(false);

  useEffect(() => {
    initOfflineSync();
    // Safety fallback: Guarantee loading spinner unlocks after 1.5s max under all circumstances
    const timer = setTimeout(() => {
      setForceLoaded(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading && !forceLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-neutral-400">Loading Sonar Madina Travels...</p>
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const { title, subtitle } = moduleTitles[active] || { title: 'Module', subtitle: '' };

  const renderPage = () => {
    switch (active) {
      case 'dashboard': return <DashboardPage onNavigate={setActive} />;
      case 'mobile-dashboard': return <MobileDashboard />;
      case 'tickets-individual': return <IndividualTicketPage />;
      case 'tickets-b2b': return <B2BTicketPage />;
      case 'tickets-suppliers': return <SuppliersPage />;
      case 'tickets-report': return <TicketReportsPage />;
      case 'tickets-setup': return <FlightSetupPage />;
      case 'hotels-bookings': return <HotelBookingsPage />;
      case 'hotels-directory': return <HotelDirectoryPage />;
      case 'hotels-settings': return <HotelSettingsPage />;
      case 'umrah-packages': return <UmrahPackagesPage />;
      case 'umrah-groups': return <UmrahGroupsPage />;
      case 'umrah-pilgrims': return <UmrahPilgrimsPage />;
      case 'hajj-packages': return <HajjPackagesPage />;
      case 'hajj-pilgrims': return <HajjPilgrimsPage />;
      case 'hajj-logistics': return <HajjLogisticsPage />;
      case 'tours-domestic': return <ToursPage tourType="domestic" />;
      case 'tours-international': return <ToursPage tourType="international" />;
      case 'tours-bookings': return <TourBookingsPage />;
      case 'crm-customers': return <CustomersPage />;
      case 'crm-leads': return <LeadsPage />;
      case 'crm-b2b': return <B2BAgentsPage />;
      case 'crm-visa': return <VisaPage />;
      case 'crm-quotations': return <QuotationsPage />;
      case 'crm-campaigns': return <SMSCampaignPage />;
      case 'audit-logs': return <AuditLogPage />;
      case 'accounts-vouchers': return <VouchersPage />;
      case 'accounts-cashbook': return <CashBookPage />;
      case 'accounts-receivables': return <ReceivablesPage />;
      case 'accounts-suppliers-aging': return <SupplierAgingPage />;
      case 'accounts-reports': return <FinancialReportsPage />;
      case 'accounts-assets': return <AssetsPage />;
      case 'hrm-employees': return <EmployeesPage />;
      case 'hrm-attendance': return <AttendancePage />;
      case 'hrm-leaves': return <LeavesPage />;
      case 'hrm-payroll': return <PayrollPage />;
      case 'notifications': return <NotificationsPage />;
      case 'settings': return <SettingsPage />;
      case 'profile': return <ProfilePage />;

      default: return <DashboardPage onNavigate={setActive} />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar active={active} onNavigate={setActive} />
      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header title={title} subtitle={subtitle} onNavigate={setActive} />
        <main className="flex-1">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <AppContent />
      </SettingsProvider>
    </AuthProvider>
  );
}
