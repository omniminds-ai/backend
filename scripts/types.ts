export interface Tool {
  type: string;
  function: {
    name: string;
    description: string;
  };
}

export interface TournamentData {
  name: string;
  title: string;
  description: string;
  system_message: string;
  model?: string;
  characterLimit?: number;
  contextLimit?: number;
  chatLimit?: number;
  initial_pool_size?: number;
  entryFee?: number;
  developer_fee?: number;
  tools?: Tool[];
  phrase?: string;
  winning_prize?: number;
  winning_message?: string;
  tools_description?: string;
  custom_rules?: string;
  image?: string;
  pfp?: string;
  task?: string;
  label?: string;
  level?: string;
  win_condition?: string;
  start_date?: Date;
  expiry?: Date;
  charactersPerWord?: number;
  disable?: string[];
  success_function?: string;
  fail_function?: string;
  tool_choice?: string;
  deployed?: boolean;
  tournamentPDA?: string;
  idl?: any;
  status?: string;
}

export interface TournamentResult {
  success: boolean;
  signature?: string;
  tournamentPDA?: string;
  error?: string;
  tournament?: any;
}

export interface SolanaContext {
  program: any;
  wallet: {
    publicKey: any;
  };
}
