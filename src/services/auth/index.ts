import { WalletConnectionModel } from '../../models/Models.ts';

// Function to get address from connect token (for use in routes)
export async function getAddressFromToken(token: string): Promise<string | null> {
  if (!token) return null;
  const connection = await WalletConnectionModel.findOne({ token });
  return connection?.address || null;
}
