use anchor_lang::{prelude::*, solana_program};

declare_id!("AJsNVAr3m5wGLwY9bALRDsX9zeg9VvDJNCAHnpgUwpoc");

pub mod instructions;
pub use instructions::*;

pub mod states;
pub  use states::*;

pub mod error;
pub use error::*;

pub mod constants;

#[program]
pub mod boardo_contract {
    use super::*;

    pub fn create_game(
        ctx: Context<CreateGame>, 
        game_id: String, 
        bet_amount: u64, 
        arbiter: Pubkey
    ) -> Result<()> {
        instructions::create_game(ctx, game_id, bet_amount, arbiter)
    }
    
    pub fn join_game(
        ctx: Context<JoinGame>,
        _game_id: String
    ) -> Result<()> {
        instructions::join_game(ctx, _game_id)
    }
    
    pub fn declare_winner(
        ctx: Context<DeclareWinner>,
        winner: Pubkey,
        _game_id: String
    ) -> Result<()> {
        instructions::declare_winner(ctx, winner, _game_id)
    }
    
    pub fn stop_game(
        ctx: Context<StopGame>,
        _game_id: String
    ) -> Result<()> {
        instructions::stop_game(ctx, _game_id)
    }
}
