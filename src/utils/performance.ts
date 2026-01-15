// Performance monitoring utilities

interface PerformanceMetric {
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
}

class PerformanceMonitor {
    private metrics: Map<string, PerformanceMetric> = new Map();
    private enabled: boolean = __DEV__;

    /**
     * Start tracking a performance metric
     */
    start(name: string): void {
        if (!this.enabled) return;

        this.metrics.set(name, {
            name,
            startTime: performance.now(),
        });
    }

    /**
     * End tracking a performance metric
     */
    end(name: string): number | null {
        if (!this.enabled) return null;

        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Performance metric "${name}" not found`);
            return null;
        }

        const endTime = performance.now();
        const duration = endTime - metric.startTime;

        metric.endTime = endTime;
        metric.duration = duration;

        if (duration > 1000) {
            console.warn(`Slow operation: ${name} took ${duration.toFixed(2)}ms`);
        }

        return duration;
    }

    /**
     * Get metric duration
     */
    getDuration(name: string): number | null {
        const metric = this.metrics.get(name);
        return metric?.duration ?? null;
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics.clear();
    }

    /**
     * Get all metrics
     */
    getAllMetrics(): PerformanceMetric[] {
        return Array.from(this.metrics.values());
    }

    /**
     * Enable/disable performance monitoring
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure function execution time
 */
export const measure = async <T,>(
    name: string,
    fn: () => T | Promise<T>
): Promise<T> => {
    performanceMonitor.start(name);
    try {
        const result = await fn();
        performanceMonitor.end(name);
        return result;
    } catch (error) {
        performanceMonitor.end(name);
        throw error;
    }
};
