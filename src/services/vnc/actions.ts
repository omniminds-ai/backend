import { VNC_KEYS } from './keys.ts';
// @ts-ignore
import VncClient from 'vnc-rfb-client';

// Helper function to get VNC keycode for a character
export function getVNCKeycode(char: string) {
  // Handle special characters that require shift
  const shiftSymbols: { [key: string]: number } = {
    '!': VNC_KEYS.SYMBOLS.EXCLAIM,
    '@': VNC_KEYS.SYMBOLS.AT,
    '#': VNC_KEYS.SYMBOLS.HASH,
    $: VNC_KEYS.SYMBOLS.DOLLAR,
    '%': VNC_KEYS.SYMBOLS.PERCENT,
    '^': VNC_KEYS.SYMBOLS.CARET,
    '&': VNC_KEYS.SYMBOLS.AMPERSAND,
    '*': VNC_KEYS.SYMBOLS.ASTERISK,
    '(': VNC_KEYS.SYMBOLS.PAREN_LEFT,
    ')': VNC_KEYS.SYMBOLS.PAREN_RIGHT,
    _: VNC_KEYS.SYMBOLS.UNDERSCORE,
    '+': VNC_KEYS.SYMBOLS.PLUS,
    '{': VNC_KEYS.SYMBOLS.BRACE_LEFT,
    '}': VNC_KEYS.SYMBOLS.BRACE_RIGHT,
    '|': VNC_KEYS.SYMBOLS.BAR,
    ':': VNC_KEYS.SYMBOLS.COLON,
    '"': VNC_KEYS.SYMBOLS.QUOTE,
    '<': VNC_KEYS.SYMBOLS.LESS,
    '>': VNC_KEYS.SYMBOLS.GREATER,
    '?': VNC_KEYS.SYMBOLS.QUESTION,
    '~': VNC_KEYS.SYMBOLS.TILDE
  };

  // Check if it's a special character requiring shift
  if (shiftSymbols[char]) {
    return {
      keycode: shiftSymbols[char],
      shift: true
    };
  }

  // Handle uppercase letters
  if (char.match(/[A-Z]/)) {
    return {
      keycode: char.charCodeAt(0),
      shift: true
    };
  }

  // Handle regular characters
  return {
    keycode: char.charCodeAt(0),
    shift: false
  };
}

