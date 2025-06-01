using System;
using System.Net.WebSockets;
using System.Text;

namespace radibate_backend;

public class Game
{
    public WebSocket hostSocket;
    public CancellationToken hostCancellationToken;
    public List<Player> playerList = [];
    public GameState currentGamePhase;

    public string roomCode;

    public Game(string roomCode, WebSocket hostSocket, CancellationToken hostCancellationToken)
    {
        this.hostSocket = hostSocket;
        this.hostCancellationToken = hostCancellationToken;
        currentGamePhase = new GameState.AwaitingPlayersPhase(this);
        this.roomCode = roomCode;
    }

    public Player? GetPlayer(WebSocket targetWebSocket)
    {
        return playerList.Find(x => x.webSocket == targetWebSocket);
    }

    public async Task SendMessageToHost(OutgoingGameMessage message)
    {
        await hostSocket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(message.ToString())), WebSocketMessageType.Text, true, hostCancellationToken);
    }

    public async Task PlayRenardEdition()
    {
        const int TOTAL_ROUNDS = 1;

        for (int i = 0; i < TOTAL_ROUNDS; i++)
        {
            currentGamePhase = new GameState.RenardRadicalRound(this);
            await currentGamePhase.Act();
        }

        currentGamePhase = new GameState.DisplayResultsPhase(this);
        _ = currentGamePhase.SendSnapshotToAllPlayers();
    }

    // TODO: Do an actual game loop

    public class Player
    {
        public string username = "USERNAME_NOT_SET";
        public int currentScore = 0;
        public int playerNumber = -1;
        public WebSocket? webSocket;

        public CancellationToken? token;

        public Player(string username)
        {
            this.username = username;
        }

        public async Task SendMessage(OutgoingGameMessage message)
        {
            if (webSocket == null)
            {
                Console.WriteLine("[Player] Tried to send message over closed socket!!");
            }
            else
            {
                await webSocket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(message.ToString())), WebSocketMessageType.Text, true, token ?? CancellationToken.None);
            }
        }
    }
}