import OpenAI from 'openai';
import BlockchainService from '../blockchain/index.ts';
import { Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { TreasuryService } from '../treasury/index.ts';
import { DBRaceSession } from '../../types/index.ts';
import { TrainingEventModel } from '../../models/Models.ts';
import DatabaseService from '../db/index.ts';
import GuacamoleService from '../guacamole/index.ts';
import { GymVPSService } from './index.ts';
import { AWSS3Service } from '../aws/index.ts';
import { unlink } from 'fs/promises';
import { isAxiosError } from 'axios';
import { handleAxiosError } from '../util.ts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const solanaRpc = process.env.RPC_URL!;
const viralToken = process.env.VIRAL_TOKEN!;
const treasuryWalletPath = process.env.GYM_TREASURY_WALLET!;
const blockchainService = new BlockchainService(solanaRpc, '');
// Load treasury wallet
const treasuryKeypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(treasuryWalletPath, 'utf-8')))
);

const treasuryService = new TreasuryService(
  process.env.RPC_URL!,
  process.env.GYM_TREASURY_WEBHOOK!,
  process.env.GYM_TREASURY_WALLET!,
  process.env.VIRAL_TOKEN!
);

export async function generateQuest(imageUrl: string, prompt: string, session: DBRaceSession) {
  try {
    // Get treasury balance
    const treasuryBalance = await blockchainService.getTokenBalance(
      viralToken,
      treasuryKeypair.publicKey.toString()
    );

    // Calculate max reward
    const rng = Math.random();
    const maxReward = Math.ceil(Math.min(1 / rng, treasuryBalance / 128));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an AI assistant that needs to propose a desktop quest on Ubuntu Linux with Gnome Desktop based on the theme: "${prompt}". 
              
First, analyze the current screen state to understand what task the user has already completed. Then, propose a DIFFERENT task that fits the same theme but isn't repetitive.

For example, if the theme is "Draw cartoon characters in jspaint" and they drew a jellyfish, propose drawing a completely different character - not another jellyfish or a variation of it.

Return as JSON with these keys:
- reasoning: Analyze what's on screen and explain why you're choosing a different task within the same theme
- quest: The new specific task to complete (should match the theme but be distinct from what's visible)
- hint: Helpful tip for completing the new task`
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
      max_tokens: 250
    });

    const jsonMatch = response.choices[0].message.content?.match(/{[\s\S]*}/);
    if (jsonMatch && jsonMatch[0]) {
      const questData = JSON.parse(jsonMatch[0]);
      return {
        ...questData,
        maxReward
      };
    }

    throw new Error('No valid JSON found in response');
  } catch (error) {
    if ((error as Error).message.includes('Invalid MIME type'))
      console.log(
        'Error generating quest: Invalid MIME type. Likely tried to send an empty frame.'
      );
    else console.error('Error generating quest:', error);

    return {
      reasoning: 'Failed to analyze screen, providing a generic task within theme',
      quest: 'Open the Gnome Activities overview and launch a relevant application',
      hint: 'Click the dots in the top-left corner of the screen, or press WIN/CMD.',
      maxReward: 0
    };
  }
}

// Track sessions with pending transactions and hint generation
const pendingTransactions = new Set<string>();

export async function generateHint(
  generatingHints: Set<string>,
  imageUrl: string,
  currentQuest: string,
  prompt: string,
  session: DBRaceSession,
  maxReward: number,
  hintHistory: string[] = []
) {
  try {
    // Check if hint is already being generated for this session
    if (!session._id) {
      throw new Error('Session ID is missing');
    }

    if (generatingHints.has(session._id.toString())) {
      console.log('Hint generation already in progress for session:', session._id);
      return {
        hint: 'Please wait, generating hint...',
        reasoning: 'Hint generation in progress',
        isCompleted: false,
        events: []
      };
    }

    // Mark this session as generating a hint
    generatingHints.add(session._id.toString());

    const recentHint = await TrainingEventModel.findOne(
      {
        session: session._id,
        type: 'hint',
        timestamp: { $gt: Date.now() - 10000 }
      },
      {},
      { sort: { timestamp: -1 } }
    );

    if (recentHint) {
      return {
        hint: recentHint.message,
        reasoning: 'Using cached hint',
        isCompleted: false,
        events: []
      };
    }

    // Get latest quest event (no time limit)
    const latestQuestEvent = await TrainingEventModel.findOne(
      {
        session: session._id,
        type: 'quest'
      },
      {},
      { sort: { timestamp: -1 } }
    );

    // Must have a quest to generate hints
    if (!latestQuestEvent) {
      console.log('No quest found for session:', session._id);
      return {
        hint: 'Please wait for quest to be generated...',
        reasoning: 'No active quest found',
        isCompleted: false,
        events: []
      };
    }

    currentQuest = latestQuestEvent.message;
    maxReward = latestQuestEvent.metadata?.maxReward || 0;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Current quest: ${currentQuest}
Previous hints: ${hintHistory.slice(-3).join(', ')}

Before providing any analysis, first verify if the image contains actual content:
- If the image is entirely or predominantly black/blank with no visible elements, immediately set "isCompleted" to false
- If you cannot clearly see any content in the image, set "isCompleted" to false

Validation checklist:
1. Can you clearly identify at least one interactive element in the screenshot?
2. Are there visible GUI components that indicate the user is in the correct application/screen?
3. Is there visible evidence of user interaction or progress toward the task?
If you answer "no" to any of these questions, set "isCompleted" to false.

First, analyze if the core task has been completed. Focus only on the main objectives - ignore artistic style, specific colors, or minor visual details. For drawing tasks, consider them complete if the basic shape/object is recognizable.

Compare the screenshot against what you would expect to see for a completed task. List specific elements you would expect to see, and verify their presence.

Then provide a single actionable hint (if needed) that includes one of these patterns if applicable:
- Type 'x[TAB]' to autocomplete
- Navigate the Gnome menu to find [target]
- Click the [specific Gnome element]
- Move cursor to [exact location]

If the image appears to be a black screen, include this specific hint: "I cannot see any content in your screenshot. Please ensure your screen is on and you've captured the correct window. Try pressing Alt+PrintScreen to capture only the active window."

Output as JSON with three fields:
1. "reasoning": Your analysis of what's been accomplished vs core requirements (ignore artistic details)
2. "isCompleted": Boolean based on basic task completion
3. "hint": A single sentence hint if not completed`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 250
    });

    const jsonMatch = response.choices[0].message.content?.match(/{[\s\S]*}/);
    let parsedResponse = { hint: '', reasoning: '', isCompleted: false };
    if (jsonMatch) {
      try {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Error parsing JSON from response:', e);
      }
    }

    // If quest is completed and no pending transaction, process reward
    if (parsedResponse.isCompleted && !pendingTransactions.has(session._id.toString())) {
      try {
        // Mark this session as having a pending transaction
        if (!session._id) {
          throw new Error('Session ID is missing');
        }
        pendingTransactions.add(session._id.toString());

        // Calculate actual reward
        const score = Math.random();
        const actualReward = Math.ceil(maxReward * score);

        // Create reward event without transfer
        const rewardEvent = {
          type: 'reward',
          message: `The judge rewarded you ${actualReward.toFixed(2)} $VIRAL for this (${(
            score * 100
          ).toFixed(0)}% of ${maxReward.toFixed(2)})`,
          session: session._id!,
          frame: 0,
          timestamp: Date.now(),
          metadata: {
            scoreValue: score,
            rewardValue: actualReward
          }
        };
        await DatabaseService.createTrainingEvent(rewardEvent);

        // Generate new quest
        console.log('Quest completed! Generating new quest...');
        const questData = await generateQuest(imageUrl, prompt, session);
        const questEvent = {
          type: 'quest',
          message: questData.quest,
          session: session._id!,
          frame: 0,
          timestamp: Date.now(),
          metadata: {
            maxReward: questData.maxReward,
            vm_id: latestQuestEvent.metadata?.vm_id,
            recording_id: latestQuestEvent.metadata?.recording_id
          }
        };
        await DatabaseService.createTrainingEvent(questEvent);

        // Clear pending transaction flag
        if (session._id) {
          pendingTransactions.delete(session._id.toString());
        }

        return {
          hint: parsedResponse.hint,
          reasoning: parsedResponse.reasoning,
          isCompleted: true,
          newQuest: questData.quest,
          maxReward: questData.maxReward,
          events: [rewardEvent, questEvent]
        };
      } catch (error) {
        // Clear pending transaction flag on error
        if (session._id) {
          pendingTransactions.delete(session._id.toString());
        }
        throw error;
      }
    } else if (parsedResponse.isCompleted) {
      // If quest is completed but transaction is pending, return special message
      return {
        hint: 'Processing reward... please wait',
        reasoning: 'Transaction in progress',
        isCompleted: false,
        events: []
      };
    }

    // Create hint and reasoning events
    const hintEvent = {
      type: 'hint',
      message: parsedResponse.hint || '(empty)',
      session: session._id,
      frame: 0,
      timestamp: Date.now()
    };
    await DatabaseService.createTrainingEvent(hintEvent);

    const reasoningEvent = {
      type: 'reasoning',
      message: parsedResponse.reasoning || '(empty)',
      session: session._id,
      frame: 0,
      timestamp: Date.now()
    };
    await DatabaseService.createTrainingEvent(reasoningEvent);

    return {
      hint: parsedResponse.hint,
      reasoning: parsedResponse.reasoning,
      isCompleted: false,
      events: [hintEvent, reasoningEvent]
    };
  } catch (error) {
    console.error('Error generating hint:', error);
    const fallbackHint = 'Navigate the Gnome Applications Menu to explore available tasks';

    if (!session._id) {
      throw new Error('Session ID is missing');
    }

    const errorEvent = {
      type: 'hint',
      message: fallbackHint,
      session: session._id,
      frame: 0,
      timestamp: Date.now()
    };
    await DatabaseService.createTrainingEvent(errorEvent);

    // Clear generating hint flag on error
    if (session._id) {
      generatingHints.delete(session._id.toString());
    }

    return {
      hint: fallbackHint,
      reasoning: 'Error occurred during analysis',
      isCompleted: false,
      events: [errorEvent]
    };
  }
}

