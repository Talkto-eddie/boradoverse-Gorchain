use anchor_lang::prelude::*;
use crate::constants::BOARDOVERSE_SEED;
use crate::states::*;
use crate::error::*;


#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct JoinGame<'info> {
    #[account(
        mut,
        seeds = [BOARDOVERSE_SEED, game_id.as_bytes()],
        bump = game.bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub player2: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}


pub fn join_game(ctx: Context<JoinGame>, _game_id: String) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let player2 = &ctx.accounts.player2;
    
    // Validate game state
    require!(game.status == GameStatus::WaitingForPlayer2, BoardoverseError::GameNotWaitingForPlayer2);
    require!(game.player2 == Pubkey::default(), BoardoverseError::GameAlreadyFull);
    require!(player2.key() != game.player1, BoardoverseError::CannotPlayAgainstSelf);
    
    // Set player2 and update game state
    game.player2 = player2.key();
    game.total_pot += game.bet_amount;
    game.status = GameStatus::InProgress;
    
    // Transfer bet amount from player2 to game account
    let transfer_instruction = anchor_lang::system_program::Transfer {
        from: player2.to_account_info(),
        to: game.to_account_info(),
    };
    
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(), 
            transfer_instruction
        ),
        game.bet_amount,
    )?;

    msg!(
        "Player 2 joined game ID: {}, total pot: {} lamports", 
        game.game_id, 
        game.total_pot
    );
    
    Ok(())
}
