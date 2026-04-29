/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.DEVICE
TAG: CORE.DEVICE.TELEMETRY

COLOR_ONION_HEX:
NEON=#FF6F00
FLUO=#FF8F00
PASTEL=#FFE0B2

ICON_ASCII:
family=lucide
glyph=smartphone

5WH:
WHAT = Device Telemetry Module — monitor battery, network, storage, permissions
WHY = Enable Agent Lee to make decisions based on device capabilities and resources
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/DeviceTelemetry.ts
WHEN = 2026
HOW = Native API bridges for battery, network, storage status + Capacitor integration for iOS/Android

AGENTS:
ASSESS
AUDIT

LICENSE:
MIT
*/

import { eventBus } from './EventBus';

// ── Types ───────────────────────────────────────────────────────────────

export interface DeviceStatus {
  battery: {
    level: number; // 0-100
    charging: boolean;
    chargingTime: number; // minutes, -1 if not charging
    dischargingTime: number; // minutes, -1 if charging
  };
  network: {
    connected: boolean;
    type: 'wifi' | '4g' | '5g' | 'ethernet' | 'none' | 'unknown';
    effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
    saveData: boolean;
    downlink: number; // Mbps estimate
    rtt: number; // ms
  };
  storage: {
    available: number; // bytes
    quota: number; // bytes
    usage: number; // bytes
    percentUsed: number; // 0-100
  };
  screen: {
    width: number;
    height: number;
    pixelRatio: number;
    orientation: 'portrait' | 'landscape' | 'unknown';
  };
  permissions: {
    microphone: 'granted' | 'denied' | 'prompt';
    camera: 'granted' | 'denied' | 'prompt';
    location: 'granted' | 'denied' | 'prompt';
    calendar: 'granted' | 'denied' | 'prompt';
    contacts: 'granted' | 'denied' | 'prompt';
    photos: 'granted' | 'denied' | 'prompt';
  };
  memory: {
    totalJSHeapSize: number; // bytes
    usedJSHeapSize: number; // bytes
    jsHeapSizeLimit: number; // bytes
    percentUsed: number; // 0-100
  };
  platform: {
    userAgent: string;
    platform: string;
    language: string;
    onLine: boolean;
    hardwareConcurrency: number;
    deviceMemory: number; // GB
    maxTouchPoints: number;
    vendor: 'Apple' | 'leeway' | 'Microsoft' | 'Unknown';
  };
}

// ── Device Telemetry Singleton ──────────────────────────────────────────

class DeviceTelemetryClass {
  private static instance: DeviceTelemetryClass | null = null;
  private status: Partial<DeviceStatus> = {};
  private listeners: Map<string, (status: DeviceStatus) => void> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timer> = new Map();
  private lastEmittedHash: Map<string, string> = new Map();

  private constructor() {
    this.initialize();
  }

  static getInstance(): DeviceTelemetryClass {
    if (!DeviceTelemetryClass.instance) {
      DeviceTelemetryClass.instance = new DeviceTelemetryClass();
    }
    return DeviceTelemetryClass.instance;
  }

  /**
   * Initialize device monitoring
   */
  private initialize(): void {
    this.monitorBattery();
    this.monitorNetwork();
    this.monitorStorage();
    this.monitorScreen();
    this.monitorMemory();
    this.monitorPlatform();
    this.checkPermissions();

    // Re-check permissions periodically (every 5 minutes — not critical path)
    setInterval(() => this.checkPermissions(), 300000);

    eventBus.emit('device:initialized', {
      timestamp: Date.now(),
      platform: this.status.platform?.platform || 'unknown',
    });
  }

