using System.Net.WebSockets;
using System.Text.Json;

namespace radibate_backend;

public abstract class GameState
{
    public Game parentGame;

    public GameState(Game parentGame)
    {
        this.parentGame = parentGame;
    }
    public abstract Task PlayPhase();

    public abstract Task RecievePlayerMessage(IncomingGameMessage incomingMessage);

    public Task SendSnapshotToAllPlayers()
    {
        return Task.Run(() =>
        {
            try
            {
                foreach (Game.Player player in parentGame.playerList)
                {
                    _ = player.SendMessage(new OutgoingGameMessage(OutgoingGameMessage.MessageType.StanceSnapshot, GenerateGameSnapshot(player)));
                }
                _ = parentGame.SendMessageToHost(new OutgoingGameMessage(OutgoingGameMessage.MessageType.StanceSnapshot, GenerateGameSnapshot(null as Game.Player)));
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
            }
            
        }
        );
    }

    public async Task Act()
    {
        await PlayPhase();
        await End();
    }

    public Dictionary<string, string>? GenerateGameSnapshot(WebSocket socket)
    {
        if (parentGame.hostSocket == socket) return GenerateGameSnapshot(null as Game.Player);

        Game.Player? player = parentGame.GetPlayer(socket);
        if (player != null) return GenerateGameSnapshot(player);

        return null; // Player is not in game.
    }
    public abstract Dictionary<string, string> GenerateGameSnapshot(Game.Player? requestingPlayer); // If host requesting, requestingPlayer is null.
    public abstract Task End();

    // TODO: Add a "Show Results" state
    // TODO: Respond to player messages

    public class AwaitingPlayersPhase(Game parentGame) : GameState(parentGame)
    {
        public override Task End()
        {
            throw new NotImplementedException();
        }

        public override Dictionary<string, string> GenerateGameSnapshot(Game.Player? requestingPlayer)
        {
            Dictionary<string, string> gameSnapshot = new Dictionary<string, string>();
            gameSnapshot["phase"] = "waitingRoom";
            gameSnapshot["code"] = parentGame.roomCode;

            if (requestingPlayer == null)
            { // Host
                gameSnapshot["phase"] = "hostWaitingRoom";
                gameSnapshot["playerAmount"] = parentGame.playerList.Count.ToString();
            }
            else
            {
                gameSnapshot["playerNumber"] = requestingPlayer.playerNumber.ToString();
            }

            return gameSnapshot;
        }

        public override Task PlayPhase()
        {
            throw new NotImplementedException();
        }

        public override Task RecievePlayerMessage(IncomingGameMessage incomingMessage)
        {
            Console.WriteLine("[PHASE] Message recieved by AwaitingPlayersPhase!");
            switch (incomingMessage.messageType)
            {
                case IncomingGameMessage.MessageType.GameAction:
                    if (incomingMessage.requestingSocket == parentGame.hostSocket)
                    {
                        if (parentGame.playerList.Count >= 3)
                        {
                            Console.WriteLine("[GAME] Starting game...");
                            _ = parentGame.PlayRenardEdition();
                        }
                        else
                        {
                            Console.WriteLine("[GAME] Not enough players to start game!");
                            _ = parentGame.SendMessageToHost(new OutgoingGameMessage(OutgoingGameMessage.MessageType.InvalidRequest, "Not enough players!"));
                        }
                    }
                    else
                    {
                        Console.WriteLine("[GAME ERROR] Recieved game action during PlayerWaiting phase from a non-host!");
                    }
                    break;
                default:
                    Console.WriteLine("[GAME ERROR] Recieved incoming message during PlayerWaiting phase with invalid type!");
                    break;
            }
            
            return Task.CompletedTask;
        }
    }

