export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface PermissionState {
  RECORD_AUDIO: boolean;
  READ_CONTACTS: boolean;
  CALL_PHONE: boolean;
  POST_NOTIFICATIONS: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  relationship: string;
}

export interface InstalledApp {
  packageName: string;
  name: string;
  icon: string;
  category: string;
  color: string;
}

export interface ToolExecutionEvent {
  id: string;
  toolName: 'openApp' | 'searchAndCallContact' | 'sendWhatsAppMessage' | 'sendGmail';
  args: Record<string, any>;
  status: 'executing' | 'success' | 'permission_denied' | 'error';
  resultMessage?: string;
  timestamp: number;
}
