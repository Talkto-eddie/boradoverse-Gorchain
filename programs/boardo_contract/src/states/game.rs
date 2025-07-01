use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Game {
    #[max_len(32)]            
    pub game_id: String,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub arbiter: Pubkey,
    pub bet_amount: u64,
    pub total_pot: u64,
    pub status: GameStatus,
    pub winner: Option<Pubkey>,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum GameStatus {
    WaitingForPlayer2,
    InProgress,
    Finished,
    Cancelled,
}
