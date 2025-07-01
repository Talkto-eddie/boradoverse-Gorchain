use anchor_lang::prelude::*;
use crate::constants::BOARDOVERSE_SEED;
use crate::states::*;
use crate::error::*;

pub fn create_game(
    ctx: Context<CreateGame>, 
    game_id: String, 
    bet_amount: u64, 
    arbiter: Pubkey
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player1 = &ctx.accounts.player1;
    
    // Initialize game state
    game.game_id = game_id.clone();
    game.player1 = player1.key();
    game.player2 = Pubkey::default(); // Will be set when player2 joins
    game.arbiter = arbiter;
    game.bet_amount = bet_amount;
    game.total_pot = bet_amount;
    game.status = GameStatus::WaitingForPlayer2;
    game.winner = None;
    game.bump = ctx.bumps.game;
    
    // Validate bet amount
    require!(bet_amount > 0, BoardoverseError::InvalidBetAmount);
    
    // Transfer bet amount from player1 to game account
    let transfer_instruction = anchor_lang::system_program::Transfer {
        from: player1.to_account_info(),
        to: game.to_account_info(),
    };
    
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(), 
            transfer_instruction
        ),
        bet_amount,
    )?;

    msg!("Game created with ID: {}, bet amount: {} lamports, waiting for player 2", game_id, bet_amount);
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct CreateGame<'info> {
    #[account(
        init,
        payer = player1,
        space = 8 + Game::INIT_SPACE,
        seeds = [BOARDOVERSE_SEED, game_id.as_bytes()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub player1: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
