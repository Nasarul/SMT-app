import { Client, Databases, Permission, Role } from 'node-appwrite';

// NOTE: You must install the node-appwrite package to run this:
// npm install node-appwrite

// ADD YOUR APPWRITE API KEY HERE:
// Go to Appwrite Dashboard -> Your Project -> Overview -> "Integrations" or "API Keys"
// Create an API key with permissions: collections.read, collections.write, attributes.read, attributes.write
const API_KEY = "standard_53cd2dfbe0768951ab68f63f0083f8b3ae91560ef22fa7e18d0c9bcb47751f093e4eac37df33b857a28c403a5624372e4705bfecc71166b7b3e2fa24be759596678a5b14e88dafd34d6d3ae6091b6d23fce734bec71657ea5b016f2f072c932e524e3614be7a220119c34d809aafacd7f3692ff665e0a3f70e266b0c916295f0";

const endpoint = "https://sgp.cloud.appwrite.io/v1";
const projectId = "6a4913e0003115e46052";
const databaseId = "6a4918ff00301840c22b";

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(API_KEY);

const databases = new Databases(client);

// Define the Schema matching your SQL file
const schema = {
  profiles: { full_name: { type: 'string', size: 255 }, role: { type: 'string', size: 50 }, phone: { type: 'string', size: 50 }, avatar_url: { type: 'string', size: 1000 }, is_active: { type: 'boolean' }, created_at: { type: 'datetime' } },
  employees: { employee_code: { type: 'string', size: 50 }, profile_id: { type: 'string', size: 50 }, full_name: { type: 'string', size: 255 }, nid: { type: 'string', size: 50 }, mobile: { type: 'string', size: 50 }, email: { type: 'string', size: 255 }, department: { type: 'string', size: 50 }, designation: { type: 'string', size: 100 }, joining_date: { type: 'datetime' }, basic_salary: { type: 'float' }, house_rent: { type: 'float' }, medical_allowance: { type: 'float' }, transport_allowance: { type: 'float' }, mobile_allowance: { type: 'float' }, photo_url: { type: 'string', size: 1000 }, nid_url: { type: 'string', size: 1000 }, is_active: { type: 'boolean' } },
  customers: { customer_code: { type: 'string', size: 50 }, full_name: { type: 'string', size: 255 }, mobile: { type: 'string', size: 50 }, email: { type: 'string', size: 255 }, nid: { type: 'string', size: 50 }, passport_number: { type: 'string', size: 100 }, gender: { type: 'string', size: 20 }, category: { type: 'string', size: 50 }, created_at: { type: 'datetime' } },
  hotels: { hotel_name: { type: 'string', size: 255 }, city: { type: 'string', size: 100 }, country: { type: 'string', size: 100 }, star_rating: { type: 'integer' }, address: { type: 'string', size: 1000 }, contact_person: { type: 'string', size: 255 }, contact_phone: { type: 'string', size: 50 }, contact_email: { type: 'string', size: 255 }, distance_to_landmark: { type: 'string', size: 255 }, standard_rate_bdt: { type: 'float' }, hotel_rules: { type: 'string', size: 2000 }, cancellation_policy: { type: 'string', size: 2000 } },
  hotel_bookings: { booking_reference: { type: 'string', size: 100 }, hotel_confirmation_id: { type: 'string', size: 100 }, customer_name: { type: 'string', size: 255 }, customer_phone: { type: 'string', size: 50 }, customer_id: { type: 'string', size: 50 }, nationality: { type: 'string', size: 100 }, adults_count: { type: 'integer' }, children_count: { type: 'integer' }, hotel_name: { type: 'string', size: 255 }, hotel_address: { type: 'string', size: 1000 }, city: { type: 'string', size: 100 }, room_type: { type: 'string', size: 50 }, rooms_count: { type: 'integer' }, room_details: { type: 'string', size: 500 }, check_in_date: { type: 'string', size: 50 }, check_out_date: { type: 'string', size: 50 }, total_nights: { type: 'integer' }, meal_plan: { type: 'string', size: 100 }, cost_price: { type: 'float' }, total_fare: { type: 'float' }, paid_amount: { type: 'float' }, profit: { type: 'float' }, status: { type: 'string', size: 50 }, special_requests: { type: 'string', size: 1000 }, hotel_rules: { type: 'string', size: 2000 }, cancellation_policy: { type: 'string', size: 2000 } },
  tours: { tour_name: { type: 'string', size: 255 }, tour_type: { type: 'string', size: 50 }, destination: { type: 'string', size: 255 }, duration_days: { type: 'integer' }, price_per_person: { type: 'float' }, max_seats: { type: 'integer' }, status: { type: 'string', size: 50 } },
  b2b_agents: { agency_name: { type: 'string', size: 255 }, contact_person: { type: 'string', size: 255 }, mobile: { type: 'string', size: 50 }, credit_limit: { type: 'float' }, current_balance: { type: 'float' } },
  air_tickets: { ticket_number: { type: 'string', size: 100 }, ticket_type: { type: 'string', size: 50 }, customer_id: { type: 'string', size: 50 }, passenger_name: { type: 'string', size: 255 }, airline: { type: 'string', size: 100 }, pnr: { type: 'string', size: 50 }, origin: { type: 'string', size: 100 }, destination: { type: 'string', size: 100 }, total_fare: { type: 'float' }, status: { type: 'string', size: 50 }, metadata: { type: 'string', size: 5000 } },
  
  // NEW TABLES ADDED:
  suppliers: { company_name: { type: 'string', size: 255 }, contact_person: { type: 'string', size: 255 }, mobile: { type: 'string', size: 50 }, email: { type: 'string', size: 255 }, address: { type: 'string', size: 500 }, current_balance: { type: 'float' }, is_active: { type: 'boolean' } },
  umrah_packages: { package_name: { type: 'string', size: 255 }, duration_nights: { type: 'integer' }, hotel_category: { type: 'integer' }, makkah_hotel: { type: 'string', size: 255 }, madinah_hotel: { type: 'string', size: 255 }, makkah_distance_meters: { type: 'integer' }, madinah_distance_meters: { type: 'integer' }, meal_plan: { type: 'string', size: 50 }, visa_included: { type: 'boolean' }, price_sharing: { type: 'float' }, price_triple: { type: 'float' }, price_double: { type: 'float' }, price_single: { type: 'float' }, season: { type: 'string', size: 50 }, is_active: { type: 'boolean' } },
  umrah_groups: { group_name: { type: 'string', size: 255 }, package_id: { type: 'string', size: 50 }, departure_date: { type: 'datetime' }, return_date: { type: 'datetime' }, airline: { type: 'string', size: 100 }, flight_number: { type: 'string', size: 50 }, group_leader: { type: 'string', size: 255 }, coordinator_id: { type: 'string', size: 50 }, moallim_name: { type: 'string', size: 255 }, max_pilgrims: { type: 'integer' }, status: { type: 'string', size: 50 } },
  umrah_pilgrims: { group_id: { type: 'string', size: 50 }, customer_id: { type: 'string', size: 50 }, full_name: { type: 'string', size: 255 }, full_name_arabic: { type: 'string', size: 255 }, passport_number: { type: 'string', size: 50 }, passport_issue_date: { type: 'datetime' }, passport_expiry: { type: 'datetime' }, nid: { type: 'string', size: 50 }, date_of_birth: { type: 'datetime' }, blood_group: { type: 'string', size: 10 }, gender: { type: 'string', size: 20 }, mahram_name: { type: 'string', size: 255 }, mahram_relation: { type: 'string', size: 50 }, emergency_contact: { type: 'string', size: 255 }, emergency_phone: { type: 'string', size: 50 }, room_type: { type: 'string', size: 50 }, package_price: { type: 'float' }, total_paid: { type: 'float' }, visa_status: { type: 'string', size: 50 }, visa_applied_date: { type: 'datetime' }, visa_approved_date: { type: 'datetime' }, ticket_status: { type: 'boolean' }, vaccination_status: { type: 'boolean' }, insurance_status: { type: 'boolean' }, training_status: { type: 'boolean' }, pre_departure_done: { type: 'boolean' }, notes: { type: 'string', size: 1000 } },
  hajj_packages: { package_name: { type: 'string', size: 255 }, package_type: { type: 'string', size: 50 }, maktab_number: { type: 'string', size: 50 }, mina_building: { type: 'string', size: 255 }, arafat_camp: { type: 'string', size: 255 }, tent_category: { type: 'string', size: 100 }, price: { type: 'float' }, season_year: { type: 'integer' }, is_active: { type: 'boolean' } },
  hajj_pilgrims: { package_id: { type: 'string', size: 50 }, customer_id: { type: 'string', size: 50 }, full_name: { type: 'string', size: 255 }, passport_number: { type: 'string', size: 50 }, passport_expiry: { type: 'datetime' }, nid: { type: 'string', size: 50 }, date_of_birth: { type: 'datetime' }, blood_group: { type: 'string', size: 10 }, gender: { type: 'string', size: 20 }, hajj_serial: { type: 'string', size: 100 }, mahram_declaration: { type: 'string', size: 255 }, health_declaration: { type: 'boolean' }, meningitis_vaccine: { type: 'boolean' }, shoe_size: { type: 'string', size: 20 }, clothing_size: { type: 'string', size: 20 }, muassasa: { type: 'string', size: 255 }, mutawwif: { type: 'string', size: 255 }, package_price: { type: 'float' }, total_paid: { type: 'float' }, govt_fee_paid: { type: 'boolean' }, visa_status: { type: 'string', size: 50 }, flight_departure: { type: 'datetime' }, flight_return: { type: 'datetime' }, status: { type: 'string', size: 50 } },
  hajj_logistics: { pilgrim_id: { type: 'string', size: 50 }, flight_dep_no: { type: 'string', size: 100 }, flight_dep_time: { type: 'datetime' }, flight_ret_no: { type: 'string', size: 100 }, flight_ret_time: { type: 'datetime' }, mina_tent: { type: 'string', size: 255 }, arafat_camp: { type: 'string', size: 255 }, muzdalifa_status: { type: 'boolean' }, makkah_room: { type: 'string', size: 255 }, madinah_room: { type: 'string', size: 255 }, bus_number: { type: 'string', size: 100 }, is_training_complete: { type: 'boolean' }, is_visa_issued: { type: 'boolean' }, is_kit_provided: { type: 'boolean' } },
  tour_bookings: { tour_id: { type: 'string', size: 50 }, customer_id: { type: 'string', size: 50 }, booking_date: { type: 'datetime' }, participants: { type: 'integer' }, total_amount: { type: 'float' }, paid_amount: { type: 'float' }, status: { type: 'string', size: 50 }, notes: { type: 'string', size: 1000 } },
  attendance: { employee_id: { type: 'string', size: 50 }, attendance_date: { type: 'datetime' }, check_in: { type: 'string', size: 50 }, check_out: { type: 'string', size: 50 }, status: { type: 'string', size: 50 }, notes: { type: 'string', size: 500 } },
  leaves: { employee_id: { type: 'string', size: 50 }, leave_type: { type: 'string', size: 50 }, from_date: { type: 'datetime' }, to_date: { type: 'datetime' }, days: { type: 'integer' }, reason: { type: 'string', size: 500 }, status: { type: 'string', size: 50 }, approved_by: { type: 'string', size: 50 } },
  payroll: { employee_id: { type: 'string', size: 50 }, month: { type: 'integer' }, year: { type: 'integer' }, basic_salary: { type: 'float' }, house_rent: { type: 'float' }, medical_allowance: { type: 'float' }, transport_allowance: { type: 'float' }, mobile_allowance: { type: 'float' }, other_allowances: { type: 'float' }, bonus: { type: 'float' }, deductions: { type: 'float' }, net_payable: { type: 'float' }, status: { type: 'string', size: 50 }, paid_at: { type: 'datetime' }, payment_mode: { type: 'string', size: 50 }, notes: { type: 'string', size: 500 } },
  accounts_vouchers: { voucher_number: { type: 'string', size: 100 }, voucher_type: { type: 'string', size: 50 }, voucher_date: { type: 'datetime' }, party_name: { type: 'string', size: 255 }, cost_center: { type: 'string', size: 100 }, description: { type: 'string', size: 1000 }, debit_account: { type: 'string', size: 255 }, credit_account: { type: 'string', size: 255 }, amount: { type: 'float' }, reference: { type: 'string', size: 255 }, payment_mode: { type: 'string', size: 50 }, bank_account: { type: 'string', size: 255 }, cheque_number: { type: 'string', size: 100 }, is_posted: { type: 'boolean' }, created_by: { type: 'string', size: 50 } },
  crm_leads: { full_name: { type: 'string', size: 255 }, mobile: { type: 'string', size: 50 }, email: { type: 'string', size: 255 }, source: { type: 'string', size: 100 }, interest: { type: 'string', size: 100 }, status: { type: 'string', size: 50 }, assigned_to: { type: 'string', size: 50 }, follow_up_date: { type: 'datetime' }, notes: { type: 'string', size: 1000 }, referral_customer_id: { type: 'string', size: 50 }, created_by: { type: 'string', size: 50 } },
  payment_receipts: { receipt_number: { type: 'string', size: 100 }, receipt_date: { type: 'datetime' }, customer_id: { type: 'string', size: 50 }, module: { type: 'string', size: 100 }, reference_id: { type: 'string', size: 50 }, amount: { type: 'float' }, payment_mode: { type: 'string', size: 50 }, installment_number: { type: 'integer' }, notes: { type: 'string', size: 1000 }, invoice_id: { type: 'string', size: 100 }, created_by: { type: 'string', size: 50 } },
  visas: { customer_id: { type: 'string', size: 50 }, passenger_name: { type: 'string', size: 255 }, passport_number: { type: 'string', size: 50 }, visa_type: { type: 'string', size: 100 }, country: { type: 'string', size: 100 }, status: { type: 'string', size: 50 }, submission_date: { type: 'datetime' }, delivery_date: { type: 'datetime' }, visa_fee: { type: 'float' }, service_charge: { type: 'float' }, total_amount: { type: 'float' }, cost_amount: { type: 'float' }, profit: { type: 'float' }, notes: { type: 'string', size: 1000 }, created_by: { type: 'string', size: 50 } },
  settings: { key: { type: 'string', size: 255 }, value: { type: 'string', size: 5000 } },
  assets: { asset_name: { type: 'string', size: 255 }, asset_type: { type: 'string', size: 100 }, category: { type: 'string', size: 100 }, acquisition_date: { type: 'datetime' }, initial_value: { type: 'float' }, current_value: { type: 'float' }, depreciation_rate: { type: 'float' }, status: { type: 'string', size: 50 }, notes: { type: 'string', size: 1000 } },
  notifications: { user_id: { type: 'string', size: 50 }, title: { type: 'string', size: 255 }, message: { type: 'string', size: 1000 }, type: { type: 'string', size: 50 }, is_read: { type: 'boolean' }, module: { type: 'string', size: 100 }, reference_id: { type: 'string', size: 50 } },
  quotations: { customer_id: { type: 'string', size: 50 }, status: { type: 'string', size: 50 }, total_amount: { type: 'float' } },
  site_settings: { key: { type: 'string', size: 255 }, value: { type: 'string', size: 5000 } }
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMigration() {
  console.log("Starting Appwrite Database Migration...");

  for (const [collectionId, attributes] of Object.entries(schema)) {
    console.log(`\n--- Creating Collection: ${collectionId} ---`);
    try {
      // 1. Create Collection
      await databases.createCollection(
        databaseId,
        collectionId,
        collectionId,
        [
          Permission.read(Role.any()),
          Permission.create(Role.any()),
          Permission.update(Role.any()),
          Permission.delete(Role.any())
        ]
      );
      console.log(`✅ Collection '${collectionId}' created.`);

      // Wait a moment for the collection to be registered internally
      await sleep(1000);

      // 2. Create Attributes
      for (const [attrName, attrConfig] of Object.entries(attributes)) {
        try {
          if (attrConfig.type === 'string') {
            await databases.createStringAttribute(databaseId, collectionId, attrName, attrConfig.size || 255, false);
          } else if (attrConfig.type === 'boolean') {
            await databases.createBooleanAttribute(databaseId, collectionId, attrName, false);
          } else if (attrConfig.type === 'float') {
            await databases.createFloatAttribute(databaseId, collectionId, attrName, false);
          } else if (attrConfig.type === 'integer') {
            await databases.createIntegerAttribute(databaseId, collectionId, attrName, false);
          } else if (attrConfig.type === 'datetime') {
            await databases.createDatetimeAttribute(databaseId, collectionId, attrName, false);
          }
          console.log(`   Added attribute: ${attrName} (${attrConfig.type})`);

          // Appwrite has rate limits for attribute creation, so we pause briefly
          await sleep(500);
        } catch (attrErr) {
          console.log(`   ❌ Failed to add attribute ${attrName}: ${attrErr.message}`);
        }
      }
    } catch (error) {
      if (error.code === 409) {
        console.log(`⚠️ Collection '${collectionId}' already exists. Skipping creation...`);
      } else {
        console.error(`❌ Failed to create collection '${collectionId}':`, error.message);
      }
    }
  }

  console.log("\n🎉 Migration completed!");
}

runMigration();
