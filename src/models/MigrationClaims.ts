import mongoose, { Connection, Schema } from 'mongoose';
import { MigrationClaim } from '../types/index.ts';

export const migrationClaimsSchema = new mongoose.Schema<MigrationClaim>(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    solAddress: { type: String },
    originalBalance: { type: Number },
    ethAddress: { type: String },
    claimedAmount: { type: Number },
    solTransaction: { type: String, required: false },
    ethTransaction: { type: String, required: false },
    ogClaimStatus: {type: Boolean, default:false },
    claimedAt: { type: Number, required: false },
    ethFlowTriggered: { type: Boolean, default: false },
    meta: { type: Schema.Types.Mixed }
  },
  {
    collection: 'claims',
    timestamps: true
  }
);

export const MigrationClaimsModel = mongoose.model('MigrationClaims', migrationClaimsSchema);
export const MigrationClaimsModelFromConnection = (connection: Connection) => connection.model('MigrationClaims', migrationClaimsSchema);
