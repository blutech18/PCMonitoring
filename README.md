# PC Monitoring System

A React Native mobile application for monitoring computer usage in an organizational environment. Built with Expo and Firebase.

## Features

- **Dashboard** - Real-time overview of active computers, logged-in users, and alerts
- **Active Sessions** - Monitor ongoing computer sessions with live elapsed time
- **Session History** - Review past sessions with filtering options and search
- **Session Details** - View detailed information including applications used and files edited
- **Notifications** - Receive alerts for long usage, system issues, and network problems
- **Reports** - Generate daily, weekly, and monthly usage reports with charts
- **Settings** - Configure session limits, manage computers, and user preferences
- **Search/Filter** - Search and filter functionality across all list screens
- **Export** - Export data to CSV/JSON format for external analysis
- **Offline Support** - Automatic data caching for offline access
- **Input Validation** - Comprehensive validation for all user inputs
- **Pagination** - Efficient pagination for large data sets
- **Performance Monitoring** - Built-in performance tracking and optimization

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **Firebase** (Authentication + Realtime Database)
- **React Navigation** for routing
- **React Native Chart Kit** for data visualization

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project (see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))

### PC Agent Setup

To monitor computers, you need to install the PC Agent on each Windows PC:

**Quick Start:**
1. Install Python 3.10+ from [python.org](https://www.python.org/downloads/)
2. Double-click `pc-agent/install-and-run.bat` (or see [PC_AGENT_SETUP.md](./PC_AGENT_SETUP.md) for detailed instructions)

**For detailed setup instructions, see:**
- [PC_AGENT_SETUP.md](./PC_AGENT_SETUP.md) - Complete setup guide
- [pc-agent/QUICK_START.md](./pc-agent/QUICK_START.md) - Quick reference

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd PCMonitoring
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Follow the instructions in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
   - Update `src/config/firebase.config.ts` with your Firebase credentials

4. Start the development server:
   ```bash
   npm start
   ```

5. Run on your device:
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Or press `a` for Android emulator, `i` for iOS simulator

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Generic components (Button, Input, Card, Modal)
│   ├── ChangePasswordModal.tsx
│   ├── ComputerModal.tsx
│   ├── NotificationItem.tsx
│   ├── NotificationPreferencesModal.tsx
│   ├── SessionCard.tsx
│   └── StatCard.tsx
├── config/              # Configuration files
│   └── firebase.config.ts
├── constants/           # App constants
│   ├── colors.ts
│   └── config.ts
├── context/             # React Context providers
│   └── AuthContext.tsx
├── models/              # TypeScript type definitions
│   └── types.ts
├── navigation/          # Navigation setup
│   └── AppNavigator.tsx
├── screens/             # Screen components
│   ├── ActiveSessionsScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── LoginScreen.tsx
│   ├── NotificationsScreen.tsx
│   ├── ReportsScreen.tsx
│   ├── SessionDetailsScreen.tsx
│   ├── SessionHistoryScreen.tsx
│   └── SettingsScreen.tsx
├── services/            # Business logic & API calls
│   ├── authService.ts
│   ├── firebase.ts
│   ├── notificationService.ts
│   ├── reportService.ts
│   ├── sessionService.ts
│   └── settingsService.ts
└── utils/               # Helper functions
    └── helpers.ts
```

## Authentication

Create your admin user in Firebase Console:
1. Go to **Authentication > Users**
2. Click **"Add user"**
3. Enter your email and password

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions.

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## Configuration

### Firebase Configuration

Update `src/config/firebase.config.ts` with your Firebase project credentials:

```typescript
export const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### App Configuration

Modify `src/constants/config.ts` to adjust:
- Refresh intervals
- Session time limits
- Other app-wide settings

## Features in Detail

### Authentication
- Email/password authentication via Firebase
- Secure token storage using Expo SecureStore
- Role-based access (admin/user)
- Password change functionality

### Session Monitoring
- Real-time tracking of active sessions
- Live elapsed time updates
- Activity status (active/idle)
- Detailed session history with filtering and search
- Pagination for large data sets

### Notifications
- Long usage alerts
- System issue notifications
- Network problem alerts
- Mark as read/acknowledge functionality
- Push notification support (planned)

### Reports
- Daily, weekly, monthly report periods
- Total usage time statistics
- Most used computers ranking
- Interactive charts (line and bar)
- Export to CSV/JSON

### Settings
- Session time limit configuration
- Auto-logout toggle
- Computer management (add/edit/remove)
- User account management
- Notification preferences

### Search/Filter
- Real-time search across sessions and notifications
- Date-based filtering (All, Today, This Week)
- Case-insensitive search
- Search by computer name, user name, etc.

### Export Functionality
- Export sessions to CSV/JSON
- Export notifications to CSV/JSON
- Export reports to CSV/JSON
- Customizable export formats

### Offline Support
- Automatic data caching
- Offline data access
- Cache expiration management
- Graceful fallback on network errors

### Performance
- Performance monitoring utilities
- Automatic slow operation detection
- Performance metrics tracking
- Optimized data loading

For detailed feature documentation, see [docs/FEATURES.md](./docs/FEATURES.md)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For support, please contact the development team.
