use anchor_lang::prelude::*;
use crate::constants::BOARDOVERSE_SEED;
use crate::states::*;
use crate::error::*;


#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct DeclareWinner<'info> {
    #[account(
        mut,
        seeds = [BOARDOVERSE_SEED, game_id.as_bytes()],
        bump = game.bump,
        close = arbiter
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub arbiter: Signer<'info>,
    
    /// CHECK: This account is validated in the instruction logic
    #[account(mut)]
    pub player1: AccountInfo<'info>,
    
    /// CHECK: This account is validated in the instruction logic
    #[account(mut)]
    pub player2: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}


pub fn declare_winner(ctx: Context<DeclareWinner>, winner: Pubkey, _game_id: String) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let arbiter = &ctx.accounts.arbiter;
    
    // Validate arbiter authorization
    require!(arbiter.key() == game.arbiter, BoardoverseError::UnauthorizedArbiter);
    
    // Validate game state
    require!(game.status == GameStatus::InProgress, BoardoverseError::GameNotInProgress);
    
    // Validate winner is one of the players
    require!(
        winner == game.player1 || winner == game.player2, 
        BoardoverseError::InvalidWinner
    );
    
    // Update game state
    game.winner = Some(winner);
    game.status = GameStatus::Finished;
    
    // Determine winner account
    let winner_account = if winner == game.player1 {
        &ctx.accounts.player1
    } else {
        &ctx.accounts.player2
    };
    
    // Transfer total pot to winner
    let total_pot = game.total_pot;
    
    **game.to_account_info().try_borrow_mut_lamports()? -= total_pot;
    **winner_account.to_account_info().try_borrow_mut_lamports()? += total_pot;
    
    // Reset total pot since funds have been transferred
    game.total_pot = 0;

    msg!(
        "Winner declared for game {}: {}, prize: {} lamports", 
        game.game_id, 
        winner, 
        total_pot
    );
    
    Ok(())
}
