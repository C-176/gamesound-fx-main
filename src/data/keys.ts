/** Maps display key names to Windows virtual-key codes (decimal).
 *  Used by the shortcuts engine (main) and the picker prefix-key dropdowns (renderer). */
export const PREFIX_KEY_MAP: Record<string, number> = {
  '`': 41,     // UiohookKey.Backquote
  'Tab': 15,        // UiohookKey.Tab
  'CapsLock': 58,   // UiohookKey.CapsLock
  'Space': 57,      // UiohookKey.Space
  '\\': 43,    // UiohookKey.Backslash
  'Enter': 28,      // UiohookKey.Enter
};

export const PREFIX_KEYS: string[] = Object.keys(PREFIX_KEY_MAP);

/** Reverse lookup: VK code -> display name (populated at runtime). */
export const VK_TO_NAME: Record<number, string> = {};

/** Display key name -> Windows scan code (populated at runtime). */
export const KEY_NAME_TO_SCANCODE: Record<string, number> = {};