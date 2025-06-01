using System;
using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Collections.Concurrent;

namespace radibate_backend;

public class SessionManager
{
    public static string ServerAddress = "http://127.0.0.1:8080/";
    private readonly HttpListener httpListener = new();
    private readonly ConcurrentDictionary<string, GameInfo> gameSessions = new();
    private CancellationTokenSource? cts;

    public Task Start()
    {
        httpListener.Prefixes.Add(ServerAddress);
        httpListener.Start();
        cts = new CancellationTokenSource();
        Console.WriteLine($"[Server] Listening on {ServerAddress}");

        return AcceptConnectionsAsync(cts.Token);
    }

    public void Stop()
    {
        cts?.Cancel();
        httpListener.Stop();
        Console.WriteLine("[Server] Stopped.");
    }

    private async Task AcceptConnectionsAsync(CancellationToken token)
    {
        try
        {
            while (!token.IsCancellationRequested)
            {
                HttpListenerContext context = await httpListener.GetContextAsync();

                // Only accept WebSocket upgrade requests
                if (context.Request.IsWebSocketRequest)
                    _ = Task.Run(() => HandleWebSocketClientAsync(context, token), token);
                else
                {
                    context.Response.StatusCode = 400;
                    context.Response.Close();
                }
            }
        }
        catch (HttpListenerException) { } // Listener closed
        catch (Exception ex)
        {
            Console.WriteLine($"[Server] Error: {ex.Message}");
        }
    }

    private async Task HandleWebSocketClientAsync(HttpListenerContext context, CancellationToken token)
    {
        WebSocket webSocket = null!;
        string clientId = Guid.NewGuid().ToString();

        try
        {
            WebSocketContext wsContext = await context.AcceptWebSocketAsync(null);
            webSocket = wsContext.WebSocket;
            Console.WriteLine($"[Connection] Client {clientId} connected.");

            // Step 1: handshake
            if (!await PerformHandshakeAsync(webSocket, token))
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.PolicyViolation, "Invalid handshake", token);
                Console.WriteLine($"[Connection] Client {clientId} failed handshake.");
                return;
            }

            Console.WriteLine($"[Connection] Client {clientId} passed handshake.");

            // Step 2: game loop
            await GameSessionLoopAsync(webSocket, token);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Connection] Error: {ex.Message}");
        }
        finally
        {
            if (webSocket != null)
                webSocket.Dispose();

            Console.WriteLine($"[Connection] Client {clientId} disconnected.");
        }
    }

    private async Task<bool> PerformHandshakeAsync(WebSocket socket, CancellationToken token)
    {
        var buffer = new byte[1024];
        var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);

        string msg = Encoding.UTF8.GetString(buffer, 0, result.Count).Trim();
        Console.WriteLine($"[Handshake] Received: {msg}");

        if (msg == "HELLO GAME")
        {
            var response = Encoding.UTF8.GetBytes("WELCOME\n");
            await socket.SendAsync(new ArraySegment<byte>(response), WebSocketMessageType.Text, true, token);
            return true;
        }
        else
        {
            var response = Encoding.UTF8.GetBytes("INVALID HANDSHAKE\n");
            await socket.SendAsync(new ArraySegment<byte>(response), WebSocketMessageType.Text, true, token);
            return false;
        }
    }

    private async Task GameSessionLoopAsync(WebSocket socket, CancellationToken token)
    {
        async Task sendMessageOverSocket(OutgoingGameMessage message)
        {
            await SendMessageOverSocket(socket, token, message);
        }

        var buffer = new byte[1024];
        GameInfo? gameUserIsConnectedTo = null;

        while (!token.IsCancellationRequested && socket.State == WebSocketState.Open)
        {
            var result = await socket.ReceiveAsync(new ArraySegment<byte>(buffer), token);

            if (result.MessageType == WebSocketMessageType.Close)
            {
                await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Goodbye", token);
                break;
            }

            string msg = Encoding.UTF8.GetString(buffer, 0, result.Count).Trim();
            Console.WriteLine($"[Game] Received message: {msg}");

            IncomingGameMessage incomingClientMessage = IncomingGameMessage.ParseIncomingRequest(msg);
            switch (incomingClientMessage.messageType)
            {
                case IncomingGameMessage.MessageType.CreateGame:
                    if (gameUserIsConnectedTo != null)
                    {
                        // User is in a game.
                        await sendMessageOverSocket(new OutgoingGameMessage(OutgoingGameMessage.MessageType.InvalidRequest, "Client cannot create new game while in a game."));
                        continue;
                    }
                    gameUserIsConnectedTo = StartNewGame(socket, token);
                    await gameUserIsConnectedTo!.Game!.currentGamePhase.SendSnapshotToAllPlayers();
                    break;

                case IncomingGameMessage.MessageType.ConnectToGame:
                    if (gameUserIsConnectedTo != null)
                    {
                        // User is in a game.
                        await sendMessageOverSocket(new OutgoingGameMessage(OutgoingGameMessage.MessageType.InvalidRequest, "Client cannot join a game while already in one."));
                        continue;
                    }
                    // TODO: Handle case
                    break;

                case IncomingGameMessage.MessageType.GameAction:
                    if (gameUserIsConnectedTo == null)
                    {
                        // User is not connected.
                        await sendMessageOverSocket(new OutgoingGameMessage(OutgoingGameMessage.MessageType.InvalidRequest, "Client cannot take a game action without being in a game."));
                        continue;
                    }
                    // TODO: Handle case
                    break;

                default: 
                    await sendMessageOverSocket(new OutgoingGameMessage(OutgoingGameMessage.MessageType.InvalidRequest, "Invalid request type recieved."));
                    Console.WriteLine("[SessionManager] Recieved invalid request type.");
                    break;
            }
        }
    }

    static async Task SendMessageOverSocket(WebSocket socket, CancellationToken token,  OutgoingGameMessage message)
    {
        await socket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(message.ToString())), WebSocketMessageType.Text, true, token);
    }

    // Starts and registers a new game session
    GameInfo StartNewGame(WebSocket hostSocket, CancellationToken cancellationToken)
    {
        GameInfo newGame = new();

        while (!gameSessions.TryAdd(newGame.SessionKey, newGame))
        {
            newGame.GenerateSessionKey(); // ensure no duplicate keys
        }

        newGame.StartGame(hostSocket, cancellationToken);
        return newGame;
    }

    public class GameInfo
    {
        public Game? Game { get; private set; }
        public string SessionKey { get; private set; }

        public GameInfo()
        {
            SessionKey = GenerateSessionKey();
        }

        // Creates a random key for the session, and returns it. Does not assure uniqueness.
        public string GenerateSessionKey()
        {
            if (Game != null)
                throw new Exception("Tried to generate new key for active game.");

            SessionKey = Utils.rng.Next(0, 1000000).ToString();
            return SessionKey;
        }

        public void StartGame(WebSocket socket, CancellationToken cancelToken)
        {
            if (Game != null)
                throw new Exception("Game already started.");

            Game = new Game(socket, cancelToken);
        }
    }
}
