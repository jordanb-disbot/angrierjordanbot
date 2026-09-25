export type StaffRole = 'member' | 'recliner' | 'chaise_lounge' | 'throne';
export type CommandType = 'slash' | 'legacy_text' | 'special_text' | 'context_message';
export type SettingType = 'boolean' | 'integer' | 'choice' | 'discord_channel' | 'discord_role' | 'json' | 'string';
export type Risk = 'normal' | 'high' | 'critical' | 'security' | 'financial' | 'locked';

export interface CommandOptionContract {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  choices?: string[];
  min?: number;
  max?: number;
}

export interface CommandContract {
  id: string;
  preferred: string;
  registered: string;
  type: CommandType;
  module: string;
  handler: string;
  featureFlag: string;
  permissions: string[];
  channels: string[];
  options: CommandOptionContract[];
  ephemeralDefault: boolean;
  helpId: string | null;
  tutorialId: string | null;
}
export interface SettingContract {
  key: string;
  section: string;
  type: SettingType;
  default: unknown;
  editable_by: StaffRole[];
  restart_required: boolean;
  description: string;
  risk: Risk;
  mutable: boolean;
  min?: number;
  max?: number;
  choices?: string[];
}

