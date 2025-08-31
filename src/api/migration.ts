import { errorHandlerAsync } from '../middleware/errorHandler.ts';
import { successResponse } from '../middleware/types/errors.ts';
import {
  validateParams,
  ValidationRules
} from '../middleware/validator.ts';
import express, { Router, Request, Response } from 'express';
import { MigrationClaimsModel } from '../models/MigrationClaims.js'
import BlockchainService from '../services/blockchain/index.ts';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  createTransferInstruction, getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';

const CUTOFF_EPOCH = 1756674000;
const AMM_PAIR = "B1hrW94y9oh4YDmnUDqzUcyorhXYFXwNfPSLMcwoJ7uj"
const OMNIS_MINTADDRESS = "G6iRK8kN67HJFrPA1CDA5KZaPJMiBu3bqdd9vdKBpump"
const router: Router = express.Router();
const blockchainService = new BlockchainService("https://mainnet.helius-rpc.com/?api-key=68d9e5b6-9df3-4727-9185-b5673617fd3b", '');//process.env.SOLANA_RPC_URL

router.get(
  '/:claimId/status',
  validateParams({ claimId: { required: true } }),
  errorHandlerAsync(async (req: Request, res: Response) => {
    const { claimId } = req.params;
    const claim = await MigrationClaimsModel.findOne({_id: claimId});
    if(!claim) {
      res.status(404).send("Claim not found");
    }

    res.status(200).json(successResponse({
      ogClaimDone: claim?.ogClaimStatus,
      ethTransaction: claim?.ethTransaction,
      ethFlowTriggered: claim?.ethFlowTriggered
    }));
  })
);

// get wallet address for token
router.get(
  '/balance/:address',
  validateParams({ address: { required: true, rules: [ValidationRules.isSolanaAddress()] } }),
  errorHandlerAsync(async (req: Request, res: Response) => {
    const { address } = req.params;
    res.status(200).json(successResponse(await getEligibleBalance(address)));
  })
);

router.get(
  '/:solAddress/to/:ethAddress',
  validateParams({ solAddress: { required: true, rules: [ValidationRules.isSolanaAddress()] }, ethAddress: { required: true, rules: [ValidationRules.isEthereumAddress()] } }),
  errorHandlerAsync(async (req: Request, res: Response) => {
    const { solAddress, ethAddress } = req.params;

    const validDate = new Date();
    //Subtract 5 minutes from the current date
    validDate.setDate(validDate.getDate() - 1);
    const yesterday = Math.floor(validDate.getTime() / 1000)

    const existingClaims = await  MigrationClaimsModel
      .find( {solAddress, ethAddress,  claimedAt: {$gt: yesterday} })
      .sort({ claimedAt: -1 });


    if(existingClaims && existingClaims[0] && existingClaims[0].solTransaction) {
      const existingClaim = existingClaims[0]
      //Claim processed from the solana side
      console.log("should return and exit")
      res.status(200).json(successResponse(
        {
          claimExists: true,
          claimId: existingClaim._id,
          claimedAmount: existingClaim.claimedAmount,
          solTransaction: existingClaim.solTransaction,
          ethTransaction: existingClaim.ethTransaction,
          ogClaimDone: existingClaim.ogClaimStatus,
        }))

      return;
    }

    const { eligibleBalance, walletBalance } = await getEligibleBalance(solAddress)
    const message= getMigrationMessage(eligibleBalance, ethAddress);
    const claimsDestination = "62TsurAEV9LFf7HbsS8HS1JRbbnyEXiHvLwMfsmXE5VT"
    const solAmount = 0.025;

    const { transaction, sourceTokenAccountAddress, destinationTokenAccountAddress, tokenDecimals} = await createMigrationTransaction(
      solAddress,
      solAmount,
      claimsDestination,
      eligibleBalance,
      OMNIS_MINTADDRESS,
      claimsDestination,
      message,
    );

    const meta = {
      solTransaction: {
        success: true,
        solanaWalletAddress: solAddress,
        ethWalletAddress: ethAddress,
        solTransfer: {
          from: solAddress,
          to: claimsDestination,
          amount: solAmount
        },
        tokenTransfer: {
          from: sourceTokenAccountAddress,
          to: destinationTokenAccountAddress,
          mint: OMNIS_MINTADDRESS,
          amount: eligibleBalance,
          decimals: tokenDecimals
        },
        messageSigning: {
          message: message,
        }
      }
    };

    const claim = await MigrationClaimsModel.create({
      meta,
      solAddress: solAddress,
      ethAddress: ethAddress,
      originalBalance: walletBalance,
      claimedAmount: eligibleBalance,
      claimedAt: (new Date()).getTime(),
    })

    const serializedTx = transaction.serialize({ requireAllSignatures: false });
    res.status(200).json(successResponse({ transaction: serializedTx.toString('base64'), claimId: claim._id}));
  })
);


