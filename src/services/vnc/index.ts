// @ts-ignore
import VncClient from "vnc-rfb-client";
import sharp from "sharp";
import path from "path";
import fs from "fs";

type FrameBuffer = {
  buffer: Buffer;
  width: number;
  height: number;
  bytesPerPixel: 1 | 2 | 3 | 4;
  lastUpdate: number;
};

class VNCService {
  static closeAllSessions() {
    throw new Error("Method not implemented.");
  }
  sessions: Map<string, VncClient>;
  frameBuffers: Map<string, FrameBuffer>;
  screenshotsDir: string;
  connectionStatus: Map<any, any>;
  lastFrameUpdate: Map<any, any>;
  frameUpdateTimeout: number;
  maxUpdateRetries: number;
  connectionTimeout: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  reconnectAttempts: Map<any, any>;

  constructor() {
    this.sessions = new Map(); // Map to store VNC sessions by tournament ID
    this.frameBuffers = new Map(); // Map to store frame buffers by tournament ID
    this.screenshotsDir = path.join(process.cwd(), "public", "screenshots");
    this.connectionStatus = new Map(); // Track connection status
    this.lastFrameUpdate = new Map(); // Track last frame update time
    this.frameUpdateTimeout = 5000; // 5 seconds
    this.maxUpdateRetries = 3;
    this.connectionTimeout = 10000; // 10 seconds
    this.reconnectDelay = 2000; // Delay between reconnection attempts
    this.maxReconnectAttempts = 5; // Maximum number of reconnection attempts
    this.reconnectAttempts = new Map(); // Track reconnection attempts per tournament

    // Ensure screenshots directory exists
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  initFrameBuffer(
    tournamentId: string,
    width: number = 1280,
    height: number = 720
  ) {
    const bytesPerPixel = 4; // 32-bit color (RGBA)
    const buffer = Buffer.alloc(width * height * bytesPerPixel, 0);
    this.frameBuffers.set(tournamentId, {
      buffer,
      width,
      height,
      bytesPerPixel,
      lastUpdate: Date.now(),
    });
    return buffer;
  }

  isConnected(tournamentId: string) {
    return this.connectionStatus.get(tournamentId) === "connected";
  }

  isFrameEmpty(tournamentId: string) {
    const frameBuffer = this.frameBuffers.get(tournamentId);
    if (!frameBuffer) return true;

    // Check if buffer contains any non-zero values
    return !frameBuffer.buffer.some((byte) => byte !== 0);
  }

  async requestFrameUpdate(tournamentId: string, retryCount: number = 0) {
    const session = this.sessions.get(tournamentId);
    if (!session) return false;

    return new Promise((resolve) => {
      if (retryCount >= this.maxUpdateRetries) {
        console.error(`Max retries reached for frame update (${tournamentId})`);
        resolve(false);
        return;
      }

      const requestTime = Date.now();

      // Request full frame update
      session.requestFrameUpdate(
        true,
        false,
        0,
        0,
        session.clientWidth,
        session.clientHeight
      );

      // Set up timeout handler
      const timeout = setTimeout(() => {
        // Remove listeners before recursing or resolving
        session.removeListener("frameUpdated", frameUpdateHandler);
        session.removeListener("error", errorHandler);

        if (Date.now() !== requestTime) {
          if (retryCount < this.maxUpdateRetries) {
            console.log(
              `Frame update timeout, retry ${retryCount + 1} (${tournamentId})`
            );
            this.requestFrameUpdate(tournamentId, retryCount + 1)
              .then(resolve)
              .catch(() => resolve(false));
          } else {
            console.error("Frame update failed after max retries");
            resolve(false);
          }
        }
      }, this.frameUpdateTimeout);

      // Handle successful frame update
      const frameUpdateHandler = () => {
        clearTimeout(timeout);
        // Remove error handler since we succeeded
        session.removeListener("error", errorHandler);
        resolve(true);
      };

      // Handle errors
      const errorHandler = (error: Error) => {
        clearTimeout(timeout);
        // Remove frame update handler since we got an error
        session.removeListener("frameUpdated", frameUpdateHandler);
        console.error("Frame update error:", error);
        resolve(false);
      };

      // Add listeners
      session.once("frameUpdated", frameUpdateHandler);
      session.once("error", errorHandler);
    });
  }

  async waitForFirstFrame(tournamentId: string) {
    const session = this.sessions.get(tournamentId);
    if (!session) return false;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Clean up listeners on timeout
        session.removeListener("firstFrameUpdate", frameHandler);
        session.removeListener("frameUpdated", frameHandler);
        console.log("First frame timeout, resolving anyway");
        resolve(false);
      }, this.connectionTimeout);

