# Seed Data Script

This directory contains scripts for seeding test data into the PC Monitoring System.

## seedData.js

Creates test user accounts and ensures existing admin accounts are properly synced to the Firebase Realtime Database.

### Test Accounts Created

| Email | Password | Role | Username |
|-------|----------|------|----------|
| lebron23@gmail.com | user123 | user | LeBron James |
| curry30@gmail.com | user123 | user | Stephen Curry |

### Features

- Creates test user accounts with proper database structure
- Generates unique agent linking codes for user accounts
- Syncs existing Firebase Auth accounts to the users table
- Handles duplicate accounts gracefully
- Creates default settings for each user

### Usage

#### Option 1: Using npm script (Recommended)
```bash
npm run seed
```

#### Option 2: Direct execution
```bash
node scripts/seedData.js
```

### What the Script Does

1. **Creates Test Accounts**: Attempts to create the two test accounts listed above
2. **Syncs Existing Accounts**: Checks for any existing admin accounts and syncs them to the database
3. **Generates Agent Codes**: For user role accounts, generates unique 8-character agent linking codes
4. **Creates Default Settings**: Sets up default session settings for each user

### Database Structure

Each user account creates the following structure in Firebase Realtime Database:

```
users/
  {userId}/
    username: "User Name"
    email: "user@example.com"
    role: "user" or "admin"
    createdAt: "ISO timestamp"
    settings/
      sessionTimeLimit: 480
      alertThreshold: 80
      autoLogoutEnabled: false
    agentCode/          (only for user role)
      code: "ABC12345"
      createdAt: "ISO timestamp"
      active: true
```

### Syncing Existing Admin Accounts

If you have existing admin accounts in Firebase Authentication that are not in the users table:

1. Sign in to your admin account in the mobile app
2. Run the seed script: `npm run seed`
3. The script will detect the signed-in user and sync it to the database

Alternatively, you can manually add admin accounts by modifying the `testAccounts` array in the script.

### Troubleshooting

**Error: "auth/email-already-in-use"**
- The script handles this automatically and will attempt to sync the existing account

**Error: "auth/weak-password"**
- Password must be at least 6 characters

**No admin accounts synced**
- Sign in to the app first, then run the script again
- Or manually add admin account details to the script

### Security Note

⚠️ **Important**: This script contains Firebase configuration and should only be used in development environments. Never commit real production credentials to version control.

For production:
1. Use environment variables for Firebase config
2. Use Firebase Admin SDK for user management
3. Implement proper access controls
