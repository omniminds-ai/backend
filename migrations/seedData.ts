import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';
import { ForgeSubmissionProcessingStatus,VPSRegion, TrainingPoolStatus,UploadLimitType } from '../src/types';

// Challenge seed data generator
export function generateChallenge() {
  return {
    _id: faker.string.uuid(),
    title: faker.lorem.words(3),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
    image: faker.image.url(),
    pfp: faker.image.avatar(),
    task: faker.lorem.sentence(),
    label: faker.word.words(2),
    level: faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced', 'expert']),
    status: faker.helpers.arrayElement(['active', 'inactive', 'completed']),
    model: faker.helpers.arrayElement(['gpt-4', 'claude-3', 'gemini-pro']),
    system_message: faker.lorem.paragraph(),
    deployed: faker.datatype.boolean(),
    tournamentPDA: faker.string.alphanumeric(44),
    idl: {
      version: faker.system.semver(),
      name: faker.word.noun(),
      instructions: faker.lorem.words(10)
    },
    entryFee: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
    characterLimit: faker.number.int({ min: 100, max: 5000 }),
    charactersPerWord: faker.number.int({ min: 4, max: 8 }),
    contextLimit: faker.number.int({ min: 1000, max: 10000 }),
    chatLimit: faker.number.int({ min: 10, max: 100 }),
    max_actions: faker.number.int({ min: 5, max: 50 }),
    expiry: faker.date.future(),
    initial_pool_size: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
    developer_fee: faker.number.float({ min: 0.01, max: 0.1, fractionDigits: 4 }),
    tools: faker.helpers.arrayElements(['search', 'calculator', 'translator', 'image_gen'], { min: 1, max: 3 }),
    fee_multiplier: faker.number.float({ min: 1, max: 5, fractionDigits: 2 }),
    prize: faker.number.float({ min: 50, max: 5000, fractionDigits: 2 }),
    usdPrize: faker.number.float({ min: 50, max: 5000, fractionDigits: 2 }),
    winning_message: faker.lorem.sentence(),
    phrase: faker.lorem.words(3),
    winning_prize: faker.number.float({ min: 100, max: 10000, fractionDigits: 2 }),
    tools_description: faker.lorem.paragraph(),
    custom_rules: faker.lorem.paragraph(),
    disable: faker.helpers.arrayElements(['copy', 'paste', 'external_links'], { min: 0, max: 2 }),
    success_function: faker.lorem.sentence(),
    fail_function: faker.lorem.sentence(),
    tool_choice: faker.helpers.arrayElement(['auto', 'none', 'required']),
    start_date: faker.date.recent(),
    expiry_logic: faker.helpers.arrayElement(['score', 'time']),
    scores: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () => ({
      account: faker.string.alphanumeric(32),
      address: faker.finance.ethereumAddress(),
      score: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
      timestamp: faker.date.recent()
    })),
    game: faker.word.noun(),
    game_ip: faker.internet.ip(),
    stream_src: faker.internet.url(),
    whitelist: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => ({
      username: faker.internet.username(),
      address: faker.finance.ethereumAddress(),
      viral_balance: faker.number.float({ min: 0, max: 10000, fractionDigits: 2 }),
      signature: faker.string.alphanumeric(128)
    }))
  };
}

// Chat seed data generator
export function generateChat() {
  return {
    challenge: faker.string.uuid(),
    model: faker.helpers.arrayElement(['gpt-4', 'claude-3', 'gemini-pro']),
    role: faker.helpers.arrayElement(['user', 'assistant', 'system']),
    content: faker.lorem.paragraph(),
    tool_calls: {
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['function', 'retrieval']),
      function: {
        name: faker.word.verb(),
        arguments: JSON.stringify({ query: faker.lorem.words(3) })
      }
    },
    address: faker.finance.ethereumAddress(),
    display_name: faker.person.fullName(),
    txn: faker.string.alphanumeric(64),
    verified: faker.datatype.boolean(),
    date: faker.date.recent(),
    screenshot: {
      url: faker.image.url()
    }
  };
}

// ForgeApp seed data generator
export function generateForgeApp() {
  return {
    name: faker.company.name(),
    domain: faker.internet.domainName(),
    description: faker.lorem.paragraph(),
    categories: faker.helpers.arrayElements(['ai', 'blockchain', 'gaming', 'defi', 'nft'], { min: 1, max: 3 }),
    pool_id: new Types.ObjectId(),
    tasks: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
      prompt: faker.lorem.sentence(),
      uploadLimit: faker.number.int({ min: 1, max: 100 }),
      rewardLimit: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 })
    }))
  };
}