  /**
   * Monitor battery status
   */
  private monitorBattery(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          this.status.battery = {
            level: battery.level,
            charging: battery.charging,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime,
          };
          this.emit('battery-changed');
        };

        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        battery.addEventListener('chargingtimechange', updateBattery);
        battery.addEventListener('dischargingtimechange', updateBattery);
      });
    } else {
      // Fallback: estimate from power savings mode
      this.status.battery = {
        level: 50,
        charging: navigator.onLine,
        chargingTime: -1,
        dischargingTime: -1,
      };
    }
  }

  /**
   * Monitor network status
   */
  private monitorNetwork(): void {
    const handleNetworkChange = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

      if (connection) {
        this.status.network = {
          connected: navigator.onLine,
          type: this.mapNetworkType(connection.type),
          effectiveType: connection.effectiveType || 'unknown',
          saveData: connection.saveData || false,
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
        };
      } else {
        this.status.network = {
          connected: navigator.onLine,
          type: 'unknown',
          effectiveType: 'unknown',
          saveData: false,
          downlink: 0,
          rtt: 0,
        };
      }

      this.emit('network-changed');
    };

    handleNetworkChange();
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', handleNetworkChange);
    }
  }

  /**
   * Monitor storage quota
   */
  private monitorStorage(): void {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then((estimate) => {
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        this.status.storage = {
          available: quota - usage,
          quota: quota,
          usage: usage,
          percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
        };
        this.emit('storage-changed');
      });
    }
  }

  /**
   * Monitor screen orientation and size
   */
  private monitorScreen(): void {
    const updateScreen = () => {
      this.status.screen = {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      };
      this.emit('screen-changed');
    };

    updateScreen();
    window.addEventListener('resize', updateScreen);
    window.addEventListener('orientationchange', updateScreen);
  }

  /**
   * Monitor memory usage
   */
  private monitorMemory(): void {
    const monitor = () => {
      if ((performance as any).memory) {
        const mem = (performance as any).memory;
        this.status.memory = {
          totalJSHeapSize: mem.totalJSHeapSize,
          usedJSHeapSize: mem.usedJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
          percentUsed: (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100,
        };
        this.emit('memory-changed');
      }
    };

    monitor();
    this.monitoringIntervals.set('memory', setInterval(monitor, 30000));
  }

  /**
   * Get platform information
   */
  private monitorPlatform(): void {
    const ua = navigator.userAgent;
    let vendor: 'Apple' | 'leeway' | 'Microsoft' | 'Unknown' = 'Unknown';

    if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('MacOS')) {
      vendor = 'Apple';
    } else if (ua.includes('Android')) {
      vendor = 'leeway';
    } else if (ua.includes('Windows') || ua.includes('MSIE') || ua.includes('Trident')) {
      vendor = 'Microsoft';
    }

    this.status.platform = {
      userAgent: ua,
      platform: navigator.platform || 'unknown',
      language: navigator.language || 'unknown',
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: (navigator as any).deviceMemory || 4,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      vendor,
    };
  }

  /**
   * Check and request permissions
   */
  private async checkPermissions(): Promise<void> {
    const permissions: any = {};

    // Microphone
    try {
      const result = await (navigator as any).permissions.query({ name: 'microphone' });
      permissions.microphone = result.state;
    } catch {
      permissions.microphone = 'prompt';
    }

    // Camera
    try {
      const result = await (navigator as any).permissions.query({ name: 'camera' });
      permissions.camera = result.state;
    } catch {
      permissions.camera = 'prompt';
    }

    // Location
    try {
      const result = await (navigator as any).permissions.query({ name: 'geolocation' });
      permissions.location = result.state;
    } catch {
      permissions.location = 'prompt';
    }

    this.status.permissions = {
      ...permissions,
      calendar: 'prompt', // Requires Capacitor
      contacts: 'prompt', // Requires Capacitor
      photos: 'prompt', // Requires Capacitor
    };

    this.emit('permissions-checked');
  }

  /**
   * Request specific permission with proper UI
   */
  async requestPermission(permission: keyof DeviceStatus['permissions']): Promise<boolean> {
    try {
      switch (permission) {
        case 'microphone':
          await navigator.mediaDevices.getUserMedia({ audio: true });
          this.status.permissions!.microphone = 'granted';
          return true;

        case 'camera':
          await navigator.mediaDevices.getUserMedia({ video: true });
          this.status.permissions!.camera = 'granted';
          return true;

        case 'location':
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => {
                this.status.permissions!.location = 'granted';
                resolve(true);
              },
              () => {
                this.status.permissions!.location = 'denied';
                resolve(false);
              }
            );
          });

        default:
          return false;
      }
    } catch (err) {
      eventBus.emit('device:permission-error', {
        permission,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Get current device status
   */
  getStatus(): DeviceStatus {
    return this.status as DeviceStatus;
  }

  /**
   * Get specific metric
   */
  getMetric(metric: keyof DeviceStatus): any {
    return this.status[metric];
  }

  /**
   * Check if device is resource-constrained
   */
  isLowEndDevice(): boolean {
    const platform = this.status.platform;
    const memory = this.status.memory;

    return (
      (!platform || platform.deviceMemory < 4) &&
      (!memory || memory.percentUsed > 80)
    );
  }

  /**
   * Check if device is on expensive connection (mobile data)
   */
  isExpensiveConnection(): boolean {
    const network = this.status.network;
    if (!network) return false;

    return (
      network.type !== 'wifi' &&
      network.type !== 'ethernet' &&
      network.connected
    );
  }

  /**
   * Subscribe to changes
   */
  subscribe(metric: string, callback: (status: DeviceStatus) => void): () => void {
    const key = `${metric}-${Date.now()}-${Math.random()}`;
    this.listeners.set(key, callback);

    // Return unsubscribe function
    return () => this.listeners.delete(key);
  }

  /**
   * Emit changes to all listeners
   */
  private emit(metric: string): void {
    // Change-gate: only emit if the metric actually changed
    const current = JSON.stringify(this.status[metric as keyof DeviceStatus] ?? null);
    const previous = this.lastEmittedHash.get(metric);
    if (current === previous) return; // nothing changed
    this.lastEmittedHash.set(metric, current);

    const status = this.status as DeviceStatus;
    this.listeners.forEach((callback) => {
      try {
        callback(status);
      } catch (err) {
        console.error(`Device telemetry listener error: ${err}`);
      }
    });

    eventBus.emit('device:telemetry-changed', {
      metric,
      status,
    });
  }

  /**
   * Map network type to human-readable format
   */
  private mapNetworkType(type: string): 'wifi' | '4g' | '5g' | 'ethernet' | 'none' | 'unknown' {
    switch (type) {
      case 'wifi':
        return 'wifi';
      case '4g':
        return '4g';
      case '5g':
        return '5g';
      case 'ethernet':
        return 'ethernet';
      case 'none':
        return 'none';
      default:
        return 'unknown';
    }
  }

  /**
   * Cleanup on app shutdown
   */
  destroy(): void {
    this.monitoringIntervals.forEach((interval) => {
      if (typeof interval === 'number') {
        clearInterval(interval);
      }
    });
    this.monitoringIntervals.clear();
    this.listeners.clear();
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const DeviceTelemetry = DeviceTelemetryClass.getInstance();

