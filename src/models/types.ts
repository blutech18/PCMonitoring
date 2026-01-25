// Type definitions for the PC Monitoring application

// Authentication types
// User roles:
// - admin: Full system administrator with all permissions
// - user: Regular users who can monitor their chosen PCs via the mobile app
export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    username: string;
    role: UserRole;
    email?: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    loading: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

// Session types
export interface ActiveSession {
    id: string;
    computerId: string;
    computerName: string;
    userId: string;
    userName: string;
    startTime: string; // ISO date string
    currentActivity: string;
    status: 'active' | 'idle' | 'paused';
    pausedAt?: string; // ISO date string - when monitoring was paused
    /**
     * The Firebase UID of the user who owns/linked this PC agent.
     * Used to send commands to the correct user's agent.
     * This is different from userId which is the Windows username.
     */
    ownerUserId?: string;
}

export interface SessionHistory {
    id: string;
    computerId: string;
    computerName: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
    totalDuration: number; // in minutes
    date: string;
}

export interface SessionDetail {
    id: string;
    computerId: string;
    computerName: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    applicationsAccessed: ApplicationAccessed[];
    filesEdited: FileEdited[];
}

export interface ApplicationAccessed {
    name: string;
    duration: number; // in minutes
    startTime: string;
    endTime?: string;
}

export interface FileEdited {
    fileName: string;
    filePath: string;
    application: string;
    editTime: string;
}

// Dashboard types
export interface DashboardStats {
    activeComputers: number;
    loggedInUsers: number;
    todaySessions: number;
    totalAlerts: number;
}

// Notification types
export interface Notification {
    id: string;
    type: 'long_usage' | 'system_issue' | 'network_issue' | 'general' | 'computer_online' | 'monitoring_started';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    acknowledged: boolean;
    computerId?: string;
    computerName?: string;
}

// Report types
export interface ReportData {
    totalUsageTime: number; // in hours
    averageSessionDuration: number; // in minutes
    totalSessions: number;
    mostUsedComputers: ComputerUsage[];
    usageTrend: UsageTrendItem[];
}

export interface ComputerUsage {
    computerId: string;
    computerName: string;
    totalUsage: number; // in hours
    sessionCount: number;
}

export interface UsageTrendItem {
    date: string;
    usage: number; // in hours
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

// Settings types
export interface Settings {
    sessionTimeLimit: number; // in minutes
    alertThreshold: number; // in minutes
    autoLogoutEnabled: boolean;
}

export interface Computer {
    id: string;
    name: string;
    ipAddress: string;
    status: 'online' | 'offline' | 'maintenance';
    lastSeen: string;
}

// Navigation types
export type RootStackParamList = {
    Login: undefined;
    Main: undefined;
    SessionDetails: { sessionId: string };
};

export type MainTabParamList = {
    Dashboard: undefined;
    ActiveSessions: undefined;
    SessionHistory: undefined;
    Notifications: undefined;
    Reports: undefined;
    Settings: undefined;
};

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

// Database record types (raw Firebase data)
export interface ActiveSessionRecord {
    computerId: string;
    computerName: string;
    userId: string;
    userName: string;
    startTime: string;
    currentActivity: string;
    status?: 'active' | 'idle' | 'paused';
    pausedAt?: string;
}

export interface SessionHistoryRecord {
    computerId: string;
    computerName: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
    date: string;
}

export interface ComputerRecord {
    name: string;
    ipAddress: string;
    status: 'online' | 'offline' | 'maintenance';
    lastSeen: string;
}