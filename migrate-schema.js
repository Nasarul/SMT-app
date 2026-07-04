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
  profiles: {
    full_name: { type: 'string', size: 255 },
    role: { type: 'string', size: 50 },
    phone: { type: 'string', size: 50 },
    avatar_url: { type: 'string', size: 1000 },
    is_active: { type: 'boolean' },
    created_at: { type: 'datetime' }
  },
  employees: {
    employee_code: { type: 'string', size: 50 },
    profile_id: { type: 'string', size: 50 },
    full_name: { type: 'string', size: 255 },
    nid: { type: 'string', size: 50 },
    mobile: { type: 'string', size: 50 },
    email: { type: 'string', size: 255 },
    department: { type: 'string', size: 50 },
    designation: { type: 'string', size: 100 },
    joining_date: { type: 'datetime' },
    basic_salary: { type: 'float' },
    house_rent: { type: 'float' },
    medical_allowance: { type: 'float' },
    transport_allowance: { type: 'float' },
    mobile_allowance: { type: 'float' },
    photo_url: { type: 'string', size: 1000 },
    nid_url: { type: 'string', size: 1000 },
    is_active: { type: 'boolean' }
  },
  customers: {
    customer_code: { type: 'string', size: 50 },
    full_name: { type: 'string', size: 255 },
    mobile: { type: 'string', size: 50 },
    email: { type: 'string', size: 255 },
    nid: { type: 'string', size: 50 },
    passport_number: { type: 'string', size: 100 },
    gender: { type: 'string', size: 20 },
    category: { type: 'string', size: 50 },
    created_at: { type: 'datetime' }
  },
  tours: {
    tour_name: { type: 'string', size: 255 },
    tour_type: { type: 'string', size: 50 },
    destination: { type: 'string', size: 255 },
    duration_days: { type: 'integer' },
    price_per_person: { type: 'float' },
    max_seats: { type: 'integer' },
    status: { type: 'string', size: 50 }
  },
  b2b_agents: {
    agency_name: { type: 'string', size: 255 },
    contact_person: { type: 'string', size: 255 },
    mobile: { type: 'string', size: 50 },
    credit_limit: { type: 'float' },
    current_balance: { type: 'float' }
  },
  air_tickets: {
    ticket_number: { type: 'string', size: 100 },
    ticket_type: { type: 'string', size: 50 },
    customer_id: { type: 'string', size: 50 },
    passenger_name: { type: 'string', size: 255 },
    airline: { type: 'string', size: 100 },
    pnr: { type: 'string', size: 50 },
    origin: { type: 'string', size: 100 },
    destination: { type: 'string', size: 100 },
    total_fare: { type: 'float' },
    status: { type: 'string', size: 50 }
  }
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
