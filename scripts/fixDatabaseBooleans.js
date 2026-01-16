/**
 * Fix Database Boolean Values Script
 * 
 * This script fixes the "java.lang.String cannot be cast to java.lang.Boolean" error
 * by converting all string boolean values ("true"/"false") to actual booleans (true/false)
 * in Firebase Realtime Database.
 * 
 * What it fixes:
 * - Notification 'read' and 'acknowledged' fields
 * - Settings 'autoLogoutEnabled' field
 * - Agent code 'active' field
 * - Any other boolean fields stored as strings
 * 
 * Usage:
 *   node scripts/fixDatabaseBooleans.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getDatabase, ref, get, update, set } = require('firebase/database');
const readline = require('readline');

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

/**
 * Convert string boolean to actual boolean
 */
function toBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return Boolean(value);
}

/**
 * Recursively sanitize all boolean strings in an object
 */
function sanitizeBooleans(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        if (obj === 'true') return true;
        if (obj === 'false') return false;
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(sanitizeBooleans);
    }
    
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeBooleans(value);
        }
        return sanitized;
    }
    
    return obj;
}

/**
 * Prompt for credentials
 */
async function promptCredentials() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        console.log('Please enter your credentials to authenticate:\n');
        rl.question('Email: ', (email) => {
            rl.question('Password: ', (password) => {
                rl.close();
                resolve({ email, password });
            });
        });
    });
}

/**
 * Fix notifications for a user
 */
async function fixUserNotifications(userId) {
    console.log('  Checking notifications...');
    const notifRef = ref(database, `users/${userId}/notifications`);
    const snapshot = await get(notifRef);
    
    if (!snapshot.exists()) {
        console.log('    No notifications found');
        return 0;
    }
    
    const notifications = snapshot.val();
    let fixCount = 0;
    
    for (const [notifId, notif] of Object.entries(notifications)) {
        let needsUpdate = false;
        const updates = {};
        
        // Check 'read' field
        if (typeof notif.read === 'string') {
            updates.read = toBoolean(notif.read);
            needsUpdate = true;
        }
        
        // Check 'acknowledged' field
        if (typeof notif.acknowledged === 'string') {
            updates.acknowledged = toBoolean(notif.acknowledged);
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            const notifUpdateRef = ref(database, `users/${userId}/notifications/${notifId}`);
            await update(notifUpdateRef, updates);
            fixCount++;
        }
    }
    
    if (fixCount > 0) {
        console.log(`    ✓ Fixed ${fixCount} notification(s)`);
    } else {
        console.log('    ✓ All notifications OK');
    }
    
    return fixCount;
}

/**
 * Fix settings for a user
 */
async function fixUserSettings(userId) {
    console.log('  Checking settings...');
    const settingsRef = ref(database, `users/${userId}/settings`);
    const snapshot = await get(settingsRef);
    
    if (!snapshot.exists()) {
        console.log('    No settings found');
        return 0;
    }
    
    const settings = snapshot.val();
    let fixCount = 0;
    
    // Check 'autoLogoutEnabled' field
    if (typeof settings.autoLogoutEnabled === 'string') {
        const updates = {
            autoLogoutEnabled: toBoolean(settings.autoLogoutEnabled)
        };
        await update(settingsRef, updates);
        fixCount++;
        console.log('    ✓ Fixed autoLogoutEnabled');
    } else {
        console.log('    ✓ Settings OK');
    }
    
    return fixCount;
}

/**
 * Fix agent code for a user
 */
async function fixUserAgentCode(userId) {
    console.log('  Checking agent code...');
    const agentCodeRef = ref(database, `users/${userId}/agentCode`);
    const snapshot = await get(agentCodeRef);
    
    if (!snapshot.exists()) {
        console.log('    No agent code found');
        return 0;
    }
    
    const agentCode = snapshot.val();
    let fixCount = 0;
    
    // Check 'active' field
    if (typeof agentCode.active === 'string') {
        const updates = {
            active: toBoolean(agentCode.active)
        };
        await update(agentCodeRef, updates);
        fixCount++;
        console.log('    ✓ Fixed active field');
    } else {
        console.log('    ✓ Agent code OK');
    }
    
    return fixCount;
}

/**
 * Fix public agent codes
 */
