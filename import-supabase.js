import { Client, Databases, ID } from 'node-appwrite';
import { createClient } from '@supabase/supabase-js';

// ==========================================
// 1. PUT YOUR SUPABASE DETAILS HERE
// ==========================================
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-supabase-anon-key';

// ==========================================
// 2. PUT YOUR APPWRITE DETAILS HERE
// ==========================================
const APPWRITE_ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT = '6a4913e0003115e46052';
const APPWRITE_API_KEY = 'YOUR_APPWRITE_API_KEY_HERE'; // Use the same API key you used for migrate-schema.js
const APPWRITE_DB = '6a4918ff00301840c22b';

// ==========================================
// 3. WHICH TABLE DO YOU WANT TO IMPORT?
// ==========================================
const TABLE_NAME = 'air_tickets'; // Change this to 'profiles', 'customers', etc.


// --- DO NOT EDIT BELOW THIS LINE ---
async function migrate() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);
  
  const databases = new Databases(client);

  console.log(`📡 Fetching data from Supabase table: ${TABLE_NAME}...`);
  const { data, error } = await supabase.from(TABLE_NAME).select('*');
  
  if (error) {
    console.error("❌ Error fetching from Supabase:", error.message);
    return;
  }
  
  console.log(`📦 Found ${data.length} records. Importing to Appwrite...`);
  
  let successCount = 0;
  let failCount = 0;

  for (const row of data) {
    // Save the old Supabase ID to use as the Appwrite Document ID
    const docId = row.id || ID.unique(); 
    
    // Remove the 'id' field because Appwrite uses '$id' inherently
    delete row.id; 

    // Remove any fields that Appwrite doesn't like or that might be null relations
    Object.keys(row).forEach(key => {
        if (row[key] === null) delete row[key]; // Appwrite prefers missing keys over 'null' for optional fields
    });

    try {
      await databases.createDocument(APPWRITE_DB, TABLE_NAME, docId, row);
      console.log(`✅ Imported: ${docId}`);
      successCount++;
    } catch (err) {
      // If it already exists (409), that's fine, we can update it instead or just skip
      if (err.code === 409) {
          console.log(`⚠️ Skipped (Already exists): ${docId}`);
      } else {
          console.error(`❌ Failed: ${docId} ->`, err.message);
          failCount++;
      }
    }
  }
  
  console.log(`\n🎉 Migration Complete for '${TABLE_NAME}'!`);
  console.log(`✅ Success: ${successCount} | ❌ Failed: ${failCount}`);
}

migrate();