async function getEligibleBalance(walletAddress: string) : Promise<{ walletBalance: number, eligibleBalance:number }> {
  const walletBalance = await blockchainService.getTokenBalance(process.env.OMNIS_TOKEN || '', walletAddress);
  const postCutOffBuysTotal = await getPostCutOffBuys(walletAddress, OMNIS_MINTADDRESS, AMM_PAIR, CUTOFF_EPOCH);
  console.log({walletBalance, postCutOffBuysTotal});
  return {walletBalance, eligibleBalance: walletBalance -  postCutOffBuysTotal};
}


router.post(
  '/:claimId/validateTransaction',
  validateParams({ claimId: { required: true } }),
  errorHandlerAsync(async (req: Request, res: Response) => {
    const { transactionHash } = req.body;
    const { claimId } = req.params;

    sleep(3000);

    if(!transactionHash) {
      return res.status(20).send("Bad Request: No Tx hash found.");
    }

    const tx = await blockchainService.getTransaction(transactionHash);

    if(!tx) {
      return res.status(200).send({success: false, message: "Can't find Transaction"});
    }
    const validDate = new Date();
    //Subtract 5 minutes from the current date
    validDate.setMinutes(validDate.getMinutes() - 5);

    if(!tx.blockTime || tx.blockTime <  Math.floor(validDate.getTime() / 1000)) {
      return res.status(400).send({success: false, message: "Transaction too old" });
    }

    const newclaim = await MigrationClaimsModel.findOneAndUpdate(
      {_id: claimId},
      {solTransaction: transactionHash},
      {new :true}
    )

    //trigger Eth claim as a background process

    return res.status(200).send({success: true, transactionHash});
  }));

router.post(
  '/:claimId/triggerEthFlow',
  validateParams({ claimId: { required: true } }),
  errorHandlerAsync(async (req: Request, res: Response) => {
    const { claimId } = req.params;
    try {
      const claim = await MigrationClaimsModel.findOne({ _id: claimId })

      if (!claim ) {
        return res.status(200).send({ success: false, message: "Can't find Claim" });
      }

      if(!claim.ethFlowTriggered) {
        claim.ethFlowTriggered = true;

        //trigger eth flow
        await claim.save()
      }
      return res.status(200).send({ success: true });
    } catch (error) {
      return res.status(200).send({ success: false })
    }
  }));

async function getPostCutOffBuys(walletAddress: string, token: string, ammPair: string, cutoff: number) : Promise<number> {
  try {
    const response  = await fetch(`https://api.helius.xyz/v0/addresses/${walletAddress}/transactions/?api-key=68d9e5b6-9df3-4727-9185-b5673617fd3b`)
    const transfers : {
      timestamp : number,
      type: string,
      tokenTransfers: {
        fromUserAccount : string,
        toUserAccount : string,
        tokenAmount: number,
        mint: string
      }[]
    }[] = await response.json();


    return transfers.reduce((a, c) => {
     if(c.timestamp > cutoff) {
       a += c.tokenTransfers.reduce((tokens, transfer) => {
         if(transfer.fromUserAccount == ammPair && transfer.toUserAccount == walletAddress && transfer.mint == token) {
           tokens += transfer.tokenAmount;
         }
         return tokens;
       }, 0);
     }
     return a;
    },0)
  } catch(error) {
    throw new Error("Failed querying balance movements" + error)
  }
}


function getMigrationMessage(eligibleTokenBalance: number, ethWalletAddress: string) : string {
  return `I approve of migrating ${eligibleTokenBalance} from my wallet and confirm that I have access to the ETH Wallet ${ethWalletAddress} to receive my ERC-20 tokens on. I understand this action is irrevocable.`
}