// ForgeRace seed data generator
export function generateForgeRace() {
  return {
    title: faker.lorem.words(4),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['creative', 'technical', 'gaming', 'research']),
    icon: faker.helpers.arrayElement(['🏆', '🎯', '🚀', '⚡', '🎨']),
    skills: faker.helpers.arrayElements(['javascript', 'python', 'react', 'blockchain', 'ai'], { min: 2, max: 4 }),
    agent_prompt: faker.lorem.paragraph(),
    pool_id: new Types.ObjectId()
  };
}

// ForgeRaceSubmission seed data generator
export function generateForgeRaceSubmission() {
  return {
    _id: faker.string.uuid(),
    address: faker.finance.ethereumAddress(),
    meta: {
      title: faker.lorem.words(3),
      description: faker.lorem.sentence(),
      tags: faker.helpers.arrayElements(['ai', 'blockchain', 'web3'], { min: 1, max: 3 })
    },
    status: faker.helpers.arrayElement(Object.values(ForgeSubmissionProcessingStatus)),
    files: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
      file: faker.system.fileName(),
      s3Key: faker.string.alphanumeric(32),
      size: faker.number.int({ min: 1024, max: 10485760 }) // 1KB to 10MB
    })),
    grade_result: faker.datatype.boolean() ? {
      summary: faker.lorem.paragraph(),
      score: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
      reasoning: faker.lorem.paragraph()
    } : undefined,
    error: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    reward: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
    maxReward: faker.number.float({ min: 500, max: 2000, fractionDigits: 2 }),
    clampedScore: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    treasuryTransfer: faker.datatype.boolean() ? {
      tokenAddress: faker.finance.ethereumAddress(),
      treasuryWallet: faker.finance.ethereumAddress(),
      amount: faker.number.float({ min: 1, max: 1000, fractionDigits: 2 }),
      timestamp: faker.date.recent().getTime(),
      txHash: faker.string.alphanumeric(64)
    } : undefined
  };
}

// GymSession seed data generator
export function generateGymSession() {
  return {
    _id: new Types.ObjectId(),
    address: faker.finance.ethereumAddress(),
    status: faker.helpers.arrayElement(['active', 'completed', 'expired']),
    preview: faker.image.dataUri({ type: 'svg-base64' }),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent()
  };
}

// GymVPS seed data generator
export function generateGymVPS() {
  return {
    id: faker.string.uuid(),
    ip: faker.internet.ip(),
    region: faker.helpers.arrayElement(Object.values(VPSRegion)),
    username: faker.internet.username(),
    ssh_keypair: {
      public: faker.string.alphanumeric(256),
      private: faker.string.alphanumeric(1024)
    },
    users: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
      username: faker.internet.username(),
      password: faker.internet.password()
    }))
  };
}

// Page seed data generator
export function generatePage() {
  return {
    name: faker.lorem.words(2),
    content: {
      title: faker.lorem.words(4),
      body: faker.lorem.paragraphs(3),
      metadata: {
        author: faker.person.fullName(),
        created: faker.date.recent(),
        tags: faker.helpers.arrayElements(['news', 'tutorial', 'guide', 'update'], { min: 1, max: 3 })
      }
    }
  };
}

// Race seed data generator
export function generateRace() {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.words(4),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['creative', 'mouse', 'slacker', 'gaming', 'wildcard']),
    icon: faker.helpers.arrayElement(['trophy', 'star', 'medal', 'crown']),
    colorScheme: faker.helpers.arrayElement(['pink', 'blue', 'purple', 'orange', 'indigo', 'emerald']),
    prompt: faker.lorem.paragraph(),
    reward: faker.number.float({ min: 10, max: 1000, fractionDigits: 2 }),
    buttonText: faker.helpers.arrayElement(['Join Race', 'Start Challenge', 'Enter Competition']),
    stakeRequired: faker.datatype.boolean() ? faker.number.float({ min: 1, max: 100, fractionDigits: 2 }) : undefined
  };
}

// RaceSession seed data generator
export function generateRaceSession() {
  return {
    _id: new Types.ObjectId(),
    address: faker.finance.ethereumAddress(),
    challenge: faker.string.uuid(),
    prompt: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['creative', 'mouse', 'slacker', 'gaming', 'wildcard']),
    vm_ip: faker.internet.ip(),
    vm_port: faker.number.int({ min: 1000, max: 65535 }),
    vm_password: faker.internet.password(),
    vm_region: faker.helpers.arrayElement(Object.values(VPSRegion)),
    vm_credentials: {
      guacToken: faker.string.alphanumeric(32),
      guacConnectionId: faker.string.uuid(),
      guacClientId: faker.string.uuid(),
      username: faker.internet.username(),
      password: faker.internet.password()
    },
    status: faker.helpers.arrayElement(['active', 'completed', 'expired']),
    video_path: faker.system.filePath(),
    preview: faker.image.dataUri({ type: 'svg-base64' }),
    created_at: faker.date.recent(),
    updated_at: faker.date.recent(),
    transaction_signature: faker.string.alphanumeric(88),
    stream_id: faker.string.uuid()
  };
}

