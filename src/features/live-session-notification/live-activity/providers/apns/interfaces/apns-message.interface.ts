export interface APNSMessage {
  deviceToken: string;
  alert?: {
    title?: string;
    body?: string;
  };
  sound?: string;
  badge?: number;
  data?: Record<string, any>;
  priority?: number;
  topic: string;
}

export interface APNSLiveActivityMessage {
  deviceToken: string;
  topic: string;
  event: 'update' | 'end';
  contentState: Record<string, unknown>;
  timestamp?: number;
  priority?: number;
}
