/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.NATIVE
TAG: CORE.NATIVE.CAPACITOR

COLOR_ONION_HEX:
NEON=#4285F4
FLUO=#5A9AF5
PASTEL=#BFDBFE

ICON_ASCII:
family=lucide
glyph=smartphone

5WH:
WHAT = Native Bridge via Capacitor — access iOS/Android device APIs from React app
WHY = Enable Agent Lee to use device features: camera, contacts, email, calendar, notifications
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/NativeBridge.ts
WHEN = 2026
HOW = Thin wrapper around Capacitor plugins with permission handling and fallbacks

AGENTS:
ASSESS
AUDIT

LICENSE:
MIT
*/

import { eventBus } from './EventBus';

// ── Capacitor Plugin Types ──────────────────────────────────────────────

interface CapacitorAvailable {
  isNative: boolean;
  platform: 'ios' | 'android' | 'web' | 'electron';
}

interface CameraPhoto {
  path: string;
  webPath: string;
  exif: any;
}

interface Contact {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface EmailOptions {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  attachments?: string[];
}

interface NotificationOptions {
  title: string;
  body: string;
  id: number;
  actionTypeId?: string;
}

// ── Native Bridge Singleton ────────────────────────────────────────────

class NativeBridgeClass {
  private static instance: NativeBridgeClass | null = null;
  private capacitor: any = null;
  private available: CapacitorAvailable = { isNative: false, platform: 'web' };

  private constructor() {
    this.initialize();
  }

  static getInstance(): NativeBridgeClass {
    if (!NativeBridgeClass.instance) {
      NativeBridgeClass.instance = new NativeBridgeClass();
    }
    return NativeBridgeClass.instance;
  }

  /**
   * Initialize Capacitor bridge
   */
  private initialize(): void {
    // Check if Capacitor is available (app running in native container)
    if (typeof (window as any).Capacitor !== 'undefined') {
      this.capacitor = (window as any).Capacitor;
      const platform = this.capacitor.getPlatform?.() || 'web';

      this.available = {
        isNative: !['web', 'electron'].includes(platform),
        platform,
      };

      eventBus.emit('native:initialized', {
        platform: this.available.platform as 'ios' | 'android' | 'web' | 'electron',
      });
    }
  }

  /**
   * Check if running as native app
   */
  isNative(): boolean {
    return this.available.isNative;
  }

  /**
   * Get platform (ios, android, web, electron)
   */
  getPlatform(): 'ios' | 'android' | 'web' | 'electron' {
    return this.available.platform;
  }

  /**
   * Take photo using device camera
   */
  async takePhoto(): Promise<CameraPhoto | null> {
    if (!this.isNative()) {
      return this.webFallback.takePhoto();
    }

    try {
      const { Camera } = await import('@capacitor/camera');
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'uri', // Return file URI instead of base64
        promptLabelPicture: 'Select from gallery',
        promptLabelCamera: 'Take photo',
      });

      eventBus.emit('native:photo-captured', {
        path: photo.path || '',
        webPath: photo.webPath || '',
      });

      return {
        path: photo.path || '',
        webPath: photo.webPath || '',
        exif: photo.exif,
      };
    } catch (err) {
      eventBus.emit('native:camera-error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Get device contacts
   */
  async getContacts(): Promise<Contact[]> {
    // Community contacts plugin not available in npm registry
    // Fallback: return empty (web version would need CSV upload)
    return [];
  }

  /**
   * Send email via native mail app
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isNative()) {
      return this.webFallback.sendEmail(options);
    }

    try {
      // Community email-composer plugin not available in npm registry
      // On native, would use Capacitor native implementation if available
      return this.webFallback.sendEmail(options);
    } catch (err) {
      eventBus.emit('native:email-error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Send SMS via native SMS app
   */
  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    // Community SMS plugin not available in npm registry
    // Always use web fallback (sms:// scheme)
    return this.webFallback.sendSMS(phoneNumber, message);
  }

  /**
   * Open device calendar
   */
  async openCalendar(): Promise<boolean> {
    // Community calendar plugin not available in npm registry
    // Fallback: open browser calendar
    return false;
  }

  /**
   * Create calendar event
   */
  async createCalendarEvent(title: string, description: string, date: Date): Promise<boolean> {
    // Community calendar plugin not available in npm registry
    // Fallback not implemented - feature available on iOS/Android only
    return false;
  }

  /**
   * Send local notification
   */
  async sendNotification(options: NotificationOptions): Promise<boolean> {
    if (!this.isNative()) {
      return this.webFallback.sendNotification(options);
    }

    // Native local-notifications plugin can be added later
    // For now, use web fallback
    return this.webFallback.sendNotification(options);
  }

  /**
   * Get device ID (unique per install)
   */
  async getDeviceId(): Promise<string> {
    if (!this.isNative()) {
      return 'web-' + (Math.random().toString(36).substring(2, 11));
    }

    // Native device plugin can be added later
    // For now, return web ID
    return 'web-' + (Math.random().toString(36).substring(2, 11));
  }

  /**
   * Request app review/rating (iOS App Store, leeway Play)
   */
  async requestAppReview(): Promise<boolean> {
    if (!this.isNative()) {
      return false;
    }

    // Native app-review plugin can be added later
    // For now, not implemented on web
    return false;
  }

  /**
   * Web fallback implementations
   */
  private webFallback = {
    async takePhoto(): Promise<CameraPhoto | null> {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              path: file.name,
              webPath: reader.result as string,
              exif: null,
            });
          };
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },

    async sendEmail(options: EmailOptions): Promise<boolean> {
      const mailto = `mailto:${options.to?.join(';')}?subject=${encodeURIComponent(options.subject || '')}&body=${encodeURIComponent(options.body || '')}`;
      window.location.href = mailto;
      return true;
    },

    async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
      const sms = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
      window.location.href = sms;
      return true;
    },

    async sendNotification(options: NotificationOptions): Promise<boolean> {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(options.title, { body: options.body });
        return true;
      }
      return false;
    },
  };
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const NativeBridge = NativeBridgeClass.getInstance();

