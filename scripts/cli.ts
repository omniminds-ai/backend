#!/usr/bin/env node
import { Command } from 'commander';
import { startTournament, concludeTournament, initializeTournament, initializeTournamentAccount } from './tournament.js';
import type { TournamentData } from './types.js';

const program = new Command();

program
  .name('tournament-cli')
  .description('CLI to manage Jailbreak tournaments')
  .version('1.0.0');

const init = new Command('init')
  .description('Initialize a new tournament in database')
  .requiredOption('-n, --name <name>', 'Tournament name')
  .option('-t, --title <title>', 'Tournament title')
  .option('-d, --description <description>', 'Tournament description')
  .option('-s, --system-prompt <prompt>', 'System prompt for the AI')
  .option('-m, --model <model>', 'AI model to use')
  .option('-c, --character-limit <limit>', 'Character limit per message')
  .option('-w, --characters-per-word <number>', 'Characters per word')
  .option('-x, --context-limit <limit>', 'Context limit')
  .option('-l, --chat-limit <limit>', 'Chat limit')
  .option('-p, --pool <amount>', 'Initial pool size in SOL')
  .option('-e, --entry-fee <amount>', 'Entry fee in SOL')
  .option('-f, --developer-fee <percentage>', 'Developer fee percentage')
  .option('--phrase <phrase>', 'Winning phrase')
  .option('--winning-prize <amount>', 'Winning prize amount')
  .option('--winning-message <message>', 'Winning message')
  .option('--custom-rules <rules>', 'Custom rules')
  .option('--tools-description <description>', 'Tools description')
  .option('--success-function <name>', 'Success function name')
  .option('--fail-function <name>', 'Fail function name')
  .option('--tool-choice <choice>', 'Tool choice mode')
  .option('--image <url>', 'Challenge image URL')
  .option('--pfp <url>', 'Profile picture URL')
  .option('--task <text>', 'Challenge task')
  .option('--label <text>', 'Challenge label')
  .option('--level <text>', 'Challenge level')
  .option('--start-date <date>', 'Start date')
  .option('--expiry <date>', 'Expiry date')
  .option('--disable <items>', 'Disabled features (comma-separated)')
  .action(async (options) => {
    const tournamentData: TournamentData = {
      name: options.name,
      title: options.title,
      description: options.description,
      system_message: options.systemPrompt,
      model: options.model,
      characterLimit: options.characterLimit ? parseInt(options.characterLimit) : undefined,
      charactersPerWord: options.charactersPerWord ? parseInt(options.charactersPerWord) : undefined,
      contextLimit: options.contextLimit ? parseInt(options.contextLimit) : undefined,
      chatLimit: options.chatLimit ? parseInt(options.chatLimit) : undefined,
      initial_pool_size: options.pool ? parseFloat(options.pool) : undefined,
      entryFee: options.entryFee ? parseFloat(options.entryFee) : undefined,
      developer_fee: options.developerFee ? parseInt(options.developerFee) : undefined,
      tools: [],
      tool_choice: options.toolChoice,
      phrase: options.phrase,
      winning_prize: options.winningPrize ? parseFloat(options.winningPrize) : undefined,
      winning_message: options.winningMessage,
      tools_description: options.toolsDescription,
      custom_rules: options.customRules,
      image: options.image,
      pfp: options.pfp,
      task: options.task,
      label: options.label,
      level: options.level,
      start_date: options.startDate ? new Date(options.startDate) : undefined,
      expiry: options.expiry ? new Date(options.expiry) : undefined,
      disable: options.disable ? options.disable.split(',') : undefined,
      success_function: options.successFunction,
      fail_function: options.failFunction
    };

    const result = await initializeTournament(tournamentData);
    
    if (result.success) {
      console.log('Tournament initialized successfully');
      console.log(result.tournament);
    } else {
      console.error('Failed to initialize tournament:', result.error);
    }
  });

const initAccount = new Command('init-account')
  .description('Initialize tournament account on-chain')
  .action(async () => {
    const result = await initializeTournamentAccount();
    
    if (result.success) {
      console.log('Tournament account initialized successfully');
      console.log('Transaction signature:', result.signature);
      console.log('Tournament PDA:', result.tournamentPDA);
    } else {
      console.error('Failed to initialize tournament account:', result.error);
    }
  });

const start = new Command('start')
  .description('Start a tournament')
  .requiredOption('-n, --name <name>', 'Tournament name')
  .action(async (options) => {
    const result = await startTournament(options.name);
    
    if (result.success) {
      console.log('Tournament started successfully');
      console.log('Transaction signature:', result.signature);
      console.log('Tournament PDA:', result.tournamentPDA);
    } else {
      console.error('Failed to start tournament:', result.error);
    }
  });

const conclude = new Command('conclude')
  .description('Conclude a tournament')
  .requiredOption('-n, --name <name>', 'Tournament name')
  .requiredOption('-w, --winner <address>', 'Winner\'s wallet address')
  .action(async (options) => {
    const result = await concludeTournament(options.name, options.winner);
    
    if (result.success) {
      console.log('Tournament concluded successfully');
      console.log('Transaction signature:', result.signature);
    } else {
      console.error('Failed to conclude tournament:', result.error);
    }
  });

program.addCommand(init);
program.addCommand(initAccount);
program.addCommand(start);
program.addCommand(conclude);

program.parse();