    public class RenardRadicalRound(Game parentGame) : GameState(parentGame)
    {
        private StanceTakingPhase? stanceTakingPhase;
        private PublicDiscussionPhase? publicDiscussionPhase;
        public override async Task PlayPhase()
        {
            Console.WriteLine("[GAME] Setting up stancetaking phase...");
            stanceTakingPhase = new StanceTakingPhase(parentGame, parentGame.playerList);
            await stanceTakingPhase.PlayPhase();

            Console.WriteLine("[GAME] Setting up discussion phase...");
            publicDiscussionPhase = new PublicDiscussionPhase(parentGame);
            publicDiscussionPhase.setDiscussionTopic(stanceTakingPhase.discussionTopic);
            for (int i = 0; i < stanceTakingPhase.debaters.Length; i++)
            {
                publicDiscussionPhase.setDebaterInfo(stanceTakingPhase.debaters[i], stanceTakingPhase.positions[i]);
            }

            Task publicDiscussion = publicDiscussionPhase.PlayPhase();
            stanceTakingPhase = null;
            await publicDiscussion;
        }

        public override Task End()
        {
            // TODO
            return Task.CompletedTask;
        }

        public override async Task RecievePlayerMessage(IncomingGameMessage incomingMessage)
        {
            if (publicDiscussionPhase != null) await publicDiscussionPhase.RecievePlayerMessage(incomingMessage);
            else if (stanceTakingPhase != null) await stanceTakingPhase.RecievePlayerMessage(incomingMessage);
            else throw new NullReferenceException("All phases are null!");
        }

        public override Dictionary<string, string> GenerateGameSnapshot(Game.Player? requestingPlayer)
        {
            if (publicDiscussionPhase != null) return publicDiscussionPhase.GenerateGameSnapshot(requestingPlayer);
            else if (stanceTakingPhase != null) return stanceTakingPhase.GenerateGameSnapshot(requestingPlayer);
            else throw new NullReferenceException("All phases are null!");
        }
    }

    public class StanceTakingPhase : GameState
    {
        public string discussionTopic = "Discussion Topic Not Set!";
        public Game.Player[] debaters = new Game.Player[2];
        public string[] positions = new string[2];
        public Utils.CountdownTimer countdownTimer = new Utils.CountdownTimer(60);

        public StanceTakingPhase(Game parentGame, List<Game.Player> playersToPickFrom) : base(parentGame)
        {
            // Pick two random people from the Players to Pick From var.
            playersToPickFrom = [.. playersToPickFrom]; // Shallow clone.
            playersToPickFrom.Shuffle();

            Console.WriteLine("[DEBUG] Number of players in stancetaking phase is {0}", playersToPickFrom.Count);

            for (int i = 0; i < debaters.Length; i++)
            {
                debaters[i] = playersToPickFrom[i];
            }

            Console.WriteLine("[DEBUG] Selecting debate topic...");
            discussionTopic = GetRandomDebateTopic();
            Console.WriteLine("[DEBUG] Debate topic is: ", discussionTopic);
        }

        public async override Task PlayPhase()
        {
            Task countdownEnded = countdownTimer.StartAsync();
            Console.WriteLine($"[PHASE] Activated StanceTaking phase! Debaters are players: {string.Join(", ", debaters.Select(d => d.playerNumber))}");

            await SendSnapshotToAllPlayers();

            await countdownEnded;
        }

        public override Task End()
        {
            // TODO: Package the player info nice and neat for someone to get later.
            return Task.CompletedTask;
        }

        public static string GetRandomDebateTopic()
        {
            // Resolve the path relative to the application base directory
            string filePath = Path.Combine(AppContext.BaseDirectory, "assets", "questions.txt");

            Console.WriteLine($"[DEBUG] Attempting to read topic file from: {filePath}");

            try
            {
                if (!File.Exists(filePath))
                {
                    Console.WriteLine($"[ERROR] Debate topic file not found at: {filePath}");
                    return "ERROR: No topic file found.";
                }

                string[] allQuestions = File.ReadAllLines(filePath);

                if (allQuestions.Length == 0)
                {
                    Console.WriteLine($"[ERROR] Debate topic file at {filePath} is empty.");
                    return "ERROR: No topics available.";
                }

                string topic = allQuestions[Utils.rng.Next(allQuestions.Length)];
                Console.WriteLine($"[DEBUG] Selected topic: \"{topic}\"");
                return topic;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EXCEPTION] Failed to get debate topic from {filePath}: {ex.Message}");
                return "ERROR: Exception occurred while getting topic.";
            }
        }

