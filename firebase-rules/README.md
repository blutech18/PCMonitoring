# Firebase Security Rules

This directory contains the Firebase Realtime Database security rules for the PC Monitoring System.

## Files

- `database.rules.json` - The main security rules file for Firebase Realtime Database

## How to Deploy

### Option 1: Firebase Console (Recommended for first-time setup)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `pcmonitoring-2178d`
3. Navigate to **Realtime Database** → **Rules**
4. Copy the contents of `database.rules.json`
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Firebase CLI

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy rules only
firebase deploy --only database
```

## Rules Overview

### User Data Access

```
users/$userId
├── .read: Own data OR admin
├── .write: Own data only
└── role: Admin can change roles
```

**Key Rules:**
- Users can read/write their own data under `/users/{userId}/`
- Admins can read ALL user data (for system-wide views)
- Only admins can change user roles

### Data Validation

The rules include validation for:

| Field | Validation |
|-------|------------|
| `username` | String, 1-50 characters |
| `email` | Valid email format |
| `role` | Must be "admin" or "user" |
| `sessionTimeLimit` | Number, 30-480 |
| `alertThreshold` | Number, 0-100 |
| `autoLogoutEnabled` | Boolean |
| `agentCode.code` | String, exactly 8 characters |
| `computer.status` | "online", "offline", or "maintenance" |
| `notification.type` | "long_usage", "system_issue", "network_issue", or "general" |

### Protected Paths

| Path | Read Access | Write Access |
|------|-------------|--------------|
| `/users/{userId}` | Owner or Admin | Owner only |
| `/users/{userId}/role` | Owner or Admin | Admin only |
| `/agentCodes/{code}` | Any authenticated | Admin only |
| `/systemSettings` | Admin only | Admin only |
| `/auditLogs` | Admin only | None (system only) |

## Security Principles

### 1. Principle of Least Privilege
Users only have access to their own data. Admins have read access to all data but limited write access.

### 2. Role-Based Access Control
- **Admin**: Full read access, can modify roles
- **User**: Own data only

### 3. Data Validation
All data is validated before writing to prevent malformed data.

### 4. Authentication Required
All rules require `auth != null` - no anonymous access allowed.

## Testing Rules

### Using Firebase Emulator

```bash
# Start emulator
firebase emulators:start --only database

# Run tests
npm run test:rules
```

### Manual Testing

1. Login as a regular user
2. Try to access another user's data → Should fail
3. Login as admin
4. Try to access any user's data → Should succeed
5. Try to change a user's role → Should succeed

## Common Issues

### Issue: "Permission denied" error
**Cause**: User trying to access data they don't have permission for
**Solution**: Check if user is authenticated and has correct role

### Issue: "Validation failed" error
**Cause**: Data doesn't match validation rules
**Solution**: Check data format matches expected schema

### Issue: Admin can't change roles
**Cause**: Admin role not set correctly in database
**Solution**: Verify `/users/{adminId}/role` is set to "admin"

## Updating Rules

When updating rules:

1. Test changes in Firebase Emulator first
2. Review changes with team
3. Deploy to staging environment
4. Test thoroughly
5. Deploy to production

## Security Checklist

- [ ] All paths require authentication
- [ ] Users can only access their own data
- [ ] Admins have appropriate elevated access
- [ ] All data is validated before writing
- [ ] Sensitive operations (role changes) are admin-only
- [ ] No public read/write access
- [ ] Rules are tested with emulator

## Related Documentation

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/database/security)
- [RBAC Implementation](../docs/RBAC_IMPLEMENTATION.md)
