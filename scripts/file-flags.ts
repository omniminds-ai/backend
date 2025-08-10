import * as fs from 'fs';

/**
 * Creates an empty file to serve as a flag
 * @param filename - The name/path of the flag file to create
 */
function createFlag(filename: string): void {
  try {
    fs.writeFileSync(filename, '', 'utf8');
    console.log(`Flag created: ${filename}`);
  } catch (error) {
    console.error(`Error creating flag ${filename}:`, error instanceof Error ? error.message : String(error));
  }
}

/**
 * Checks if a flag file exists
 * @param filename - The name/path of the flag file to check
 * @returns True if file exists, false otherwise
 */
function checkFlag(filename: string): boolean {
  try {
    return fs.existsSync(filename);
  } catch (error) {
    console.error(`Error checking flag ${filename}:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * Removes a flag file (bonus function for cleanup)
 * @param filename - The name/path of the flag file to remove
 */
function removeFlag(filename: string): void {
  try {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
      console.log(`Flag removed: ${filename}`);
    }
  } catch (error) {
    console.error(`Error removing flag ${filename}:`, error instanceof Error ? error.message : String(error));
  }
}

// Example usage:
// createFlag('process_running.flag');
// console.log('Is process running?', checkFlag('process_running.flag'));
// removeFlag('process_running.flag');

export { createFlag, checkFlag, removeFlag };