        public override async Task RecievePlayerMessage(IncomingGameMessage incomingMessage)
        {
            switch (incomingMessage.messageType)
            {
                case IncomingGameMessage.MessageType.GameAction:
                    if (incomingMessage.messageContent == null)
                    {
                        Console.WriteLine("[GAME ERROR] Recieved GameAction with no contents!");
                        break;
                    }
                    if (incomingMessage.requestingSocket == null)
                    {
                        Console.WriteLine("[GAME ERROR] Recieved GameAction with no passed websocket!");
                        break;
                    }
                    Game.Player? actingPlayer = parentGame.GetPlayer(incomingMessage.requestingSocket);
                    if (actingPlayer == null)
                    {
                        Console.WriteLine("[GAME ERROR] Recieved GameAction from a player who's not in the game!");
                        break;
                    }
                    await takeGameAction(incomingMessage.messageContent, actingPlayer);
                    break;

                case IncomingGameMessage.MessageType.RequestStateInfo:
                    if (incomingMessage.requestingSocket == null)
                    {
                        // Host
                        await parentGame.SendMessageToHost(new OutgoingGameMessage(OutgoingGameMessage.MessageType.StanceSnapshot, GenerateGameSnapshot((Game.Player?)null)));
                    }
                    else
                    {
                        Game.Player? player = parentGame.GetPlayer(incomingMessage.requestingSocket);
                        if (player == null)
                        {
                            Console.WriteLine("[GAME ERROR] Recieved RequestStateInfo from a player who's not in the game!");
                            break;
                        }
                        await player.SendMessage(new OutgoingGameMessage(OutgoingGameMessage.MessageType.StanceSnapshot, GenerateGameSnapshot(player)));
                    }

                    break;

                default:
                    Console.WriteLine("[GAME] Client message invalid during StanceTakingPhase.");
                    break;
            }
        }

        private Task takeGameAction(Dictionary<string, string> action, Game.Player actingPlayer)
        {
            switch (action["action"])
            {
                case "inputStance":
                    int playerSpot = Array.IndexOf(debaters, actingPlayer);
                    if (playerSpot == -1)
                    {
                        Console.WriteLine("[GAME] Non-acting player tried to input opinion.");
                        break;
                    }

                    // If it's a valid stance, accept it.
                    if (IsAValidStance(action["stance"]))
                    {
                        positions[playerSpot] = action["stance"];

                        // Check if all players inputted their stances.
                        if (positions.All(IsAValidStance))
                        {
                            countdownTimer.Cancel();
                        }
                        else
                        {
                            // Should I do a better message for this?
                            _ = actingPlayer.SendMessage(new OutgoingGameMessage(OutgoingGameMessage.MessageType.StanceSnapshot, GenerateGameSnapshot(actingPlayer)));
                        }
                    }
                    else
                    {
                        //TODO: Handle player sending invalid or empty stance.
                    }

                    break;

                default:
                    Console.WriteLine("[GAME] Recieved GameAction with invalid action field.");
                    break;
            }

            return Task.CompletedTask;
        }