// Helper function to execute computer actions
export async function executeComputerAction(
  action: string,
  args: { text?: string; trajectory?: any; coordinate?: any },
  client: VncClient
) {
  if (!client) {
    throw new Error('No VNC client available for computer actions');
  }

  try {
    switch (action) {
      case 'mouse_move':
        const [x, y] = args.coordinate;
        await client.sendPointerEvent(x, y, false);
        client.x = x;
        client.y = y;
        return `<mouse_move>${x},${y}</mouse_move>`;

      case 'left_click':
        await client.sendPointerEvent(client.x, client.y, true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await client.sendPointerEvent(client.x, client.y, false);
        return `<left_click>${client.x},${client.y}</left_click>`;

      case 'type':
        for (const char of args.text || '') {
          const { keycode, shift } = getVNCKeycode(char);

          if (shift) {
            await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_SHIFT, true);
          }

          await client.sendKeyEvent(keycode, true);
          await new Promise((resolve) => setTimeout(resolve, 50));
          await client.sendKeyEvent(keycode, false);

          if (shift) {
            await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_SHIFT, false);
          }

          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return `<type>${args.text}</type>`;

      case 'key':
        const keyText = args.text?.toLowerCase();
        const specialKeys = {
          return: VNC_KEYS.SYSTEM.RETURN,
          plus: VNC_KEYS.SYMBOLS.PLUS,
          enter: VNC_KEYS.SYSTEM.RETURN,
          tab: VNC_KEYS.SYSTEM.TAB,
          space: VNC_KEYS.SYSTEM.SPACE,
          backspace: VNC_KEYS.SYSTEM.BACKSPACE,
          delete: VNC_KEYS.NAVIGATION.DELETE,
          escape: VNC_KEYS.SYSTEM.ESC,
          esc: VNC_KEYS.SYSTEM.ESC,
          up: VNC_KEYS.NAVIGATION.UP,
          down: VNC_KEYS.NAVIGATION.DOWN,
          left: VNC_KEYS.NAVIGATION.LEFT,
          right: VNC_KEYS.NAVIGATION.RIGHT,
          home: VNC_KEYS.NAVIGATION.HOME,
          end: VNC_KEYS.NAVIGATION.END,
          pageup: VNC_KEYS.NAVIGATION.PAGE_UP,
          pagedown: VNC_KEYS.NAVIGATION.PAGE_DOWN,
          page_up: VNC_KEYS.NAVIGATION.PAGE_UP,
          page_down: VNC_KEYS.NAVIGATION.PAGE_DOWN,
          super: VNC_KEYS.MODIFIERS.LEFT_SUPER,
          super_l: VNC_KEYS.MODIFIERS.LEFT_SUPER,
          meta: VNC_KEYS.MODIFIERS.LEFT_SUPER,
          win: VNC_KEYS.MODIFIERS.LEFT_SUPER,
          menu: VNC_KEYS.SYSTEM.MENU,
          ...Object.fromEntries(
            Array.from({ length: 12 }, (_, i) => [
              `f${i + 1}`,
              VNC_KEYS.FUNCTION[`F${i + 1}` as keyof typeof VNC_KEYS.FUNCTION]
            ])
          )
        };

        const keys = keyText?.split('+').map((k) => k.trim()) || [];
        const modifiers = {
          ctrl: false,
          alt: false,
          shift: false,
          super: false
        };

        let mainKeyCode;

        for (const key of keys) {
          if (key === 'ctrl' || key === 'control') modifiers.ctrl = true;
          else if (key === 'alt') modifiers.alt = true;
          else if (key === 'shift') modifiers.shift = true;
          else if (key === 'super' || key === 'win' || key === 'meta') modifiers.super = true;
          else {
            if (key in specialKeys) {
              mainKeyCode = specialKeys[key as keyof typeof specialKeys];
            } else if (key.length === 1) {
              const { keycode, shift } = getVNCKeycode(key);
              mainKeyCode = keycode;
              if (shift) modifiers.shift = true;
            } else {
              console.warn(`Unknown key encountered: ${key} - skipping this key`);
              return `<warning>Unknown key: ${key} was skipped</warning>`;
            }
          }
        }

        try {
          // Press modifier keys
          if (modifiers.ctrl) await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_CTRL, true);
          if (modifiers.alt) await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_ALT, true);
          if (modifiers.shift) await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_SHIFT, true);
          if (modifiers.super) await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_SUPER, true);

          // Press and release main key if we have one
          if (mainKeyCode) {
            await client.sendKeyEvent(mainKeyCode, true);
            await new Promise((resolve) => setTimeout(resolve, 100));
            await client.sendKeyEvent(mainKeyCode, false);
          }
        } catch (err) {
          console.error('Failed to send key event:', err);
          return `<error>Failed to send key event: ${(err as Error).message}</error>`;
        } finally {
          // Always try to release modifier keys to prevent them getting stuck
          try {
            if (modifiers.super) await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_SUPER, false);
            if (modifiers.shift) await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_SHIFT, false);
            if (modifiers.alt) await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_ALT, false);
            if (modifiers.ctrl) await client.sendKeyEvent(VNC_KEYS.MODIFIERS.LEFT_CTRL, false);
          } catch (err) {
            console.error('Failed to release modifier keys:', err);
          }
        }

        return `<key>${keyText}</key>`;

      case 'left_click_drag':
        const trajectory = args.trajectory;
        if (!trajectory || !trajectory.length) {
          throw new Error('No trajectory data provided for drag action');
        }

        // Start drag at first point
        await client.sendPointerEvent(trajectory[0].x, trajectory[0].y, true);
        client.x = trajectory[0].x;
        client.y = trajectory[0].y;

        // Replay the trajectory with timing
        for (let i = 1; i < trajectory.length; i++) {
          const point = trajectory[i];
          const prevPoint = trajectory[i - 1];
          const delay = point.timestamp - prevPoint.timestamp;

          // Wait for the actual time difference between points
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Move to next point while keeping button pressed
          await client.sendPointerEvent(point.x, point.y, true);
          client.x = point.x;
          client.y = point.y;
        }

        // Release at final point
        const finalPoint = trajectory[trajectory.length - 1];
        await client.sendPointerEvent(finalPoint.x, finalPoint.y, false);

        return `<left_click_drag>Replayed ${trajectory.length} points</left_click_drag>`;

      case 'right_click':
        await client.sendPointerEvent(client.x, client.y, false, true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await client.sendPointerEvent(client.x, client.y, false, false);
        return `<right_click>${client.x},${client.y}</right_click>`;

      case 'middle_click':
        await client.sendPointerEvent(client.x, client.y, false, false, true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await client.sendPointerEvent(client.x, client.y, false, false, false);
        return `<middle_click>${client.x},${client.y}</middle_click>`;

      case 'double_click':
        await client.sendPointerEvent(client.x, client.y, true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await client.sendPointerEvent(client.x, client.y, false);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await client.sendPointerEvent(client.x, client.y, true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        await client.sendPointerEvent(client.x, client.y, false);
        return `<double_click>${client.x},${client.y}</double_click>`;

      case 'cursor_position':
        return `<cursor_position>${client.x},${client.y}</cursor_position>`;

      case 'scroll_up':
        // Simulate mouse wheel scroll up
        await client.sendPointerEvent(client.x, client.y, false, false, false, true);
        return `<scroll_up>${client.x},${client.y}</scroll_up>`;

      case 'scroll_down':
        // Simulate mouse wheel scroll down
        await client.sendPointerEvent(client.x, client.y, false, false, false, false, true);
        return `<scroll_down>${client.x},${client.y}</scroll_down>`;

      case 'screenshot':
        return `<screenshot></screenshot>`;

      case 'right_click_drag':
        const rightDragTrajectory = args.trajectory;
        if (!rightDragTrajectory || !rightDragTrajectory.length) {
          throw new Error('No trajectory data provided for right drag action');
        }

        // Start right drag at first point
        await client.sendPointerEvent(
          rightDragTrajectory[0].x,
          rightDragTrajectory[0].y,
          false,
          true
        );
        client.x = rightDragTrajectory[0].x;
        client.y = rightDragTrajectory[0].y;

        // Replay the trajectory with timing
        for (let i = 1; i < rightDragTrajectory.length; i++) {
          const point = rightDragTrajectory[i];
          const prevPoint = rightDragTrajectory[i - 1];
          const delay = point.timestamp - prevPoint.timestamp;

          await new Promise((resolve) => setTimeout(resolve, delay));
          await client.sendPointerEvent(point.x, point.y, false, true);
          client.x = point.x;
          client.y = point.y;
        }

        // Release at final point
        const rightFinalPoint = rightDragTrajectory[rightDragTrajectory.length - 1];
        await client.sendPointerEvent(rightFinalPoint.x, rightFinalPoint.y, false, false);

        return `<right_click_drag>Replayed ${rightDragTrajectory.length} points</right_click_drag>`;

      case 'middle_click_drag':
        const middleDragTrajectory = args.trajectory;
        if (!middleDragTrajectory || !middleDragTrajectory.length) {
          throw new Error('No trajectory data provided for middle drag action');
        }

        // Start middle drag at first point
        await client.sendPointerEvent(
          middleDragTrajectory[0].x,
          middleDragTrajectory[0].y,
          false,
          false,
          true
        );
        client.x = middleDragTrajectory[0].x;
        client.y = middleDragTrajectory[0].y;

        // Replay the trajectory with timing
        for (let i = 1; i < middleDragTrajectory.length; i++) {
          const point = middleDragTrajectory[i];
          const prevPoint = middleDragTrajectory[i - 1];
          const delay = point.timestamp - prevPoint.timestamp;

          await new Promise((resolve) => setTimeout(resolve, delay));
          await client.sendPointerEvent(point.x, point.y, false, false, true);
          client.x = point.x;
          client.y = point.y;
        }

        // Release at final point
        const middleFinalPoint = middleDragTrajectory[middleDragTrajectory.length - 1];
        await client.sendPointerEvent(middleFinalPoint.x, middleFinalPoint.y, false, false, false);

        return `<middle_click_drag>Replayed ${middleDragTrajectory.length} points</middle_click_drag>`;

      default:
        throw new Error(`Unknown computer action: ${action}`);
    }
  } catch (error) {
    console.error(`Error executing computer action ${action}:`, error);
    throw error;
  }
}