      const frameHandler = () => {
        clearTimeout(timeout);
        // Clean up the other listener since we got one of them
        session.removeListener("firstFrameUpdate", frameHandler);
        session.removeListener("frameUpdated", frameHandler);
        resolve(true);
      };

      // Wait for either first frame or frame update
      session.once("firstFrameUpdate", frameHandler);
      session.once("frameUpdated", frameHandler);
    });
  }

  async ensureValidConnection(tournamentId: string) {
    if (!this.isConnected(tournamentId)) {
      console.log(
        `VNC session not connected for tournament ${tournamentId}, attempting connection...`
      );

      // Get or initialize reconnect attempts counter
      let attempts = this.reconnectAttempts.get(tournamentId) || 0;

      while (attempts < this.maxReconnectAttempts) {
        try {
          console.log(
            `Connection attempt ${attempts + 1}/${
              this.maxReconnectAttempts
            } for tournament ${tournamentId}`
          );

          const client = await this.connectSession(tournamentId);
          // Wait for first frame after connection
          const gotFrame = await this.waitForFirstFrame(tournamentId);
          if (!gotFrame) {
            console.log("Did not receive initial frame, requesting update...");
            await this.requestFrameUpdate(tournamentId);
          }

          // Reset attempts counter on successful connection
          this.reconnectAttempts.set(tournamentId, 0);
          return client;
        } catch (error) {
          attempts++;
          this.reconnectAttempts.set(tournamentId, attempts);
          console.error(
            `Connection attempt ${attempts} failed: ${(error as Error).message}`
          );

          if (attempts < this.maxReconnectAttempts) {
            console.log(
              `Waiting ${this.reconnectDelay}ms before next attempt...`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, this.reconnectDelay)
            );
          }
        }
      }

      console.error(
        `Failed to connect after ${attempts} attempts for tournament ${tournamentId}`
      );
      return null;
    }
    return this.sessions.get(tournamentId);
  }

  async connectSession(tournamentId: string) {
    // Clean up any existing session
    await this.closeSession(tournamentId);

    // Create new VNC client with default config
    const client = new VncClient({
      debug: false,
      encodings: [
        VncClient.consts.encodings.copyRect,
        VncClient.consts.encodings.zrle,
        VncClient.consts.encodings.hextile,
        VncClient.consts.encodings.raw,
        VncClient.consts.encodings.pseudoDesktopSize,
        VncClient.consts.encodings.pseudoCursor,
      ],
      debugLevel: 1,
    });

    return new Promise((resolve, reject) => {
      let connectionTimeout = setTimeout(() => {
        this.connectionStatus.set(tournamentId, "error");
        reject(new Error("Connection timeout"));
      }, this.connectionTimeout);

      // Set up event handlers before connecting
      const connectedHandler = () => {
        console.log(`VNC connected for tournament ${tournamentId}`);
        clearTimeout(connectionTimeout);
        this.sessions.set(tournamentId, client);
        this.connectionStatus.set(tournamentId, "connected");

        // Initialize frame buffer on first frame update
        const firstFrameHandler = () => {
          this.initFrameBuffer(
            tournamentId,
            client.clientWidth,
            client.clientHeight
          );
          this.updateFrameBuffer(tournamentId, client.getFb());
          // Clean up first frame handler after use
          client.removeListener("firstFrameUpdate", firstFrameHandler);
        };

        // Update frame buffer on subsequent updates
        const frameUpdateHandler = () => {
          this.updateFrameBuffer(tournamentId, client.getFb());
        };

        client.once("firstFrameUpdate", firstFrameHandler);
        client.on("frameUpdated", frameUpdateHandler);

        // Store handlers for cleanup
        client._eventHandlers = {
          frameUpdateHandler,
          disconnectHandler,
          errorHandler,
        };

        resolve(client);
      };

      const disconnectHandler = async () => {
        console.log(`VNC closed for tournament ${tournamentId}`);
        this.connectionStatus.set(tournamentId, "disconnected");
        this.sessions.delete(tournamentId);
        this.frameBuffers.delete(tournamentId);

        // Attempt to reconnect on unexpected disconnection
        const attempts = this.reconnectAttempts.get(tournamentId) || 0;
        if (attempts < this.maxReconnectAttempts) {
          console.log(
            `Attempting to reconnect after disconnect for tournament ${tournamentId}`
          );
          await this.ensureValidConnection(tournamentId);
        }
      };

      const errorHandler = (err: Error) => {
        console.error(`VNC error for tournament ${tournamentId}:`, err);
        this.connectionStatus.set(tournamentId, "error");
        reject(err);
      };

      // Add event listeners
      client.on("connected", connectedHandler);
      client.on("disconnect", disconnectHandler);
      client.on("error", errorHandler);

      // Connect to VNC server using environment variables or defaults
      try {
        client.connect({
          host: process.env.VNC_HOST || "localhost",
          port: parseInt(process.env.VNC_PORT || "5900"),
          password: process.env.VNC_PASSWORD || "",
        });
      } catch (error) {
        clearTimeout(connectionTimeout);
        // Clean up listeners on error
        client.removeListener("connected", connectedHandler);
        client.removeListener("disconnect", disconnectHandler);
        client.removeListener("error", errorHandler);
        this.connectionStatus.set(tournamentId, "error");
        reject(error);
      }
    });
  }

  updateFrameBuffer(tournamentId: string, newBuffer: Buffer) {
    try {
      const frameBuffer = this.frameBuffers.get(tournamentId);
      if (!frameBuffer) {
        console.error("No frame buffer found for tournament:", tournamentId);
        return;
      }

      // Copy new buffer data to frame buffer
      newBuffer.copy(frameBuffer.buffer);
      frameBuffer.lastUpdate = Date.now();

      // Update latest.jpg
      this.saveLatestImage(tournamentId, frameBuffer);
    } catch (error) {
      console.error("Error updating frame buffer:", error);
    }
  }

  async saveLatestImage(tournamentId: string, frameBuffer: FrameBuffer) {
    try {
      const timestamp = Date.now();
      const latestPath = path.join(
        this.screenshotsDir,
        `${tournamentId}_latest.jpg`
      );

      // Create image with timestamp overlay
      await sharp(frameBuffer.buffer, {
        raw: {
          width: frameBuffer.width,
          height: frameBuffer.height,
          channels: frameBuffer.bytesPerPixel,
        },
      })
        .jpeg({
          quality: 95,
          progressive: true,
        })
        .toFile(latestPath);

      return timestamp;
    } catch (error) {
      console.error("Error saving latest image:", error);
      return null;
    }
  }

  async getScreenshot(tournamentId: string, saveHistory: boolean = false) {
    try {
      // Ensure we have a valid connection
      const session = await this.ensureValidConnection(tournamentId);
      if (!session) {
        console.error("Failed to establish valid connection");
        return {
          url: "/images/Screenshot.png",
          width: 1280,
          height: 720,
          timestamp: Date.now(),
        };
      }

      // Initialize frame buffer if needed
      if (!this.frameBuffers.has(tournamentId)) {
        this.initFrameBuffer(
          tournamentId,
          session.clientWidth || 1280,
          session.clientHeight || 720
        );
      }

      // Request frame update
      const updated = await this.requestFrameUpdate(tournamentId);
      if (!updated) {
        console.error("Failed to get frame update");
        return {
          url: "/images/Screenshot.png",
          width: 1280,
          height: 720,
          timestamp: Date.now(),
        };
      }

      const frameBuffer = this.frameBuffers.get(tournamentId);
      if (!frameBuffer)
        throw Error("Could not find framebuffer for " + tournamentId);
      const timestamp = Date.now();

      // If saveHistory is true (e.g. for chat messages), save timestamped file
      if (saveHistory) {
        const filename = `${tournamentId}_${timestamp}.jpg`;
        const filepath = path.join(this.screenshotsDir, filename);

        await sharp(frameBuffer.buffer, {
          raw: {
            width: frameBuffer.width,
            height: frameBuffer.height,
            channels: frameBuffer.bytesPerPixel,
          },
        })
          .jpeg({
            quality: 95,
            progressive: true,
          })
          .toFile(filepath);

        // Clean up old screenshots
        await this.cleanupScreenshots(tournamentId);

        return {
          url: `/api/screenshots/${filename}`,
          width: frameBuffer.width,
          height: frameBuffer.height,
          timestamp: timestamp,
        };
      }

      // For regular updates (e.g. get-challenge polling), just update latest.jpg
      const savedTimestamp = await this.saveLatestImage(
        tournamentId,
        frameBuffer
      );

      return {
        url: `/api/screenshots/${tournamentId}_latest.jpg?t=${
          savedTimestamp || timestamp
        }`,
        width: frameBuffer.width,
        height: frameBuffer.height,
        timestamp: savedTimestamp || timestamp,
      };
    } catch (error) {
      console.error("Error saving screenshot:", error);
      return {
        url: "/images/Screenshot.png",
        width: 1280,
        height: 720,
        timestamp: Date.now(),
      };
    }
  }

  async closeSession(tournamentId: string) {
    const session = this.sessions.get(tournamentId);
    if (session) {
      // Reset reconnection attempts when explicitly closing
      this.reconnectAttempts.set(tournamentId, 0);
      try {
        // Clean up stored event handlers
        if (session._eventHandlers) {
          const { frameUpdateHandler, disconnectHandler, errorHandler } =
            session._eventHandlers;
          session.removeListener("frameUpdated", frameUpdateHandler);
          session.removeListener("disconnect", disconnectHandler);
          session.removeListener("error", errorHandler);
          delete session._eventHandlers;
        }

        // Remove all remaining listeners to be safe
        session.removeAllListeners();

        // Disconnect the session
        session.disconnect();
      } catch (error) {
        console.error(
          `Error closing VNC session for tournament ${tournamentId}:`,
          error
        );
      } finally {
        // Clean up session data regardless of close success
        this.sessions.delete(tournamentId);
        this.frameBuffers.delete(tournamentId);
        this.connectionStatus.delete(tournamentId);
      }
    }
  }

  async closeAllSessions() {
    for (const [tournamentId, session] of this.sessions) {
      await this.closeSession(tournamentId);
    }
  }

  // Clean up old screenshots (keep last 100 per tournament)
  async cleanupScreenshots(tournamentId: string) {
    try {
      const files = fs
        .readdirSync(this.screenshotsDir)
        .filter(
          (file) =>
            file.startsWith(tournamentId) && !file.endsWith("_latest.jpg")
        )
        .sort((a, b) => {
          const timestampA = parseInt(a.split("_")[1]);
          const timestampB = parseInt(b.split("_")[1]);
          return timestampB - timestampA;
        });

      // Keep only the latest 100 screenshots
      if (files.length > 100) {
        const filesToDelete = files.slice(100);
        filesToDelete.forEach((file) => {
          fs.unlinkSync(path.join(this.screenshotsDir, file));
        });
      }
    } catch (error) {
      console.error("Error cleaning up screenshots:", error);
    }
  }
}

// Cleanup VNC sessions when server shuts down
process.on("SIGINT", async () => {
  await VNCService.closeAllSessions();
  process.exit(0);
});

export default new VNCService();
