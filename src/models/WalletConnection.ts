import mongoose, { Connection } from 'mongoose';
import { DBWalletConnection } from '../types/db.ts';

const walletConnectionSchema = new mongoose.Schema<DBWalletConnection>(
  {
    token: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    nickname: { type: String, required: false },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // Expire after 1 hour
  },
  { collection: 'wallet_connections' }
);

export const WalletConnectionModel = mongoose.model<DBWalletConnection>('WalletConnection',  walletConnectionSchema);
export const WalletConnectionModelFromConnection = (connection: Connection) => connection.model('WalletConnection', walletConnectionSchema);