async function fixPublicAgentCodes() {
    console.log('\nChecking public agent codes...');
    const agentCodesRef = ref(database, 'agentCodes');
    const snapshot = await get(agentCodesRef);
    
    if (!snapshot.exists()) {
        console.log('  No public agent codes found');
        return 0;
    }
    
    const agentCodes = snapshot.val();
    let fixCount = 0;
    
    for (const [code, data] of Object.entries(agentCodes)) {
        if (data && typeof data.active === 'string') {
            const codeRef = ref(database, `agentCodes/${code}`);
            await update(codeRef, {
                active: toBoolean(data.active)
            });
            fixCount++;
        }
    }
    
    if (fixCount > 0) {
        console.log(`  ✓ Fixed ${fixCount} public agent code(s)`);
    } else {
        console.log('  ✓ All public agent codes OK');
    }
    
    return fixCount;
}

/**
 * Recursively fix all boolean strings in entire user data
 */
async function deepFixUserData(userId) {
    console.log('  Deep scanning user data...');
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
        return 0;
    }
    
    const userData = snapshot.val();
    const sanitizedData = sanitizeBooleans(userData);
    
    // Check if anything changed
    const originalJson = JSON.stringify(userData);
    const sanitizedJson = JSON.stringify(sanitizedData);
    
    if (originalJson !== sanitizedJson) {
        await set(userRef, sanitizedData);
        console.log('    ✓ Deep fix applied');
        return 1;
    } else {
        console.log('    ✓ No deep fixes needed');
        return 0;
    }
}

/**
 * Fix all data for a user
 */
async function fixUserData(userId, userEmail) {
    console.log(`\n📝 Processing: ${userEmail}`);
    console.log(`   User ID: ${userId}`);
    
    let totalFixed = 0;
    
    try {
        totalFixed += await fixUserNotifications(userId);
        totalFixed += await fixUserSettings(userId);
        totalFixed += await fixUserAgentCode(userId);
        totalFixed += await deepFixUserData(userId);
        
        if (totalFixed > 0) {
            console.log(`   ✓ Total fixes: ${totalFixed}`);
        } else {
            console.log('   ✓ All data OK');
        }
        
        return totalFixed;
    } catch (error) {
        console.error(`   ✗ Error: ${error.message}`);
        return 0;
    }
}

/**
 * Main function
 */
async function main() {
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║   Fix Firebase Boolean Values                         ║');
    console.log('║   Converts string booleans to actual booleans         ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    try {
        // Step 1: Authenticate
        const { email, password } = await promptCredentials();
        
        console.log('\n🔐 Authenticating...');
        await signInWithEmailAndPassword(auth, email, password);
        console.log('✓ Authenticated successfully\n');
        
        // Step 2: Get all users
        console.log('📊 Scanning database...');
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        
        if (!snapshot.exists()) {
            console.log('\n⚠️  No users found in database.');
            process.exit(0);
        }
        
        const users = snapshot.val();
        const userCount = Object.keys(users).length;
        console.log(`✓ Found ${userCount} user(s)\n`);
        
        console.log('─────────────────────────────────────────────────────');
        
        // Step 3: Fix each user's data
        let totalFixed = 0;
        let processedUsers = 0;
        
        for (const [userId, userData] of Object.entries(users)) {
            const userEmail = userData.email || userData.username || 'Unknown';
            totalFixed += await fixUserData(userId, userEmail);
            processedUsers++;
        }
        
        // Step 4: Fix public agent codes
        totalFixed += await fixPublicAgentCodes();
        
        // Summary
        console.log('\n─────────────────────────────────────────────────────');
        console.log('\n📊 Summary:');
        console.log(`   Users processed: ${processedUsers}`);
        console.log(`   Total fixes applied: ${totalFixed}`);
        
        if (totalFixed > 0) {
            console.log('\n✓ Database fixed successfully!');
            console.log('\n💡 Next steps:');
            console.log('   1. Restart your app');
            console.log('   2. The boolean error should be gone');
            console.log('   3. All data now uses proper boolean types\n');
        } else {
            console.log('\n✓ No fixes needed - all booleans are correct!\n');
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('\n✗ Script failed:', error.message);
        console.error('\nPossible issues:');
        console.error('  • Wrong email/password');
        console.error('  • No internet connection');
        console.error('  • Insufficient permissions');
        console.error('  • Firebase rules blocking access\n');
        process.exit(1);
    }
}

// Run the script
main().catch((error) => {
    console.error('\n✗ Unexpected error:', error);
    process.exit(1);
});
