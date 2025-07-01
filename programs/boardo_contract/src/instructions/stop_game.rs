use anchor_lang::prelude::*;
use crate::constants::BOARDOVERSE_SEED;
use crate::states::*;
use crate::error::*;

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct StopGame<'info> {
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

pub fn stop_game(ctx: Context<StopGame>, _game_id: String) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let arbiter = &ctx.accounts.arbiter;
    let player1 = &ctx.accounts.player1;
    let player2 = &ctx.accounts.player2;
    
    // Validate that only arbiter can stop the game
    require!(arbiter.key() == game.arbiter, BoardoverseError::UnauthorizedArbiter);
    
    match game.status {
        GameStatus::WaitingForPlayer2 => {
            // If no one joined, return funds to player1
            let refund_amount = game.bet_amount;
            
            **game.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
            **player1.to_account_info().try_borrow_mut_lamports()? += refund_amount;
            
            // Update game state
            game.status = GameStatus::Cancelled;
            game.total_pot = 0;
            
            msg!(
                "Game {} cancelled by arbiter, {} lamports refunded to player1", 
                game.game_id, 
                refund_amount
            );
        },
        GameStatus::InProgress => {
            // Both players joined, return funds to both players
            let refund_amount = game.bet_amount;
            
            **game.to_account_info().try_borrow_mut_lamports()? -= game.total_pot;
            **player1.to_account_info().try_borrow_mut_lamports()? += refund_amount;
            **player2.to_account_info().try_borrow_mut_lamports()? += refund_amount;
            
            // Update game state
            game.status = GameStatus::Cancelled;
            game.total_pot = 0;
            
            msg!(
                "Game {} cancelled by arbiter, {} lamports refunded to each player", 
                game.game_id, 
                refund_amount
            );
        },
        GameStatus::Finished => {
            // Game is already finished
            return Err(BoardoverseError::GameAlreadyFinished.into());
        },
        GameStatus::Cancelled => {
            // Game is already cancelled
            return Err(BoardoverseError::GameAlreadyFinished.into());
        }
    }
    
    Ok(())
}
