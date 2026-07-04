# ✈️ Sonar Madina Travels (SMT) — Management Portal v2.1.0

A comprehensive, professional ERP (Enterprise Resource Planning) system designed specifically for travel agencies in Bangladesh. This portal streamlines the management of Air Tickets, Umrah/Hajj pilgrimages, Tours, Finance, and HR.

---

## 🌟 Key Features

### 🎫 Sales & Operations

- **Individual Air Tickets**: Issue and track retail air tickets with automatic profit calculation.
- **B2B Group Sales**: Manage agency-to-agency group bookings and credit limits.
- **Umrah Management**: Full lifecycle tracking from package definition to pilgrim registration and visa status.
- **Hajj Management**: Specialized modules for Government and Private Hajj packages, including logistics and training tracking.
- **Tour Packages**: Manage domestic and international tour bookings with real-time seat availability.

### 💰 Finance & Accounts

- **Voucher Management**: Complete tracking of Payments, Receipts, Journal, and Contra entries.
- **Daily Cash Book**: Real-time monitoring of cash and bank balances.
- **Financial Reports**: Instant generation of Profit & Loss statements and Receivables reports.

### 👥 CRM & HR

- **Customer Database**: Centralized records for all travelers with passport/NID tracking.
- **Lead Management**: Sales pipeline tracking for prospective customers.
- **SMS Marketing**: Bulk SMS integration (SSL Wireless) for campaigns and alerts.
- **HR & Payroll**: Employee attendance, leave management, and monthly salary processing.

---

## 🛡️ Security & Architecture

This application is built with a **Security-First** approach to protect sensitive financial and personal data:

- **Role-Based Access Control (RBAC)**: Custom roles (Admin, Sales, Accounts, HR) ensure staff only see what they need.
- **Row Level Security (RLS)**: The database itself blocks unauthorized access to data at the row level.
- **Secure Authentication**: Powered by Supabase Auth with encrypted password hashing.
- **Dynamic Branding**: Company logo and naming can be updated globally from the System Settings.

---

## 🚀 Technology Stack

- **Frontend**: React.js (v18)
- **Build Tool**: Vite (Optimized for performance)
- **Styling**: Tailwind CSS (Premium Design System)
- **Icons**: Lucide React
- **Backend**: Supabase (Database, Auth, Storage)

---

## 🛠️ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)

### Installation

1.  Clone the repository or download the files.
2.  Open your terminal in the project directory.
3.  Install dependencies:
    ```bash
    npm install
    ```

### Environment Configuration

Create a `.env` file in the root directory and add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Running Locally

To start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 📄 License

This software is a proprietary management system for **Sonar Madina Travels**. All rights reserved.

---

_Developed with ❤️ for Sonar Madina Travels by Azigon.org_
