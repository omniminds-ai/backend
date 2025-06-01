> Farag: jailbreak is the smart contract for training pool -  built using anchor https://www.anchor-lang.com/docs/quickstart/solpg

# Jailbreak Pool
This package handles all on-chain interactions for the Jailbreak tournament system. It provides both a CLI and TypeScript functions for managing tournaments on the Solana blockchain.

## CLI Commands

Run these commands locally (outside Docker) to interact with the blockchain:

```bash
# Start a tournament
npm run start-tournament -- -s <system-prompt> -p <pool-amount>

# Conclude a tournament
npm run conclude-tournament -- -t <tournament-pda> -w <winner-address>
```

## Programmatic Usage

The package exports TypeScript functions for integration:

```typescript
// Start a new tournament
const result = await startTournament(systemPrompt: string, initialPool: number);
// Returns: { success: boolean, signature?: string, tournamentPDA?: string, error?: string }

// Conclude a tournament
const result = await concludeTournament(tournamentPDA: string, winnerAccount: string);
// Returns: { success: boolean, signature?: string, error?: string }
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript files
npm run build

# Run tests
npm test

# Format code
npm run lint:fix
```

## Testing

Tests are written using Anchor's testing framework. Run them locally:

```bash
anchor test
```

## Environment Variables

Required environment variables:
- `ANCHOR_PROVIDER_URL`: URL of the Solana cluster
- `ANCHOR_WALLET`: Path to wallet keypair file

## Important Note

This package is designed to be run locally (outside Docker) for direct blockchain interactions. For database operations, use the backend Docker container commands instead.
