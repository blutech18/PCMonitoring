/**
 * Promote User to Admin Script
 * 
 * This script promotes an existing user to admin role.
 * 
 * Usage:
 *   node scripts/promoteToAdmin.js <email>
 * 
 * Example:
 *   node scripts/promoteToAdmin.js lebron23@gmail.com
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, get, update } = require('firebase/database');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAwzHTgC6JwWOXJW0PskaT86Xz7DDuCuXg",
    authDomain: "pcmonitoring-2178d.firebaseapp.com",
    databaseURL: "https://pcmonitoring-2178d-default-rtdb.firebaseio.com",
    projectId: "pcmonitoring-2178d",
    storageBucket: "pcmonitoring-2178d.firebasestorage.app",
    messagingSenderId: "537521857092",
    appId: "1:537521857092:web:951339630642059502d211"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

async function promoteUserToAdmin(email) {
    console.log(`\n=== Promoting ${email} to Admin ===\n`);
    
    try {
        // Find user by email in database
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val();
        
        if (!users) {
            console.log('❌ No users found in database');
            process.exit(1);
        }
        
        // Find user with matching email
        let userId = null;
        let userData = null;
        
        for (const [id, user] of Object.entries(users)) {
            if (user.email === email) {
                userId = id;
                userData = user;
                break;
            }
        }
        
        if (!userId) {
            console.log(`❌ User with email ${email} not found`);
            console.log('\nAvailable users:');
            for (const [id, user] of Object.entries(users)) {
                console.log(`  - ${user.email} (${user.role})`);
            }
            process.exit(1);
        }
        
        console.log(`Found user: ${userData.username} (${userData.email})`);
        console.log(`Current role: ${userData.role}`);
        
        if (userData.role === 'admin') {
            console.log('\n✓ User is already an admin!');
            process.exit(0);
        }
        
        // Update role to admin
        const userRef = ref(database, `users/${userId}`);
        await update(userRef, { role: 'admin' });
        
        console.log(`\n✓ Successfully promoted ${email} to admin!`);
        console.log('\nYou can now login with this account to access admin features:');
        console.log('- User Management');
        console.log('- System-wide Reports');
        console.log('- All users data');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
    
    process.exit(0);
}

// Get email from command line
const email = process.argv[2];

if (!email) {
    console.log('Usage: node scripts/promoteToAdmin.js <email>');
    console.log('Example: node scripts/promoteToAdmin.js lebron23@gmail.com');
    process.exit(1);
}

promoteUserToAdmin(email);
