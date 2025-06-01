import express, { Request, Response } from 'express';
import DatabaseService from '../services/db/index.ts';
import BlockcahinService from '../services/blockchain/index.ts';
import { errorHandlerAsync } from '../middleware/errorHandler.ts';
import { validateQuery } from '../middleware/validator.ts';
import { settingsQuerySchema } from './schemas/settings.ts';
import { successResponse } from '../middleware/types/errors.ts';
import BlockchainService from '../services/blockchain/index.ts';
import { Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';

const router = express.Router();
// Load treasury wallet
const solanaRpc = process.env.SOLANA_RPC_URL!;
const viralToken = process.env.VIRAL_TOKEN!;
const treasuryWalletPath = process.env.GYM_TREASURY_WALLET!;
const blockchainService = new BlockchainService(solanaRpc, '');
// const treasuryKeypair = Keypair.fromSecretKey(
//   Uint8Array.from(JSON.parse(readFileSync(treasuryWalletPath, 'utf-8')))
// );

router.get(
  '/',
  validateQuery(settingsQuerySchema),
  errorHandlerAsync(async (_req: Request, res: Response) => {
    const challenges = await DatabaseService.getSettings();
    const pages = await DatabaseService.getPages({});
    const endpoints = pages?.find((page) => page.name === 'api-endpoints')?.content?.endpoints;
    const faq = pages?.find((page) => page.name === 'faq')?.content?.faq;
    const jailToken = pages?.find((page) => page.name === 'omnis-token')?.content;

    const solPrice = await BlockcahinService.getSolPriceInUSDT();

    // Get active/upcoming challenge
    const display_conditions = ['active', 'upcoming'];
    let activeChallenge = challenges?.find((challenge) =>
      display_conditions.includes(challenge.status)
    );

    // Add prize calculation to active challenge if it exists
    if (activeChallenge) {
      const prize = activeChallenge.winning_prize || activeChallenge.entryFee! * 100;
      const usdPrize = prize * solPrice;
      activeChallenge = {
        //@ts-ignore
        ...activeChallenge.toObject(),
        prize,
        usdPrize
      };
    }

    // Get concluded challenges, sorted by most recent first
    const concludedChallenges = challenges
      ?.filter((challenge) => challenge.status === 'concluded')
      .sort((a, b) => new Date(b.expiry!).getTime() - new Date(a.expiry!).getTime())
      .map((challenge) => {
        const plainChallenge = challenge;
        const prize = plainChallenge.winning_prize || plainChallenge.entryFee! * 100;
        const usdPrize = prize * solPrice;
        return {
          ...plainChallenge,
          prize,
          usdPrize
        };
      });

    const totalWinningPrize = challenges
      ?.filter((challenge) => challenge.winning_prize)
      .map((challenge) => {
        const treasury = challenge.winning_prize! * (challenge.developer_fee! / 100);
        const total_payout = challenge.winning_prize! - treasury;

        return {
          treasury: treasury * solPrice,
          total_payout: total_payout * solPrice
        };
      });

    const totalTreasury = totalWinningPrize?.reduce((acc, item) => acc + item.treasury, 0);
    const totalPayout = totalWinningPrize?.reduce((acc, item) => acc + item.total_payout, 0);

    const breakAttempts = await DatabaseService.getChatCount({ role: 'user' });
    const response = {
      endpoints: endpoints,
      faq: faq,
      challenges: challenges,
      jailToken: jailToken,
      activeChallenge: activeChallenge,
      concludedChallenges: concludedChallenges,
      treasury: totalTreasury,
      total_payout: totalPayout,
      breakAttempts: breakAttempts,
      solPrice: solPrice
    };

    return res.status(200).json(successResponse(response));
  })
);

// Get treasury balance endpoint
// router.get(
//   '/treasury',
//   errorHandlerAsync(async (_req, res) => {
//     const balance = await blockchainService.getTokenBalance(
//       viralToken,
//       treasuryKeypair.publicKey.toBase58()
//     );
//     res.status(200).json(successResponse({ balance }));
//   })
// );
//
export { router as settingsApi };