async function createMigrationTransaction(
  walletAddress: string| PublicKey,
  solAmount : number,
  solDestination: string | PublicKey,
  tokenAmount: number,
  tokenMintAddress: string | PublicKey,
  tokenDestination: string | PublicKey,
  message: string) : Promise<{transaction: Transaction, sourceTokenAccountAddress : string, destinationTokenAccountAddress: string, tokenDecimals :number}> {
  try {
    // Convert string addresses to PublicKey objects if needed
    const solDestPubkey = typeof solDestination === 'string'
      ? new PublicKey(solDestination)
      : solDestination;

    const tokenMintPubkey = typeof tokenMintAddress === 'string'
      ? new PublicKey(tokenMintAddress)
      : tokenMintAddress;

    const tokenDestPubkey = typeof tokenDestination === 'string'
      ? new PublicKey(tokenDestination)
      : tokenDestination;

    const walletPublicKey = typeof walletAddress === 'string'
      ? new PublicKey(walletAddress)
      : walletAddress;

    console.log('🔨 Creating transaction with multiple operations...');

    // Create a new transaction
    const transaction = new Transaction();

    // ========================================
    // 1. SOL TRANSFER INSTRUCTION
    // ========================================
    console.log(`💰 Adding SOL transfer: ${solAmount} SOL to ${solDestPubkey.toString()}`);

    const solTransferInstruction = SystemProgram.transfer({
      fromPubkey: walletPublicKey,
      toPubkey: solDestPubkey,
      lamports: Math.floor(solAmount * LAMPORTS_PER_SOL) // Convert SOL to lamports
    });

    transaction.add(solTransferInstruction);

    // ========================================
    // 2. SPL TOKEN TRANSFER INSTRUCTION
    // ========================================
    console.log(`🪙 Adding SPL token transfer: ${tokenAmount} tokens to ${tokenDestPubkey.toString()}`);

    // Get or create associated token account for the payer (source)
    const sourceTokenAddress = await getAssociatedTokenAddress (
      tokenMintPubkey,
      // For browser wallets, we can't directly pay fees in this function
      // The wallet will handle fee payment during signing
      walletPublicKey, // payer - will be handled by wallet,
      false, // allowOwnerOffCurve
    );

    // Get or create associated token account for the destination
    const destinationTokenAddress = await getAssociatedTokenAddress(
      tokenMintPubkey,
      tokenDestPubkey, // payer - will be handled by wallet
      false
    );

    let decimals = 6;
    console.log(`   Token decimals: ${decimals}`);

    // Calculate token amount with decimals
    const tokenAmountWithDecimals = Math.floor(tokenAmount * Math.pow(10, decimals));

    // Note: The transfer function from @solana/spl-token returns a transaction signature,
    // but we need the instruction. Let's create it manually instead.
    const manualTokenTransferInstruction = createTransferInstruction(
      sourceTokenAddress, // Source
      destinationTokenAddress, // Destination
      walletPublicKey, // Owner
      tokenAmountWithDecimals, // Amount
      [], // Multisigners (empty for single signer)
      TOKEN_PROGRAM_ID // Token program
    );

    transaction.add(manualTokenTransferInstruction);

    // ========================================
    // 3. MESSAGE MEMO INSTRUCTION
    // ========================================
    console.log(`✍️  Adding message to transaction: "${message}"`);

    // Add message as memo instruction (included in the transaction)
    const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(message, 'utf8')
    });

    transaction.add(memoInstruction);

    const latestBlockHash= await  blockchainService.getLatestBlockHash();
    transaction.recentBlockhash = latestBlockHash;
    transaction.feePayer = walletPublicKey;

    const sourceTokenAccountAddress = sourceTokenAddress.toString();
    const destinationTokenAccountAddress = destinationTokenAddress.toString();

    return {
      transaction,
      sourceTokenAccountAddress,
      destinationTokenAccountAddress,
      tokenDecimals: decimals
    };

  } catch (error) {
    console.error('❌ Transaction failed:', error);
    throw error;
  }
}


function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { router as tokenMigrationApi };
