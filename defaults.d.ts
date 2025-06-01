declare namespace Express {
  export interface Request {
    user?: {
      date_created: Date;
      address?: string | null | undefined;
      api_key?: string | null | undefined;
    };
  }
}

declare module "vnc-rfb-client" {
  import { EventEmitter } from "events";
  import { Buffer } from "buffer";
  /** VNC client configuration options */
  export interface VncClientOptions {
    /** Enable debug logging */
    debug?: boolean;
    /** Frames per second for frame updates */
    fps?: number;
    /** List of supported encodings */
    encodings?: number[];
    /** Debug logging verbosity level */
    debugLevel?: number;
    /** Number of audio channels */
    audioChannels?: number;
    /** Audio frequency in Hz */
    audioFrequency?: number;
  }

  /** Options for establishing a VNC connection */
  export interface VncConnectionOptions {
    /** VNC server hostname or IP address */
    host: string;
    /** VNC authentication password */
    password?: string;
    /** Use 8-bit color mode */
    set8BitColor?: boolean;
    /** VNC server port (default: 5900) */
    port?: number;
  }

  /** Pixel format configuration for the VNC session */
  export interface PixelFormat {
    bitsPerPixel: number;
    depth: number;
    bigEndianFlag: number;
    trueColorFlag: number;
    redMax: number;
    greenMax: number;
    blueMax: number;
    redShift: number;
    blueShift: number;
    greenShift: number;
  }

  /** Cursor data structure for pseudo-cursor encoding */
  export interface CursorData {
    width: number;
    height: number;
    x: number;
    y: number;
    cursorPixels: Buffer | null;
    bitmask: Buffer | null;
    posX: number;
    posY: number;
  }

