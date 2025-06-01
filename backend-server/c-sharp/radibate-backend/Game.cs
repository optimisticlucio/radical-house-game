using System;
using System.Net.WebSockets;

namespace radibate_backend;

public class Game
{
    public WebSocket hostSocket;
    public List<Player> playerList = [];
    public GameState? currentGamePhase;

    public Game(WebSocket hostSocket)
    {
        this.hostSocket = hostSocket;
    }

    public Player? GetPlayer(WebSocket targetWebSocket)
    {
        return playerList.Find(x => x.webSocket == targetWebSocket);
    }

    // TODO: Do an actual game loop

    public class Player
    {
        public string username = "USERNAME_NOT_SET";
        public int currentScore = 0;
        public int playerNumber = -1;
        public WebSocket? webSocket;

        public Player(string username)
        {
            this.username = username;
        }
    }
}