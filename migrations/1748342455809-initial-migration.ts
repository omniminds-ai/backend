import * as Models from '../src/models/Models.ts';// Import your schemas here
import  { Connection } from 'mongoose'
import { generateAllSeedData } from './seedData.ts';

export async function up (conn: Connection): Promise<void> {

  const seedData = generateAllSeedData()
  await Models.ChallengeModelFromConnection(conn).create(seedData.challenges)
  await Models.ChatModelFromConnection(conn).create(seedData.chats)
  await Models.ForgeAppModelFromConnection(conn).create(seedData.forgeApps)
  await Models.ForgeRaceModelFromConnection(conn).create(seedData.forgeRaces)
  await Models.ForgeRaceSubmissionModelFromConnection(conn).create(seedData.forgeRaceSubmissions)
  await Models.GymSessionModelFromConnection(conn).create(seedData.gymSessions)
  await Models.GymVpsModelFromConnection(conn).create(seedData.gymVPSInstances)
  await Models.PagesModelFromConnection(conn).create(seedData.pages)
  await Models.RaceModelFromConnection(conn).create(seedData.races)
  await Models.RaceSessionModelFromConnection(conn).create(seedData.raceSessions)
  await Models.TrainingEventModelFromConnection(conn).create(seedData.trainingEvents)
  await Models.TrainingPoolModelFromConnection(conn).create(seedData.trainingPools)
  await Models.UserModelFromConnection(conn).create(seedData.users)
  await Models.WalletConnectionModelFromConnection(conn).create(seedData.walletConnections)
}

export async function down (connection: Connection): Promise<void> {
  // Write migration here
}