        public override Dictionary<string, string> GenerateGameSnapshot(Game.Player? requestingPlayer)
        {
            Dictionary<string, string> gameSnapshot = new Dictionary<string, string>();
            gameSnapshot["phase"] = "stanceTaking";
            gameSnapshot["type"] = "InvalidSnapshot"; // If this gets sent to the user something very wrong has occured.
            gameSnapshot["secondsLeft"] = countdownTimer.GetRemainingSeconds().ToString();

            if (requestingPlayer == null)
            {
                // Host message
                gameSnapshot["type"] = "host";
                gameSnapshot["debaters"] = String.Join(",", debaters.Select(n => n.playerNumber.ToString())); // TODO: Remove once new frontend complete.
                gameSnapshot["debatersWithNames"] = String.Join(",", debaters.Select(n => String.Format("({0},{1})", n.playerNumber.ToString(), n.username)));
            }
            else if (debaters.Contains(requestingPlayer))
            {
                // Debater
                if (string.IsNullOrWhiteSpace(positions[Array.IndexOf(debaters, requestingPlayer)]))
                {
                    gameSnapshot["type"] = "debaterStanceMissing";
                }
                else
                {
                    Console.WriteLine("[DEBUG] Position of player is - [" + positions[Array.IndexOf(debaters, requestingPlayer)] + "]");
                    gameSnapshot["type"] = "debaterStanceGiven";
                }
                gameSnapshot["question"] = discussionTopic;
            }
            else
            {
                // Random player
                gameSnapshot["type"] = "pickingPlayer";
            }

            return gameSnapshot;
        }

