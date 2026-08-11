import { Client, Users, ID, Databases } from 'node-appwrite';

// Appwrite Configuration
const API_KEY = "standard_53cd2dfbe0768951ab68f63f0083f8b3ae91560ef22fa7e18d0c9bcb47751f093e4eac37df33b857a28c403a5624372e4705bfecc71166b7b3e2fa24be759596678a5b14e88dafd34d6d3ae6091b6d23fce734bec71657ea5b016f2f072c932e524e3614be7a220119c34d809aafacd7f3692ff665e0a3f70e266b0c916295f0";
const endpoint = "https://sgp.cloud.appwrite.io/v1";
const projectId = "6a4913e0003115e46052";
const databaseId = "6a4918ff00301840c22b";

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(API_KEY);

const users = new Users(client);
const databases = new Databases(client);

async function createAdmin() {
  const email = process.argv[2] || "nasarulhasan@gmail.com";
  const password = process.argv[3] || "!@#$%^&*";
  const fullName = "Nasarul Hasan";
  let userId;

  try {
    console.log(`Checking if user ${email} exists in Appwrite Auth...`);
    const userList = await users.list();
    const existingUser = userList.users.find(u => u.email === email);

    if (existingUser) {
      console.log(`User ${email} already exists! Updating password...`);
      await users.updatePassword(existingUser.$id, password);
      console.log(`✅ Password updated successfully for ${email}`);
      userId = existingUser.$id;
    } else {
      console.log(`Creating new user ${email}...`);
      const user = await users.create(ID.unique(), email, undefined, password, fullName);
      console.log(`✅ User created successfully! ID: ${user.$id}`);
      userId = user.$id;
    }
    
    // Check if profile exists
    try {
        await databases.getDocument(databaseId, 'profiles', userId);
        console.log(`✅ Profile already exists for this user.`);
    } catch (err) {
        if (err.code === 404) {
            console.log(`Creating profile document for ${email}...`);
            await databases.createDocument(databaseId, 'profiles', userId, {
                full_name: fullName,
                role: 'super_admin',
                phone: '01XXXXXXXXX',
                is_active: true,
                created_at: new Date().toISOString()
            });
            console.log(`✅ Profile document created successfully!`);
        } else {
            console.error("Error checking profile:", err.message);
        }
    }
    
    console.log(`\n🎉 Success! You can now log in with:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    
  } catch (error) {
    console.error("❌ Error creating/updating user:", error.message);
    if (error.message.includes("paused due to inactivity")) {
      console.error("\n💡 CRITICAL NOTE: Your Appwrite project is currently PAUSED on Appwrite Cloud.");
      console.error("   Please go to https://cloud.appwrite.io , select project ID 6a4913e0003115e46052, and click 'Restore' or 'Unpause'.");
      console.error("   After unpausing the project, run this script again: node create-admin.js");
    }
  }
}

createAdmin();

