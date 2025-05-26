using System;

namespace radibate_backend;

public abstract class GameState
{
    public required Game parentGame;

    public GameState(Game parentGame)
    {
        this.parentGame = parentGame;
    }
    public abstract void PlayPhase();
    public abstract void End();

    public class PublicDiscussionPhase : GameState
    {
        public PublicDiscussionPhase(Game parentGame) : base(parentGame) {}
    }
}
