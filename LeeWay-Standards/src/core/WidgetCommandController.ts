/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: UI.COMPONENT.WIDGET.CONTROLLER
TAG: UI.COMPONENT.WIDGET.AGENTLEE.COMMANDER

COLOR_ONION_HEX:
NEON=#FFD700
FLUO=#FFF176
PASTEL=#FFF9C4

ICON_ASCII:
family=lucide
glyph=radio-tower

5WH:
WHAT = Widget command controller enabling minimized popup to trigger Agent Lee background tasks
WHY = Allows user to request Agent Lee actions from floating widget even when main app is closed
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/WidgetCommandController.ts
WHEN = 2026
HOW = Static class listening to widget events and dispatching background tasks via BackgroundTaskManager

AGENTS:
ASSESS
ROUTER

LICENSE:
MIT
*/

import { BackgroundTaskManager } from './BackgroundTaskManager';
import { FirebaseService } from './FirebaseService';
import { eventBus } from './EventBus';

export interface WidgetCommand {
  id: string;
  type: 'request' | 'query' | 'action' | 'info';
  text: string;
  userId: string;
  priority?: 'low' | 'medium' | 'high';
  context?: Record<string, any>;
}

export class WidgetCommandController {
  private static instance: WidgetCommandController;
  private backgroundTaskManager: BackgroundTaskManager;
  private firebase: FirebaseService;

  private constructor() {
    this.backgroundTaskManager = BackgroundTaskManager.getInstance();
    this.firebase = FirebaseService.getInstance();
    this.setupEventListeners();
  }

  static getInstance(): WidgetCommandController {
    if (!WidgetCommandController.instance) {
      WidgetCommandController.instance = new WidgetCommandController();
    }
    return WidgetCommandController.instance;
  }

  private setupEventListeners(): void {
    // Listen for commands from the floating widget
    eventBus.on('widget:command', async (data: any) => {
      try {
        await this.processWidgetCommand(data);
      } catch (error) {
        console.error('[WidgetCommandController] Command processing failed:', error);
        eventBus.emit('widget:command-error', { 
          commandId: data?.id || 'unknown',
          error 
        });
      }
    });

    // Listen for message submissions from floating chat
    eventBus.on('widget:message', async (data: any) => {
      try {
        const { message, userId } = data;
        if (message && userId) {
          await this.handleWidgetMessage(userId, message);
        }
      } catch (error) {
        console.error('[WidgetCommandController] Message handling failed:', error);
      }
    });

    // Auto-start background manager when user signs in
    eventBus.on('firebase:signed-in', async (data: any) => {
      if (data.user) {
        console.log('[WidgetCommandController] User signed in, starting background tasks');
        await this.backgroundTaskManager.start(data.user.uid);
      }
    });
  }

  /**
   * Process a command from the widget
   */
  async processWidgetCommand(command: WidgetCommand): Promise<void> {
    const { id, type, text, userId, priority = 'medium', context } = command;

    console.log(`[WidgetCommandController] Processing ${type} command: ${text}`);

    try {
      // Queue as background task
      const taskId = await this.backgroundTaskManager.queueTask({
        userId,
        objective: text,
        priority,
        source: 'widget',
        metadata: {
          commandId: id,
          commandType: type,
          ...context,
        },
      });

      console.log(`[WidgetCommandController] Command queued as task: ${taskId}`);
      eventBus.emit('widget:command-queued', { commandId: id, taskId });

      // Log to memory
      await this.firebase.logMemoryEntry(userId, {
        agentId: 'WidgetController',
        agentName: 'Widget Controller',
        action: `${type.toUpperCase()} via Widget`,
        details: text,
        impact: type === 'action' ? 'high' : 'medium',
        metadata: { commandId: id, taskId, source: 'widget' },
      });
    } catch (error) {
      console.error('[WidgetCommandController] Failed to queue command:', error);
      eventBus.emit('widget:command-error', { commandId: id, error });
    }
  }

  /**
   * Handle a message from the floating chat widget
   */
  async handleWidgetMessage(userId: string, message: string): Promise<void> {
    if (!message || message.trim().length === 0) {
      return;
    }

    console.log('[WidgetCommandController] Handling widget message:', message);

    try {
      // Queue as a general conversation task
      const taskId = await this.backgroundTaskManager.queueTask({
        userId,
        objective: message,
        priority: 'medium',
        source: 'widget',
        metadata: {
          timestamp: new Date().toISOString(),
          from: 'FloatingChat',
        },
      });

      console.log('[WidgetCommandController] Message queued as task:', taskId);
      eventBus.emit('widget:message-queued', { taskId });
    } catch (error) {
      console.error('[WidgetCommandController] Failed to queue message:', error);
      eventBus.emit('widget:message-error', { error });
    }
  }

  /**
   * Send a direct command to Agent Lee (prioritized)
   */
  async sendDirectCommand(userId: string, objective: string): Promise<string> {
    return this.backgroundTaskManager.queueTask({
      userId,
      objective,
      priority: 'high',
      source: 'widget',
    });
  }

  /**
   * Query the status of the background task system
   */
  getSystemStatus(): {
    isRunning: boolean;
    queueSize: number;
    tasks: any[];
  } {
    return this.backgroundTaskManager.getStatus();
  }

  /**
   * Get a specific task status
   */
  getTaskStatus(taskId: string): any {
    return this.backgroundTaskManager.getTask(taskId);
  }
}

// Export singleton
export const widgetCommandController = WidgetCommandController.getInstance();

export default WidgetCommandController;