  /** Rectangle structure for frame buffer updates */
  export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    encoding: number;
    data?: Buffer;
  }

  /** Desktop dimensions */
  export interface DesktopSize {
    width: number;
    height: number;
  }

  /**
   * Handles buffered socket data reading with various data type parsing capabilities.
   * Used internally by the VNC client to manage the RFB protocol data stream.
   */
  export class SocketBuffer {
    buffer: Buffer;
    offset: number;

    constructor();

    /** Clears the buffer or keeps remaining data if keep is true */
    flush(keep?: boolean): void;
    /** Converts buffer content to string */
    toString(): string;
    /** Checks if buffer includes a byte value */
    includes(check: number): boolean;
    /** Appends data to the buffer */
    pushData(data: Buffer): void;
    /** Reads a signed 32-bit big-endian integer */
    readInt32BE(): number;
    /** Reads a signed 32-bit little-endian integer */
    readInt32LE(): number;
    /** Reads an unsigned 32-bit big-endian integer */
    readUInt32BE(): number;
    /** Reads an unsigned 32-bit little-endian integer */
    readUInt32LE(): number;
    /** Reads an unsigned 16-bit big-endian integer */
    readUInt16BE(): number;
    /** Reads an unsigned 16-bit little-endian integer */
    readUInt16LE(): number;
    /** Reads an unsigned 8-bit integer */
    readUInt8(): number;
    /** Reads a signed 8-bit integer */
    readInt8(): number;
    /** Reads specified number of bytes starting at offset */
    readNBytes(bytes: number, offset?: number): Buffer;
    /** Reads RGB color data and adds alpha channel */
    readRgbPlusAlpha(red: number, green: number, blue: number): number;
    /** Reads RGB color data from color map format */
    readRgbColorMap(
      red: number,
      green: number,
      blue: number,
      redMax: number,
      greenMax: number,
      blueMax: number
    ): number;
    /** Reads RGBA color data */
    readRgba(red: number, green: number, blue: number): number;
    /** Reads specified number of bytes and advances offset */
    readNBytesOffset(bytes: number): Buffer;
    /** Sets the current buffer offset */
    setOffset(n: number): void;
    /** Returns number of unread bytes in buffer */
    bytesLeft(): number;
    /** Waits for specified number of bytes to be available */
    waitBytes(bytes: number, name: string): Promise<void>;
    /** Fills buffer with data */
    fill(data: Buffer): void;
    /** Fills buffer with repeated data */
    fillMultiple(data: Buffer, repeats: number): void;
    private sleep(n: number): Promise<void>;
  }

  /**
   * Interface for VNC encoding decoders.
   * Implementations handle different VNC encoding types (raw, hextile, zrle, etc.)
   */
  export interface Decoder {
    decode(
      rect: Rectangle,
      fb: Buffer,
      bpp: number,
      colorMap: number[],
      width: number,
      height: number,
      socketBuffer: SocketBuffer,
      depth: number,
      redShift: number,
      greenShift: number,
      blueShift: number
    ): Promise<void>;
  }

  /** Type for VNC client event names */
  export type VncClientEventName =
    | "connected"
    | "closed"
    | "connectTimeout"
    | "connectError"
    | "authenticated"
    | "authError"
    | "bell"
    | "cutText"
    | "firstFrameUpdate"
    | "frameUpdated"
    | "rectProcessed"
    | "desktopSizeChanged"
    | "colorMapUpdated"
    | "audioStream";

  /**
   * VNC client implementation following the RFB protocol (RFC 6143).
   * Supports multiple encodings, authentication methods, and provides
   * both synchronous and event-based interfaces for VNC operations.
   */
  export class VncClient extends EventEmitter {
    static readonly consts: {
      encodings: typeof encodings;
    };

    /** Whether client is connected to server */
    readonly connected: boolean;
    /** Whether client is authenticated with server */
    readonly authenticated: boolean;
    /** Negotiated RFB protocol version */
    readonly protocolVersion: string;
    /** Local port used for connection */
    readonly localPort: number;

    /** Remote desktop width */
    clientWidth: number;
    /** Remote desktop height */
    clientHeight: number;
    /** Remote desktop name */
    clientName: string;
    /** Current pixel format settings */
    pixelFormat: PixelFormat;
    /** Frame buffer containing desktop pixels */
    fb: Buffer;
    /** List of supported encodings */
    encodings: number[];

    constructor(options?: VncClientOptions);

    /** Connects to a VNC server */
    connect(options: VncConnectionOptions): void;
    /** Disconnects from the VNC server */
    disconnect(): void;
    /** Requests a frame buffer update from the server */
    requestFrameUpdate(
      full?: boolean,
      incremental?: number,
      x?: number,
      y?: number,
      width?: number,
      height?: number
    ): void;
    /** Changes the frame update rate */
    changeFps(fps: number): void;
    /** Gets frame buffer with cursor overlay if using cursor encoding */
    getFb(): Buffer;
    /** Sends a key press/release event */
    sendKeyEvent(key: number, down?: boolean): void;
    /** Sends a pointer (mouse/touch) event */
    sendPointerEvent(
      xPosition: number,
      yPosition: number,
      button1?: boolean,
      button2?: boolean,
      button3?: boolean,
      button4?: boolean,
      button5?: boolean,
      button6?: boolean,
      button7?: boolean,
      button8?: boolean
    ): void;
    /** Sends clipboard text to server */
    clientCutText(text: string): void;
    /** Enables/disables audio streaming */
    sendAudio(enable: boolean): void;
    /** Configures audio streaming parameters */
    sendAudioConfig(channels: number, frequency: number): void;
    /** Updates frame buffer size */
    updateFbSize(): void;

    on(event: "connected", listener: () => void): this;
    on(event: "closed", listener: () => void): this;
    on(event: "connectTimeout", listener: () => void): this;
    on(event: "connectError", listener: (error: Error) => void): this;
    on(event: "authenticated", listener: () => void): this;
    on(event: "authError", listener: () => void): this;
    on(event: "bell", listener: () => void): this;
    on(event: "cutText", listener: (text: string) => void): this;
    on(
      event: "firstFrameUpdate",
      listener: (frameBuffer: Buffer) => void
    ): this;
    on(event: "frameUpdated", listener: (frameBuffer: Buffer) => void): this;
    on(event: "rectProcessed", listener: (rect: Rectangle) => void): this;
    on(
      event: "desktopSizeChanged",
      listener: (size: DesktopSize) => void
    ): this;
    on(event: "colorMapUpdated", listener: (colorMap: number[]) => void): this;
    on(event: "audioStream", listener: (audioData: number[]) => void): this;
  }

  /** Message types that can be sent from client to server */
  export const clientMsgTypes: {
    readonly setPixelFormat: 0;
    readonly setEncodings: 2;
    readonly fbUpdate: 3;
    readonly keyEvent: 4;
    readonly pointerEvent: 5;
    readonly cutText: 6;
    readonly qemuAudio: 255;
  };

  /** Message types that can be received from server */
  export const serverMsgTypes: {
    readonly fbUpdate: 0;
    readonly setColorMap: 1;
    readonly bell: 2;
    readonly cutText: 3;
    readonly qemuAudio: 255;
  };

  /** RFB protocol version strings */
  export const versionString: {
    readonly V3_003: "RFB 003.003\n";
    readonly V3_007: "RFB 003.007\n";
    readonly V3_008: "RFB 003.008\n";
  };

  /**
   * Supported encodings for pixel data.
   * Negative values are pseudo-encodings that don't represent pixel data
   * but rather protocol extensions.
   */
  export const encodings: {
    readonly raw: 0;
    readonly copyRect: 1;
    readonly rre: 2;
    readonly corre: 4;
    readonly hextile: 5;
    readonly zlib: 6;
    readonly tight: 7;
    readonly zlibhex: 8;
    readonly trle: 15;
    readonly zrle: 16;
    readonly h264: 50;
    readonly pseudoCursor: -239;
    readonly pseudoDesktopSize: -223;
    readonly pseudoQemuPointerMotionChange: -257;
    readonly pseudoQemuAudio: -259;
  };

  /**
   * Security types supported by the RFB protocol.
   * - None: No authentication required
   * - VNC: Standard VNC authentication with challenge-response
   */
  export const security: {
    readonly None: 1;
    readonly VNC: 2;
  };

  export default VncClient;
}
