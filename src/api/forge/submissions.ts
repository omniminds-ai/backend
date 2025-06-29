const router: Router = express.Router();
import express, { Request, Response, Router } from 'express';
import { requireWalletAddress } from '../../middleware/auth.ts';
import multer from 'multer';
import { errorHandlerAsync } from '../../middleware/errorHandler.ts';
import { ApiError, successResponse } from '../../middleware/types/errors.ts';
import { ForgeRaceSubmissionModel, TrainingPoolModel } from '../../models/Models.ts';
import { validateParams, ValidationRules } from '../../middleware/validator.ts';
export { router as forgeSubmissionsApi };

const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 15 * 1024 * 1024 * 1024 // 15GB limit for /upload-race endpoint
  }
});

// Get submissions for authenticated user
router.get(
  '/user',
  requireWalletAddress,
  errorHandlerAsync(async (req: Request, res: Response) => {
    // @ts-ignore - Get walletAddress from the request object
    const address = req.walletAddress;

    const submissions = await ForgeRaceSubmissionModel.find({ address })
      .sort({ createdAt: -1 })
      .select('-__v');

    const mockData = [
      {
        "_id": "83d30894c7ea1b6face7d43c76de8e5f50ef3b00d0add6a9c872475f14228422",
        "address": "ADNnXHtn6FBQAsqjWPYS9tNTLPqiJgkGwCcd4Hj3HMEG",
        "meta": {
          "id": "20250606_234245",
          "timestamp": "2025-06-06T23:42:45.355462700+03:00",
          "duration_seconds": 22,
          "status": "completed",
          "reason": "done",
          "title": "Open Excel file or create new",
          "description": "",
          "platform": "windows",
          "arch": "x86_64",
          "version": "10.0.26100",
          "locale": "en-US",
          "primary_monitor": {
            "width": 1920,
            "height": 1200
          },
          "quest": {
            "title": "Open Excel file or create new",
            "app": "Microsoft Excel",
            "icon_url": "https://s2.googleusercontent.com/s2/favicons?domain=microsoft.com&sz=64",
            "objectives": [
              "Open <app>Microsoft Excel</app> on your computer",
              "Click on 'Open' to find an existing file or 'New' to create a file",
              "Choose or create a worksheet",
              "Navigate to the chosen worksheet"
            ],
            "content": "Hi! I can help you open an existing Excel file or create a new one. Do you want to open a file you already have or start fresh?",
            "pool_id": "67cfaffa082b129aa5ff9ed9",
            "reward": {
              "time": 1749242520000,
              "max_reward": 10
            },
            "task_id": "67d234c72cc965914641076c"
          },
          "poolId": "67cfaffa082b129aa5ff9ed9"
        },
        "status": "completed",
        "files": [
          {
            "file": "input_log.jsonl",
            "s3Key": "forge-races/1749242620348-input_log.jsonl",
            "size": 50452,
            "_id": "684352fcbd6c47a29fcff144"
          },
          {
            "file": "meta.json",
            "s3Key": "forge-races/1749242620349-meta.json",
            "size": 1109,
            "_id": "684352fcbd6c47a29fcff145"
          },
          {
            "file": "recording.mp4",
            "s3Key": "forge-races/1749242620349-recording.mp4",
            "size": 1059476,
            "_id": "684352fcbd6c47a29fcff146"
          }
        ],
        "createdAt": "2025-06-06T20:43:40.666Z",
        "updatedAt": "2025-06-06T20:44:04.992Z",
        "clampedScore": 100,
        "grade_result": {
          "summary": "• Pressed \"LeftAlt\" key\n• Typed \"excel\"\n• Opened Microsoft Excel\n• Created a new worksheet\n• Navigated to the chosen worksheet",
          "score": 100,
          "reasoning": "The score is 100 because all objectives were completed efficiently. The user successfully opened Microsoft Excel, created a new worksheet, and navigated to it without any errors or unnecessary actions.",
          "_id": "68435314bd6c47a29fcff188"
        },
        "maxReward": 10,
        "reward": 10,
        "treasuryTransfer": {
          "tokenAddress": "HW7D5MyYG4Dz2C98axfjVBeLWpsEnofrqy6ZUwqwpump",
          "treasuryWallet": "763xkknLJyLMj2ohH87GtYXgkzGxsCH9Y7oGPmkvRp2h",
          "amount": 10,
          "timestamp": 1749242643623,
          "txHash": "5juyFEK9KGFLwbc3gfzycds6Q8VXpDDxVKHedwJgWcSTcHz44CaFdGuwZ457kBF7X7U3uvy965m6f6K3WSVbcEQe",
          "_id": "68435314bd6c47a29fcff189"
        }
      }
    ]
    res.status(200).json(successResponse(mockData))
    // res.status(200).json(successResponse(submissions));
  })
);

// Get submissions for a pool
router.get(
  '/pool/:poolId',
  requireWalletAddress,
  validateParams({ poolId: { required: true, rules: [ValidationRules.isString()] } }),
  requireWalletAddress,
  errorHandlerAsync(async (req: Request, res: Response) => {
    const { poolId } = req.params;

    // @ts-ignore - Get walletAddress from the request object
    const address = req.walletAddress;

    // Verify that the pool belongs to the user
    const pool = await TrainingPoolModel.findById(poolId);
    if (!pool) {
      throw ApiError.notFound('Pool not found');
    }

    if (pool.ownerAddress !== address) {
      throw ApiError.unauthorized('Not authorized to view submissions for this pool');
    }

    const submissions = await ForgeRaceSubmissionModel.find({ 'meta.quest.pool_id': poolId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json(successResponse(submissions));
  })
);

// Get any submission status -- requires authentication
router.get(
  '/:id',
  validateParams({ id: { required: true, rules: [ValidationRules.isString()] } }),
  requireWalletAddress,
  errorHandlerAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const submission = await ForgeRaceSubmissionModel.findById(id);

    if (!submission) {
      throw ApiError.notFound('Submission not found');
    }

    res.status(200).json(
      successResponse({
        status: submission.status,
        grade_result: submission.grade_result,
        error: submission.error,
        meta: submission.meta,
        files: submission.files,
        reward: submission.reward,
        maxReward: submission.maxReward,
        clampedScore: submission.clampedScore,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt
      })
    );
  })
);
