/**
 * Message filtering utilities for tournament messages
 */

export default class MessageFilters {
  /**
   * Remove special characters from message
   */
  static removeSpecialCharacters(message: string) {
    return message.replace(/[^a-zA-Z0-9 ]/g, "");
  }

  /**
   * Enforce character limit on message
   */
  static enforceCharacterLimit(message: string, limit: number) {
    if (!limit || message.length <= limit) return message;
    return message.slice(0, limit);
  }

  /**
   * Enforce character limit per word
   */
  static enforceWordCharacterLimit(message: string, charLimit: number) {
    if (!charLimit) return message;

    const words = message.split(" ");
    const trimmedWords = words.map((word) => {
      if (word.length > charLimit) {
        // Split long words into chunks of max length
        return word.match(new RegExp(`.{1,${charLimit}}`, "g"))?.join(" ");
      }
      return word;
    });

    return trimmedWords.join(" ");
  }

  /**
   * Apply all message filters based on challenge rules
   */
  static applyFilters(
    message: any,
    rules: {
      disable: string[];
      characterLimit: number;
      charactersPerWord: number;
    }
  ) {
    let filtered = message;

    // Remove special characters if disabled
    if (rules.disable?.includes("special_characters")) {
      filtered = this.removeSpecialCharacters(filtered);
    }

    // Apply character limit
    if (rules.characterLimit) {
      filtered = this.enforceCharacterLimit(filtered, rules.characterLimit);
    }

    // Apply per-word character limit
    if (rules.charactersPerWord) {
      filtered = this.enforceWordCharacterLimit(
        filtered,
        rules.charactersPerWord
      );
    }

    return filtered;
  }
}
