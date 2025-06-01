using System;
using System.Net.WebSockets;

namespace radibate_backend;

public class Game
{
    public List<Player> playerList = [];
    public GameState? currentGamePhase;

    public Player? GetPlayer(WebSocket targetWebSocket)
    {
        return playerList.Find(x => x.webSocket == targetWebSocket);
    }

    // TODO: Do an actual game loop

    public class Player
    {
        public string username = "USERNAME_NOT_SET";
        public int currentScore = 0;

        public WebSocket? webSocket;

        public Player(string username)
        {
            this.username = username;
        }
    }
}