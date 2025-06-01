// VNC Key Codes (X11 keysyms)
export const VNC_KEYS = {
  // Modifier Keys
  MODIFIERS: {
    LEFT_SHIFT: 0xFFE1,
    RIGHT_SHIFT: 0xFFE2,
    LEFT_CTRL: 0xFFE3,
    RIGHT_CTRL: 0xFFE4,
    LEFT_ALT: 0xFFE9,
    RIGHT_ALT: 0xFFEA,
    LEFT_SUPER: 0xFFEB,  // Left Windows key
    RIGHT_SUPER: 0xFFEC, // Right Windows key
    CAPS_LOCK: 0xFFE5,
    NUM_LOCK: 0xFFE8
  },
  // Function Keys
  FUNCTION: {
    F1: 0xFFBE,
    F2: 0xFFBF,
    F3: 0xFFC0,
    F4: 0xFFC1,
    F5: 0xFFC2,
    F6: 0xFFC3,
    F7: 0xFFC4,
    F8: 0xFFC5,
    F9: 0xFFC6,
    F10: 0xFFC7,
    F11: 0xFFC8,
    F12: 0xFFC9
  },
  // Navigation Keys
  NAVIGATION: {
    UP: 0xFF52,
    DOWN: 0xFF54,
    LEFT: 0xFF51,
    RIGHT: 0xFF53,
    PAGE_UP: 0xFF55,
    PAGE_DOWN: 0xFF56,
    HOME: 0xFF50,
    END: 0xFF57,
    INSERT: 0xFF63,
    DELETE: 0xFFFF
  },
  // System Keys
  SYSTEM: {
    ESC: 0xFF1B,
    PRINT_SCREEN: 0xFF61,
    SCROLL_LOCK: 0xFF14,
    PAUSE: 0xFF13,
    TAB: 0xFF09,
    BACKSPACE: 0xFF08,
    RETURN: 0xFF0D,
    SPACE: 0x0020,
    MENU: 0xFF67
  },
  // Common Symbols
  SYMBOLS: {
    GRAVE: 0x0060,        // `
    MINUS: 0x002D,        // -
    EQUAL: 0x003D,        // =
    BRACKET_LEFT: 0x005B,  // [
    BRACKET_RIGHT: 0x005D, // ]
    SEMICOLON: 0x003B,    // ;
    QUOTE: 0x0027,        // '
    BACKSLASH: 0x005C,    // \
    COMMA: 0x002C,        // ,
    PERIOD: 0x002E,       // .
    SLASH: 0x002F,        // /
    EXCLAIM: 0x0021,      // !
    AT: 0x0040,           // @
    HASH: 0x0023,         // #
    DOLLAR: 0x0024,       // $
    PERCENT: 0x0025,      // %
    CARET: 0x005E,        // ^
    AMPERSAND: 0x0026,    // &
    ASTERISK: 0x002A,     // *
    PAREN_LEFT: 0x0028,   // (
    PAREN_RIGHT: 0x0029,  // )
    PLUS: 0x002B,         // +
    COLON: 0x003A,        // :
    LESS: 0x003C,         // <
    GREATER: 0x003E,      // >
    QUESTION: 0x003F,     // ?
    UNDERSCORE: 0x005F,   // _
    BRACE_LEFT: 0x007B,   // {
    BRACE_RIGHT: 0x007D,  // }
    BAR: 0x007C,          // |
    TILDE: 0x007E         // ~
  }
};
