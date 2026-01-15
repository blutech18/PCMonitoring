/**
 * Seed Data Script for PC Monitoring System
 * 
 * This script creates test user accounts and ensures existing admin accounts
 * are properly synced to the users table in Firebase Realtime Database.
 * 
 * Usage:
 *   node scripts/seedData.js
 * 
 * Test Accounts Created:
 *   - lebron23@gmail.com / user123 (role: user)
 *   - curry30@gmail.com / user123 (role: user)
 * 
 * Also syncs any existing admin accounts from Firebase Auth to users table.
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, listUsers } = require('firebase/auth');
const { getDatabase, ref, set, get } = require('firebase/database');

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

// Test accounts to create
const testAccounts = [
    {
        email: 'admin@pcmonitor.com',
        password: 'admin123',
        username: 'System Admin',
        role: 'admin'
    },
    {
        email: 'lebron23@gmail.com',
        password: 'user123',
        username: 'LeBron James',
        role: 'user'
    },
    {
        email: 'curry30@gmail.com',
        password: 'user123',
        username: 'Stephen Curry',
        role: 'user'
    }
];

/**
 * Generate a unique agent linking code
 */
function generateAgentCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Create user profile in database
 */
async function createUserProfile(userId, username, email, role) {
    const userRef = ref(database, `users/${userId}`);
    
    await set(userRef, {
        username,
        email,
        role,
        createdAt: new Date().toISOString(),
        settings: {
            sessionTimeLimit: 480,
            alertThreshold: 80,
            autoLogoutEnabled: false,
        },
    });

    // Generate agent linking code for user role
    if (role === 'user') {
        const agentCode = generateAgentCode();
        const agentCodeRef = ref(database, `users/${userId}/agentCode`);
        await set(agentCodeRef, {
            code: agentCode,
            createdAt: new Date().toISOString(),
            active: true,
        });
        console.log(`  ✓ Agent code generated: ${agentCode}`);
    }
}

/**
 * Check if user exists in database
 */
async function userExistsInDatabase(userId) {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    return snapshot.exists();
}

/**
 * Create a test account
 */
async function createTestAccount(account) {
    try {
        console.log(`\nCreating account: ${account.email}`);
        
        // Try to create the user
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            account.email,
            account.password
        );
        
        const userId = userCredential.user.uid;
        console.log(`  ✓ Firebase Auth user created (UID: ${userId})`);
        
        // Create user profile in database
        await createUserProfile(userId, account.username, account.email, account.role);
        console.log(`  ✓ User profile created in database`);
        console.log(`  ✓ Role: ${account.role}`);
        
        return { success: true, userId };
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            console.log(`  ⚠ Account already exists, attempting to sync...`);
            
            try {
                // Sign in to get the user ID
                const userCredential = await signInWithEmailAndPassword(
                    auth,
                    account.email,
                    account.password
                );
                const userId = userCredential.user.uid;
                
                // Check if user exists in database
                const existsInDb = await userExistsInDatabase(userId);
                
                if (!existsInDb) {
                    await createUserProfile(userId, account.username, account.email, account.role);
                    console.log(`  ✓ User profile synced to database (UID: ${userId})`);
                } else {
                    console.log(`  ✓ User already exists in database (UID: ${userId})`);
                }
                
                return { success: true, userId };
            } catch (syncError) {
                console.error(`  ✗ Failed to sync: ${syncError.message}`);
                return { success: false, error: syncError.message };
            }
        } else {
            console.error(`  ✗ Failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
}

/**
 * Sync existing admin accounts from Firebase Auth to database
 * Note: This requires Firebase Admin SDK for production use
 * For now, we'll check if there's a signed-in admin user
 */
async function syncExistingAdminAccounts() {
    console.log('\n=== Syncing Existing Admin Accounts ===');
    
    // Check if there's a currently signed-in user
    const currentUser = auth.currentUser;
    
    if (currentUser) {
        console.log(`\nFound signed-in user: ${currentUser.email}`);
        const userId = currentUser.uid;
        
        // Check if user exists in database
        const existsInDb = await userExistsInDatabase(userId);
        
        if (!existsInDb) {
            const username = currentUser.email?.split('@')[0] || 'Admin';
            await createUserProfile(userId, username, currentUser.email, 'admin');
            console.log(`  ✓ Admin profile synced to database (UID: ${userId})`);
        } else {
            console.log(`  ✓ Admin already exists in database (UID: ${userId})`);
        }
    } else {
        console.log('\n⚠ No signed-in user found.');
        console.log('To sync existing admin accounts:');
        console.log('1. Sign in to your admin account in the app');
        console.log('2. Run this script again');
        console.log('\nOR manually add the admin account details below:');
    }
}

/**
 * Main function
 */
async function main() {
    console.log('=== PC Monitoring System - Seed Data Script ===\n');
    console.log('This script will create test accounts and sync existing admin accounts.\n');
    
    let successCount = 0;
    let failCount = 0;
    
    // Create test accounts
    console.log('=== Creating Test Accounts ===');
    for (const account of testAccounts) {
        const result = await createTestAccount(account);
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    // Sync existing admin accounts
    await syncExistingAdminAccounts();
    
    // Summary
    console.log('\n=== Summary ===');
    console.log(`✓ Successfully created/synced: ${successCount} accounts`);
    if (failCount > 0) {
        console.log(`✗ Failed: ${failCount} accounts`);
    }
    
    console.log('\n=== Test Accounts ===');
    console.log('Email: admin@pcmonitor.com | Password: admin123 | Role: ADMIN');
    console.log('Email: lebron23@gmail.com | Password: user123 | Role: user');
    console.log('Email: curry30@gmail.com | Password: user123 | Role: user');
    
    console.log('\n✓ Seed data script completed!');
    console.log('\nNote: To sync existing admin accounts, sign in to the app first,');
    console.log('then run this script again.');
    
    process.exit(0);
}

// Run the script
main().catch((error) => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
});