        // Returns whether the given stance fits the allowed stance parameters.
        public static bool IsAValidStance(string stance)
        {
            return !string.IsNullOrWhiteSpace(stance);
        }
    }

    public class PublicDiscussionPhase(Game parentGame) : GameState(parentGame)
    {
        private string discussionTopic = "Discussion Topic Not Set!";
        private Dictionary<Game.Player, string> debaterPositions = new Dictionary<Game.Player, string>();

        public Utils.CountdownTimer countdownTimer = new Utils.CountdownTimer(70);

        // Represents which player agrees with what stance, set to the relevant player's player number.
        // -1 means did not vote or abstained.
        private Dictionary<Game.Player, int> playerStances = [];

        public void setDiscussionTopic(string newDiscussionTopic)
        {
            discussionTopic = newDiscussionTopic;
        }

        // Sets data regarding the a debating player.
        public void setDebaterInfo(Game.Player debater, string position)
        {
            debaterPositions[debater] = position;
        }

        public async override Task PlayPhase()
        {
            Task countdownEnded = countdownTimer.StartAsync();

            await SendSnapshotToAllPlayers();

            await countdownEnded;
        }

        public override Task End()
        {
            // Gives each debater a score relative to the people who agreed with them.
            Dictionary<int, int> finalScores = new Dictionary<int, int>();

            foreach (Game.Player player in parentGame.playerList)
            {
                if (playerStances[player] >= 0)
                {
                    if (finalScores.ContainsKey(playerStances[player]))
                    {
                        finalScores[playerStances[player]]++;
                    }
                    else
                    {
                        finalScores[playerStances[player]] = 1;
                    }
                }
            }

            foreach (int playerNumber in finalScores.Keys)
            {
                Game.Player player = parentGame.GetPlayer(playerNumber)!;
                player.currentScore += finalScores[playerNumber];

            }

            return Task.CompletedTask;
        }

        public override async Task RecievePlayerMessage(IncomingGameMessage incomingMessage)
        {
            switch (incomingMessage.messageType)
            {
                case IncomingGameMessage.MessageType.GameAction:
                    if (incomingMessage.messageContent!["action"] == "inputSupport")
                    {
                        Game.Player player = parentGame.GetPlayer(incomingMessage.requestingSocket)!;
                        playerStances[player] = int.Parse(incomingMessage.messageContent["debater"]);
                        await parentGame.SendMessageToHost(new OutgoingGameMessage(OutgoingGameMessage.MessageType.GameUpdate, new Dictionary<string, string>
                        {
                            {"event", "movePlayerToPodium"},
                            { "playerToMove", player.playerNumber.ToString()},
                            {"targetPodium", incomingMessage.messageContent["debater"]}
                        }));
                    }
                    else
                    {
                        Console.WriteLine("[GAME] Client taken invalid action.");
                    }
                    break;
                case IncomingGameMessage.MessageType.RequestStateInfo:
                    // TODO: Send back relevant info for client.
                    break;
                default:
                    Console.WriteLine("[GAME] Client message invalid during StanceTakingPhase.");
                    break;
            }
        }

        public override Dictionary<string, string> GenerateGameSnapshot(Game.Player? requestingPlayer)
        {
            Dictionary<string, string> gameSnapshot = new Dictionary<string, string>();
            gameSnapshot["phase"] = "discussion";
            gameSnapshot["type"] = "InvalidSnapshot"; // If this gets sent to the user something very wrong has occured.
            gameSnapshot["question"] = discussionTopic;
            gameSnapshot["secondsLeft"] = countdownTimer.GetRemainingSeconds().ToString();

            if (requestingPlayer == null)
            {
                // TODO: Return data for host.
                gameSnapshot["type"] = "host";

                gameSnapshot["debaters"] = string.Join(",", debaterPositions.Keys.Select((player) => player.playerNumber));
                foreach (KeyValuePair<Game.Player, string> pair in debaterPositions)
                {
                    // TODO: Pass which players support this given debater. BUCKET THAT SHIT.
                    gameSnapshot["position" + pair.Key.playerNumber] = pair.Value;
                }

                List<int> undecidedPlayers = [];
                foreach (Game.Player player in parentGame.playerList) {
                    if (!debaterPositions.Keys.Contains(player)) undecidedPlayers.Add(player.playerNumber);
                }

                gameSnapshot["undecidedPlayers"] = string.Join(",", undecidedPlayers);
            }

            else if (debaterPositions.Keys.Contains(requestingPlayer))
            {
                // Return data for debaters.
                gameSnapshot["type"] = "debater";
                gameSnapshot["message"] = "Don't look at your phone, CONVINCE PEOPLE!";
                gameSnapshot["position"] = debaterPositions[requestingPlayer];
            }

            else
            {
                // TODO: Return data for players who need to pick.
                gameSnapshot["type"] = "pickingPlayer";
                gameSnapshot["debaters"] = string.Join(",", debaterPositions.Keys.Select((player) => player.playerNumber));
                foreach (KeyValuePair<Game.Player, string> pair in debaterPositions)
                {
                    // TODO: Pass which players support this given debater. BUCKET THAT SHIT.
                    gameSnapshot["position" + pair.Key.playerNumber] = pair.Value;
                }
            }

            return gameSnapshot;
        }
    }

    public class DisplayResultsPhase : GameState
    {
        List<Game.Player> leaderboard;

        public DisplayResultsPhase(Game parentGame) : base(parentGame)
        {
            leaderboard = new List<Game.Player>(parentGame.playerList); // Clone list
            leaderboard.OrderByDescending(x => x.currentScore);
        }

        public override Task End()
        {
            throw new NotImplementedException();
        }

        public override Dictionary<string, string> GenerateGameSnapshot(Game.Player? requestingPlayer)
        {
            Dictionary<string, string> gameSnapshot = new Dictionary<string, string>();
            gameSnapshot["phase"] = "gameEnd";
            gameSnapshot["type"] = "InvalidSnapshot"; // If this gets sent to the user something very wrong has occured.

            if (requestingPlayer != null)
            {
                gameSnapshot["type"] = "player";
                // TODO: Handle data for players.
            }
            else
            {
                gameSnapshot["type"] = "host";
                gameSnapshot["playersPoints"] = String.Join(",", leaderboard.Select((player) =>
                {
                    return String.Format("{0}|{1}|{2}", player.playerNumber, player.username, player.currentScore);
                }));
            }

            return gameSnapshot;
        }

        public override Task PlayPhase()
        {
            throw new NotImplementedException();
        }

        public override Task RecievePlayerMessage(IncomingGameMessage incomingMessage)
        {
            if (incomingMessage.requestingSocket != parentGame.hostSocket)
            {
                Console.WriteLine("[GAME] Recieved player message after game ended!");
            }
            else
            {
                // TODO: Handle requesting a new game.
            }

            return Task.CompletedTask;
        }
    }
}
