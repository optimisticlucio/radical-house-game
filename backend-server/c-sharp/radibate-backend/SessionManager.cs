using System;
using System.Collections.Concurrent; // Thread-safe dictionary
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace radibate_backend;


public class SessionManager
{
    // IP and port to bind the server to (localhost and port 8080)
    public static string ServerIPAddress = "127.0.0.1";
    public static int ServerPort = 8080;

    private TcpListener? server; // Listens for TCP connections
    private readonly ConcurrentDictionary<string, GameInfo> gameSessions = new(); // Safe to use across threads
    private CancellationTokenSource? cancellationTokenSource; // Used to stop the server cleanly

    public void Start()
    {
        // Bind the server to the IP and port
        server = new TcpListener(IPAddress.Parse(ServerIPAddress), ServerPort);
        server.Start();
        cancellationTokenSource = new CancellationTokenSource();

        Console.WriteLine($"[Server] Listening on {ServerIPAddress}:{ServerPort}.");

        // Start listening for clients in the background (non-blocking)
        _ = ListenForConnectionsAsync(cancellationTokenSource.Token);
    }

    public void Stop()
    {
        // Tell the server to stop accepting new connections
        cancellationTokenSource?.Cancel();
        server?.Stop();
        Console.WriteLine("[Server] Stopped.");
    }

    // Accepts new clients in a loop, one by one
    private async Task ListenForConnectionsAsync(CancellationToken token)
    {
        if (server == null)
            throw new InvalidOperationException("Server not initialized.");

        try
        {
            while (!token.IsCancellationRequested)
            {
                // Accept client connection (waits here until one arrives)
                TcpClient client = await server.AcceptTcpClientAsync(token);

                // Start handling the new client in a separate Task/thread
                _ = Task.Run(() => HandleClientAsync(client, token), token);
            }
        }
        catch (OperationCanceledException)
        {
            Console.WriteLine("[Server] Listener cancelled.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Server] Unexpected error: {ex.Message}");
        }
    }

    // Handles a single client: does handshake, then talks to GameManager
    private async Task HandleClientAsync(TcpClient client, CancellationToken token)
    {
        using (client) // Automatically clean up the connection after done
        {
            // Try to get the IP address of the client
            string? clientIP = (client.Client.RemoteEndPoint as IPEndPoint)?.Address.ToString();
            Console.WriteLine($"[Connection] New client connected: {clientIP}");

            NetworkStream stream = client.GetStream(); // Low-level read/write stream

            // Step 1: handshake — check if client is legit
            if (!await PerformHandshakeAsync(stream, token))
            {
                Console.WriteLine($"[Connection] Client {clientIP} failed handshake.");
                return;
            }

            Console.WriteLine($"[Connection] Client {clientIP} passed handshake.");

            // Step 2: register the session
            var session = new GameInfo { ClientId = clientIP ?? "Unknown" };
            gameSessions[session.ClientId] = session;

            // Step 3: hand control to game session handler
            await GameSessionLoopAsync(session, stream, token);

            // Step 4: cleanup
            gameSessions.TryRemove(session.ClientId, out _);
            Console.WriteLine($"[Connection] Client {clientIP} disconnected.");
        }
    }

    // Very basic handshake — just checks if the client sends a specific message
    private async Task<bool> PerformHandshakeAsync(NetworkStream stream, CancellationToken token)
    {
        try
        {
            byte[] buffer = new byte[1024];

            // Wait for data from the client (blocks until message or disconnect)
            int byteCount = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), token);
            string handshakeMsg = Encoding.UTF8.GetString(buffer, 0, byteCount).Trim();

            Console.WriteLine($"[Handshake] Received: {handshakeMsg}");

            // Expect the client to say "HELLO GAME"
            if (handshakeMsg == "HELLO GAME")
            {
                byte[] response = Encoding.UTF8.GetBytes("WELCOME\n");
                await stream.WriteAsync(response.AsMemory(), token);
                return true;
            }
            else
            {
                byte[] response = Encoding.UTF8.GetBytes("INVALID HANDSHAKE\n");
                await stream.WriteAsync(response.AsMemory(), token);
                return false;
            }
        }
        catch
        {
            return false;
        }
    }

    // Placeholder game session logic; right now it just echoes back messages
    private async Task GameSessionLoopAsync(GameInfo session, NetworkStream stream, CancellationToken token)
    {
        byte[] buffer = new byte[1024];

        try
        {
            while (!token.IsCancellationRequested)
            {
                int bytesRead = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), token);

                if (bytesRead == 0) break; // Client disconnected

                string message = Encoding.UTF8.GetString(buffer, 0, bytesRead).Trim();

                Console.WriteLine($"[Game] From {session.ClientId}: {message}");

                // Echo back the received message with an ACK
                string reply = $"ACK: {message}\n";
                byte[] response = Encoding.UTF8.GetBytes(reply);
                await stream.WriteAsync(response.AsMemory(), token);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Game] Error with {session.ClientId}: {ex.Message}");
        }
    }


    GameInfo StartNewGame()
    {
        GameInfo newGameSession = new GameInfo();

        // Check if we have no duplication of session keys.
        while (gameSessions.ContainsKey(newGameSession.SessionKey))
        {
            newGameSession.GenerateSessionKey();
        }

        //gameSessions.Add(newGameSession.SessionKey, newGameSession); //TODO: FIX!

        newGameSession.StartGame();

        return newGameSession;
    }

    public class GameInfo
    {
        // Placeholder for actual game session information
        public string ClientId { get; set; } = "";
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
            {
                throw new Exception("Generated new session key for a game in progress!");
            }
            SessionKey = GlobalData.random.Next(0, 1000000).ToString();
            return SessionKey;
        }

        public void StartGame()
        {
            if (Game != null)
            {
                throw new Exception("Attempted to overwrite game in progress!");
            }
            Game = new Game();
        }
    }
}
