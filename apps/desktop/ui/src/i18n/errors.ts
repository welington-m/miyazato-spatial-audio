import type { TranslationKey } from "./types";
const errorKeys: Record<string, TranslationKey> = {
  "Local storage unavailable": "errors.localStorage",
  "Invalid settings file; defaults loaded": "errors.invalidSettings",
  "Cannot save settings": "errors.saveSettings",
  "Settings write failed": "errors.writeSettings",
  "Settings replacement failed": "errors.replaceSettings",
  "Expected ten EQ bands": "errors.eqBands",
  "Invalid EQ filter type": "errors.filterType",
  "Invalid profile parameter range": "errors.profileRange",
  "Parameter queue full; retry the change": "errors.queueFull",
  "Unknown message type": "errors.unknownMessage",
  "Choose distinct source and output endpoints to prevent feedback":
    "errors.distinctEndpoints",
  "Prototype requires equal-rate, stereo, float32 source and output; resampling is not implemented":
    "errors.formatMismatch",
  "Audio event creation failed": "errors.eventCreation",
  "Audio event wait failed": "errors.eventWait",
  "Device disconnected": "errors.disconnected",
  "No output device found": "errors.noOutput",
  "Audio engine unavailable": "errors.unavailable",
  "Failed to load preset": "errors.preset",
};
export function errorKey(message: string): TranslationKey | undefined {
  return errorKeys[message];
}
