using System;
using System.Net.WebSockets;
using System.Text;

namespace radibate_backend;

public class Game
{
    public const int MAX_PLAYERS = 8;
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

    public async Task addNewPlayer(WebSocket newPlayerSocket, CancellationToken newPlayerToken)
    {
        Player newPlayer = new Player("USERNAMES_NOT_HANDLED_YET", newPlayerSocket, newPlayerToken);
        playerList.Add(newPlayer);

        // Give player an unused player number.
        for (int i = playerList.Count; i > 0; i--) {
            if (playerList.Find((item) => item.playerNumber == i) == null)
            {
                newPlayer.playerNumber = i;
                break;
            }
        }

            OutgoingGameMessage notifyAboutNewPlayer = new OutgoingGameMessage(
                OutgoingGameMessage.MessageType.GameUpdate,
                new Dictionary<string, string>()
                {
                {"event", "playerJoin"},
                {"username", newPlayer.username},
                {"playerNum", newPlayer.playerNumber.ToString()},
                {"totalPlayers", playerList.Count.ToString()}
                });
        await SendMessageToHost(notifyAboutNewPlayer);
        await newPlayer.SendMessage(new OutgoingGameMessage(OutgoingGameMessage.MessageType.StanceSnapshot, currentGamePhase.GenerateGameSnapshot(newPlayer)));
    }

    // Removes the player with the given socket from the game.
    public async Task disconnectPlayer(WebSocket playerSocket)
    {
        Player? player = GetPlayer(playerSocket);
        if (player == null)
        {
            Console.WriteLine("[ERROR!] Tried disconnecting a player who's not in the game. ");
            return;
        }
        playerList.Remove(player);
        
        OutgoingGameMessage notifyAboutPlayerLeaving = new OutgoingGameMessage(
                OutgoingGameMessage.MessageType.GameUpdate,
                new Dictionary<string, string>()
                {
                {"event", "playerLeft"},
                {"username", player.username},
                {"playerNum", player.playerNumber.ToString()},
                {"totalPlayers", playerList.Count.ToString()}
                });
        await SendMessageToHost(notifyAboutPlayerLeaving);
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
        public Player(string username, WebSocket webSocket, CancellationToken cancellationToken)
        {
            this.username = username;
            this.webSocket = webSocket;
            this.token = cancellationToken;
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