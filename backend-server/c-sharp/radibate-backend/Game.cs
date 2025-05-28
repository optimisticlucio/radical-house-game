using System;

namespace radibate_backend;

public class Game
{
    public List<Player> playerList = [];
    public GameState? currentGamePhase;

    public class Player
    {
        public string username = "USERNAME_NOT_SET";
        public int currentScore = 0;

        public Player(string username)
        {
            this.username = username;
        }
    }
}