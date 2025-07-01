use anchor_lang::prelude::*;

#[error_code]
pub enum BoardoverseError{
    #[msg("Insufficient funds in token account")]
    InsufficientFunds,
    
    #[msg("Invalid bet amount")]
    InvalidBetAmount,
    
    #[msg("Game is not waiting for player 2")]
    GameNotWaitingForPlayer2,
    
    #[msg("Game is already full")]
    GameAlreadyFull,
    
    #[msg("Cannot play against yourself")]
    CannotPlayAgainstSelf,
    
    #[msg("Unauthorized arbiter")]
    UnauthorizedArbiter,
    
    #[msg("Game is not in progress")]
    GameNotInProgress,
    
    #[msg("Invalid winner")]
    InvalidWinner,
    
    #[msg("Unauthorized player")]
    UnauthorizedPlayer,
    
    #[msg("Cannot stop game that is in progress")]
    CannotStopInProgressGame,
    
    #[msg("Game is already finished")]
    GameAlreadyFinished,
}