# Role-Based Access Control (RBAC) Implementation

## Overview

The PC Monitoring System now implements comprehensive role-based access control (RBAC) to differentiate between **Admin** and **User** roles, providing appropriate UI, data access, and features for each role.

## User Roles

### Admin Role
- **Purpose**: Full system administrator with all permissions
- **Access**: System-wide data across all users
- **Features**: 
  - View all active sessions from all users
  - Access complete session history across the system
  - System-wide dashboard statistics
  - Full reports and analytics
  - User management capabilities (via adminService)

### User Role
- **Purpose**: Regular users who monitor their chosen PCs via the mobile app
- **Access**: Only their own data
- **Features**:
  - View only their own active sessions
  - Access only their own session history
  - Personal dashboard showing their computers
  - Agent linking code management
  - Personal settings and notifications

## Implementation Details

### 1. Services Layer

#### AdminService (`src/services/adminService.ts`)
New service created for admin-specific operations:
- `getAllUsers()` - Get all users in the system
- `getSystemDashboardStats()` - System-wide statistics
- `getAllActiveSessions()` - All active sessions across all users
- `getAllSessionHistory()` - Complete session history
- `getUserCountByRole()` - Count users by role

#### SessionService (`src/services/sessionService.ts`)
Existing service - provides user-specific data:
- `getDashboardStats()` - User's own statistics
- `getActiveSessions()` - User's own active sessions
- `getSessionHistory()` - User's own session history
- All data filtered by current user ID

### 2. UI Components

#### Dashboard (`src/screens/DashboardScreen.tsx`)
**Admin View:**
- Header shows "System Administrator" badge
- Section title: "System Overview"
- Stats show: "Active Computers", "Active Users"
- Data aggregated from all users

**User View:**
- No role badge
- Section title: "My Computers"
- Stats show: "My Active PCs", "Active Sessions"
- Data filtered to user's own computers

#### Active Sessions (`src/screens/ActiveSessionsScreen.tsx`)
**Admin View:**
- Shows all active sessions from all users
- Can see which user owns each session

**User View:**
- Shows only their own active sessions
- Only sees their own computers

#### Session History (`src/screens/SessionHistoryScreen.tsx`)
**Admin View:**
- Complete session history across all users
- Can filter and search all sessions

**User View:**
- Only their own session history
- Filtered by date ranges

### 3. Navigation

#### Admin Navigation (`src/navigation/AppNavigator.tsx`)
6 tabs available:
1. Dashboard
2. Active Sessions
3. History
4. Alerts
5. **Reports** (admin only)
6. Settings

#### User Navigation
5 tabs available:
1. Dashboard
2. Active Sessions
3. History
4. Alerts
5. Settings

**Note**: Reports tab is currently admin-only. Users don't have access to system-wide reports.

## Data Flow

### Admin Data Flow
```
Admin User → adminService → Firebase (all users data) → System-wide view
```

### User Data Flow
```
User → sessionService → Firebase (users/{userId}/...) → User-specific view
```

## Database Structure

### User-Specific Data
```
users/
  {userId}/
    username: string
    email: string
    role: "admin" | "user"
    sessions/
      active/
        {sessionId}/...
      history/
        {sessionId}/...
    computers/
      {computerId}/...
    notifications/
      {notificationId}/...
    settings/...
    agentCode/...
```

### Admin Access
- Admins can read from all `/users/{userId}/` paths
- Users can only read from `/users/{currentUserId}/` paths

## Security Considerations

### Current Implementation
- ✅ UI-level role checking implemented
- ✅ Service-level data filtering by user ID
- ✅ Role-based navigation

### Recommended Enhancements
- ⚠️ Add Firebase Security Rules to enforce role-based access at database level
- ⚠️ Implement server-side role verification
- ⚠️ Add audit logging for admin actions

### Firebase Security Rules Example
```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": "auth.uid === $userId || root.child('users').child(auth.uid).child('role').val() === 'admin'",
        ".write": "auth.uid === $userId || root.child('users').child(auth.uid).child('role').val() === 'admin'"
      }
    }
  }
}
```

## Testing

### Test Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| admin@example.com | (your admin password) | admin | System administrator testing |
| lebron23@gmail.com | user123 | user | Regular user testing |
| curry30@gmail.com | user123 | user | Regular user testing |

### Test Scenarios

#### Admin Testing
1. Login as admin
2. Verify "System Administrator" badge appears on dashboard
3. Check that all 6 navigation tabs are visible
4. Verify dashboard shows system-wide statistics
5. Check active sessions shows data from all users
6. Verify session history includes all users' sessions

#### User Testing
1. Login as user (lebron23@gmail.com or curry30@gmail.com)
2. Verify no admin badge appears
3. Check that only 5 navigation tabs are visible (no Reports)
4. Verify dashboard shows "My Computers" section
5. Check active sessions shows only their own sessions
6. Verify session history is filtered to their data only

## Future Enhancements

### Planned Features
1. **User Management Screen** (Admin only)
   - View all users
   - Edit user roles
   - Deactivate/activate users
   - Reset passwords

2. **Advanced Permissions**
   - Read-only admin role
   - Department-level access
   - Computer group permissions

3. **Audit Logging**
   - Track admin actions
   - Log data access
   - Export audit reports

4. **Role-Based Reports**
   - System-wide reports for admins
   - Personal usage reports for users
   - Comparative analytics

## Code Examples

### Checking User Role
```typescript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Conditional rendering
  return (
    <>
      {isAdmin && <AdminOnlyFeature />}
      <SharedFeature />
    </>
  );
};
```

### Fetching Role-Based Data
```typescript
const fetchData = async () => {
  const isAdmin = user?.role === 'admin';
  
  const data = isAdmin
    ? await adminService.getAllActiveSessions()
    : await sessionService.getActiveSessions();
    
  setData(data);
};
```

## Troubleshooting

### Issue: User sees admin features
**Solution**: Check that user role is correctly set in Firebase database under `/users/{userId}/role`

### Issue: Admin can't see all data
**Solution**: Verify adminService is being called instead of sessionService

### Issue: Navigation shows wrong tabs
**Solution**: Check that `user?.role` is properly passed to navigation component

## Migration Notes

If you have existing users in the system:
1. Run the seed script to ensure all users have roles: `npm run seed`
2. Manually set admin role in Firebase for admin users
3. Default role for new signups is 'user'
4. Existing users without role will default to 'user'

## Summary

The RBAC implementation provides:
- ✅ Clear separation between admin and user experiences
- ✅ Data isolation for user accounts
- ✅ System-wide visibility for administrators
- ✅ Role-appropriate navigation and features
- ✅ Scalable architecture for future enhancements
