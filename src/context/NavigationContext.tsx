import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

interface NavigationContextType {
    activeScreen: string;
    navigate: (screen: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useAppNavigation = (): NavigationContextType => {
    const context = useContext(NavigationContext);
    if (!context) {
        throw new Error('useAppNavigation must be used within a NavigationProvider');
    }
    return context;
};

interface NavigationProviderProps {
    children: ReactNode;
    initialScreen?: string;
    onScreenChange?: (screen: string) => void;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
    children,
    initialScreen = 'Dashboard',
    onScreenChange,
}) => {
    const [activeScreen, setActiveScreen] = useState(initialScreen);

    const navigate = useCallback((screen: string) => {
        setActiveScreen(screen);
        onScreenChange?.(screen);
    }, [onScreenChange]);

    const value = useMemo(() => ({ activeScreen, navigate }), [activeScreen, navigate]);

    return (
        <NavigationContext.Provider value={value}>
            {children}
        </NavigationContext.Provider>
    );
};

export default NavigationContext;
