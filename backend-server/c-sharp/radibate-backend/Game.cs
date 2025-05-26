using System;

namespace radibate_backend;

public class Game
{
    List<Player> playerList;
    GameState currentGamePhase;

    public class Player
    {
        String username = "USERNAME_NOT_SET";
        int currentScore = 0;
    }
}