export interface MigrationClaim {
  _id?: string;
  solAddress: string;
  ethAddress: string;
  originalBalance: number;
  claimedAmount: number;
  claimedAt: number;
  solTransaction?: string | null;
  ethTransaction?: string | null;
  ogClaimStatus: boolean;
  ethFlowTriggered: boolean;
  meta: any
}