// Helper function to stop a race session
export async function stopRaceSession(
  guacService: GuacamoleService,
  id: string
): Promise<{ success: boolean; totalRewards?: number }> {
  // Get the session first to check status
  const session = await DatabaseService.getRaceSession(id);
  if (!session) {
    throw new Error('Session not found');
  }

  const was_active = session.status === 'active';

  // Update session status
  const updatedSession = await DatabaseService.updateRaceSession(id, {
    status: 'expired',
    updated_at: new Date()
  });

  // Initialize total rewards
  let totalRewards = 0;

  // Only process rewards if session is active
  if (was_active) {
    // Get all reward events for this session
    const rewardEvents = await TrainingEventModel.find({
      session: id,
      type: 'reward',
      'metadata.rewardValue': { $exists: true }
    });

    // Kill active connections and remove permissions if session has credentials
    if (session.vm_credentials?.guacToken && session.vm_credentials?.guacConnectionId) {
      try {
        // Get active connections
        const activeConnectionsMap = await guacService.listActiveConnections(session.address);

        // Kill any active connections for this session
        for (const connection of Object.values(activeConnectionsMap)) {
          try {
            await guacService.killConnection(connection.identifier);
          } catch (error) {
            console.error('Error killing connection:', error);
          }
        }

        // Remove READ permission
        await guacService.removeReadPermission(
          session.address,
          session.vm_credentials.guacConnectionId
        );

        // remove user access to the VPS
        const instance = await DatabaseService.getGymVPS(session.vm_region);
        const vpsService = new GymVPSService({
          ip: instance.ip,
          username: instance.username,
          privateKey: instance.ssh_keypair.private
        });
        await vpsService.removeTrainer(session.vm_credentials?.username!);

        // save recording to s3 if we have a video path
        const sessionEvents = await TrainingEventModel.find({
          session: id
        }).sort({ timestamp: 1 }); // Sort by timestamp ascending
        if (sessionEvents.length > 0) {
          const recordingId = sessionEvents[0].metadata?.recording_id;

          if (recordingId) {
            const s3Service = new AWSS3Service(
              process.env.AWS_ACCESS_KEY,
              process.env.AWS_SECRET_KEY
            );
            console.log(`Uploading recording for session ${recordingId} to s3...`);
            // wrap this function so the user doesn't have to wait for this
            (async () => {
              await s3Service.saveItem({
                bucket: 'training-gym',
                file: `${guacService.recordingsPath}/${recordingId}`,
                name: `recording-${id}`
              });
              // delete recording
              await unlink(`${guacService.recordingsPath}/${recordingId}`);

              console.log('done.');
            })();
          }
        }
        // session cleanup done
      } catch (error) {
        console.log('Error cleaning up Guacamole session.');
        // parse axios errors because they're wildly long
        if (isAxiosError(error)) {
          handleAxiosError(error);
        } else {
          console.log(error);
        }
      }
    }

    // Calculate total rewards
    totalRewards = rewardEvents.reduce((sum, event) => {
      return sum + (event.metadata?.rewardValue || 0);
    }, 0);

    // If there are rewards, transfer the total amount
    if (totalRewards > 0) {
      // Transfer total rewards from treasury
      const signature = await treasuryService.transferFromTreasury(session.address, totalRewards);

      // Update session with transaction signature
      if (signature) {
        await DatabaseService.updateRaceSession(id, {
          transaction_signature: signature
        });
      }
    }
  }

  if (!updatedSession) {
    throw new Error('Failed to update session status');
  }

  // Return total rewards if session was active
  return {
    success: true,
    ...(was_active ? { totalRewards } : {})
  };
}

// Helper function to check if a race session is expired
export async function checkRaceExpiration(
  guacService: GuacamoleService,
  id: string
): Promise<boolean> {
  const session = await DatabaseService.getRaceSession(id);
  if (!session) return true;

  // Check if session is already expired
  if (session.status !== 'active') return true;

  const now = Date.now();
  const sessionAge = now - session.created_at!.getTime();
  const lastUpdateAge = now - session.updated_at!.getTime();

  // Expire if:
  // 1. Session is older than 15 minutes OR
  // 2. No updates in the last minute
  if (sessionAge > 15 * 60 * 1000 || lastUpdateAge > 60 * 1000) {
    await stopRaceSession(guacService, id);
    return true;
  }

  return false;
}