// TrainingEvent seed data generator
export function generateTrainingEvent() {
  return {
    session: faker.string.uuid(),
    type: faker.helpers.arrayElement([
      'task', 'mouse', 'keyboard', 'scroll', 'system',
      'hint', 'quest', 'error', 'reasoning', 'reward'
    ]),
    message: faker.lorem.sentence(),
    frame: faker.number.int({ min: 0, max: 10000 }),
    timestamp: faker.number.int({ min: 0, max: 300000 }), // 5 minutes max
    coordinates: {
      x: faker.number.int({ min: 0, max: 1920 }),
      y: faker.number.int({ min: 0, max: 1080 })
    },
    trajectory: Array.from({ length: faker.number.int({ min: 5, max: 20 }) }, () => ({
      x: faker.number.int({ min: 0, max: 1920 }),
      y: faker.number.int({ min: 0, max: 1080 }),
      timestamp: faker.number.int({ min: 0, max: 1000 }),
      velocity: {
        x: faker.number.float({ min: -100, max: 100, fractionDigits: 2 }),
        y: faker.number.float({ min: -100, max: 100, fractionDigits: 2 }),
        magnitude: faker.number.float({ min: 0, max: 141, fractionDigits: 2 })
      },
      acceleration: {
        x: faker.number.float({ min: -50, max: 50, fractionDigits: 2 }),
        y: faker.number.float({ min: -50, max: 50, fractionDigits: 2 }),
        magnitude: faker.number.float({ min: 0, max: 71, fractionDigits: 2 })
      }
    })),
    created_at: faker.date.recent(),
    metadata: {
      browser: faker.internet.userAgent(),
      resolution: `${faker.number.int({ min: 1024, max: 3840 })}x${faker.number.int({ min: 768, max: 2160 })}`,
      sessionId: faker.string.uuid()
    }
  };
}

// TrainingPool seed data generator
export function generateTrainingPool() {
  return {
    name: faker.company.name(),
    status: faker.helpers.arrayElement(Object.values(TrainingPoolStatus)),
    demonstrations: faker.number.int({ min: 0, max: 1000 }),
    funds: faker.number.float({ min: 0, max: 100000, fractionDigits: 2 }),
    pricePerDemo: faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
    token: {
      type: faker.helpers.arrayElement(['SOL', 'VIRAL', 'CUSTOM']),
      symbol: faker.helpers.arrayElement(['SOL', 'VIRAL', 'USDC', 'ETH']),
      address: faker.finance.ethereumAddress()
    },
    skills: faker.lorem.words(5),
    ownerEmail: faker.internet.email(),
    ownerAddress: faker.finance.ethereumAddress(),
    depositAddress: faker.finance.ethereumAddress(),
    depositPrivateKey: faker.string.alphanumeric(64),
    uploadLimit: {
      type: faker.number.int({ min: 1, max: 100 }),
      limitType: faker.helpers.arrayElement(Object.values(UploadLimitType))
    }
  };
}

// User seed data generator
export function generateUser() {
  return {
    api_key: faker.string.alphanumeric(32),
    address: faker.finance.ethereumAddress(),
    date_created: faker.date.past()
  };
}

// WalletConnection seed data generator
export function generateWalletConnection() {
  return {
    token: faker.string.alphanumeric(32),
    address: faker.finance.ethereumAddress(),
    nickname: faker.datatype.boolean() ? faker.person.firstName() : undefined,
    createdAt: faker.date.recent()
  };
}

// Utility function to generate multiple records
export function generateMultiple<T>(generator: () => T, count: number): T[] {
  return Array.from({ length: count }, generator);
}

export function generateAllSeedData() {
  try {
    // Generate all seed data
    const seedData = {
      challenges: generateMultiple(generateChallenge, 10),
      chats: generateMultiple(generateChat, 50),
      forgeApps: generateMultiple(generateForgeApp, 5),
      forgeRaces: generateMultiple(generateForgeRace, 8),
      forgeRaceSubmissions: generateMultiple(generateForgeRaceSubmission, 25),
      gymSessions: generateMultiple(generateGymSession, 15),
      gymVPSInstances: generateMultiple(generateGymVPS, 3),
      pages: generateMultiple(generatePage, 12),
      races: generateMultiple(generateRace, 20),
      raceSessions: generateMultiple(generateRaceSession, 30),
      trainingEvents: generateMultiple(generateTrainingEvent, 100),
      trainingPools: generateMultiple(generateTrainingPool, 7),
      users: generateMultiple(generateUser, 40),
      walletConnections: generateMultiple(generateWalletConnection, 60)
    };

    console.log('Seed data generated successfully:');
    Object.entries(seedData).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.length} records`);
    });

    return seedData;
  } catch (error) {
    console.error('Error generating seed data:', error);
    throw error;
  }
}