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
            foreach (Game.Player player in parentGame.playerList)
            {
                _ = player.SendMessage(new OutgoingGameMessage(OutgoingGameMessage.MessageType.StanceSnapshot, JsonSerializer.Serialize(GenerateGameSnapshot(player).ToString())));
            }
            _ = parentGame.SendMessageToHost(new OutgoingGameMessage(OutgoingGameMessage.MessageType.StanceSnapshot, JsonSerializer.Serialize(GenerateGameSnapshot(null as Game.Player).ToString())));
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
            throw new NotImplementedException();
        }
    }

    public class RenardRadicalRound(Game parentGame) : GameState(parentGame)
    {
        private StanceTakingPhase? stanceTakingPhase;
        private PublicDiscussionPhase? publicDiscussionPhase;
        public override async Task PlayPhase()
        {
            stanceTakingPhase = new StanceTakingPhase(parentGame, parentGame.playerList);
            await stanceTakingPhase.PlayPhase();

            publicDiscussionPhase = new PublicDiscussionPhase(parentGame);
            publicDiscussionPhase.setDiscussionTopic(stanceTakingPhase.discussionTopic);
            for (int i = 0; i < stanceTakingPhase.debaters.Length; i++)
            {
                publicDiscussionPhase.setDebaterInfo(i, stanceTakingPhase.debaters[i], stanceTakingPhase.positions[i]);
            }

            Task publicDiscussion = publicDiscussionPhase.PlayPhase();
            stanceTakingPhase = null;
            await publicDiscussion;
        }

        public override async Task End()
        {
            // TODO
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
        public Utils.CountdownTimer countdownTimer = new Utils.CountdownTimer(30);

        public StanceTakingPhase(Game parentGame, List<Game.Player> playersToPickFrom) : base(parentGame)
        {
            // Pick two random people from the Players to Pick From var.
            playersToPickFrom = [.. playersToPickFrom]; // Shallow clone.
            playersToPickFrom.Shuffle();

            for (int i = 0; i < debaters.Length; i++)
            {
                debaters[i] = playersToPickFrom[i];
            }

            discussionTopic = GetRandomDebateTopic();
        }

        public async override Task PlayPhase()
        {
            Task countdownEnded = countdownTimer.StartAsync();

            _ = SendSnapshotToAllPlayers();

            await countdownEnded;
        }

        public override async Task End()
        {
            // TODO - Package the player info nice and neat for someone to get later.
        }

        public static string GetRandomDebateTopic()
        {
            string[] allQuestions = File.ReadAllLines("/assets/questions.txt");

            return allQuestions[Utils.rng.Next(allQuestions.Length)];
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
                    // TODO: Send back relevant info for client.
                    break;

                default:
                    Console.WriteLine("[GAME] Client message invalid during StanceTakingPhase.");
                    break;
            }
        }

        private async Task takeGameAction(Dictionary<string, string> action, Game.Player actingPlayer)
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
                    positions[playerSpot] = action["stance"];
                    // TODO: Check if all players inputted stance? Send message that a player inputted stance?

                    break;

                default:
                    Console.WriteLine("[GAME] Recieved GameAction with invalid action field.");
                    break;
            }
        }

        public override Dictionary<string, string> GenerateGameSnapshot(Game.Player? requestingPlayer)
        {
            return null; // TODO
        }
    }

    public class PublicDiscussionPhase(Game parentGame) : GameState(parentGame)
    {
        private string discussionTopic = "Discussion Topic Not Set!";
        private Game.Player[] debaters = new Game.Player[2];
        private string[] positions = new string[2];

        public Utils.CountdownTimer countdownTimer = new Utils.CountdownTimer(60);

        // Represents which player agrees with what stance. If player X agrees with the first debater, playerstances[x] = 0.
        // -1 means did not vote or abstained.
        private Dictionary<Game.Player, int> playerStances = [];

        public void setDiscussionTopic(string newDiscussionTopic)
        {
            discussionTopic = newDiscussionTopic;
        }

        // Sets data regarding the a debating player.
        public void setDebaterInfo(int debaterNumber, Game.Player debater, string position)
        {
            debaters[debaterNumber] = debater;
            positions[debaterNumber] = position;
        }

        public async override Task PlayPhase()
        {
            Task countdownEnded = countdownTimer.StartAsync();
            // TODO

            await countdownEnded;
        }

        public override async Task End()
        {
            // Gives each debater a score relative to the people who agreed with them.
            int[] finalScores = new int[debaters.Length];

            foreach (Game.Player player in parentGame.playerList)
            {
                if (playerStances[player] >= 0)
                {
                    finalScores[playerStances[player]]++;
                }
            }

            for (int i = 0; i < debaters.Length; i++)
            {
                debaters[i].currentScore += finalScores[i];
            }
        }

        public override async Task RecievePlayerMessage(IncomingGameMessage incomingMessage)
        {
            switch (incomingMessage.messageType)
            {
                case IncomingGameMessage.MessageType.GameAction:
                    // TODO: Player takes action
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

                gameSnapshot["debaterNumber"] = debaters.Length.ToString();
                for (int i = 0; i < debaters.Length; i++)
                {
                    // TODO: Pass which players support this given debater. BUCKET THAT SHIT.
                    gameSnapshot["debater" + i] = debaters[i].playerNumber.ToString();
                    gameSnapshot["position" + i] = positions[i];
                }
            }

            else if (debaters.Contains(requestingPlayer))
            {
                // Return data for debaters.
                gameSnapshot["type"] = "debater";
                gameSnapshot["message"] = "Don't look at your phone, CONVINCE PEOPLE!";
                gameSnapshot["position"] = positions[requestingPlayer.playerNumber];
            }

            else
            {
                // TODO: Return data for players who need to pick.
                gameSnapshot["type"] = "pickingPlayer";
                gameSnapshot["debaterNumber"] = debaters.Length.ToString();
                for (int i = 0; i < debaters.Length; i++)
                {
                    gameSnapshot["debater" + i] = debaters[i].playerNumber.ToString();
                    gameSnapshot["position" + i] = positions[i];
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
                // TODO: Handle data for players.
            }
            else
            {
                // TODO: Handle data for host.
            }

            return gameSnapshot;
        }

        public override Task PlayPhase()
        {
            throw new NotImplementedException();
        }

        public override async Task RecievePlayerMessage(IncomingGameMessage incomingMessage)
        {
            if (incomingMessage.requestingSocket != parentGame.hostSocket)
            {
                Console.WriteLine("[GAME] Recieved player message after game ended!");
            }
            else
            {
                // TODO: Handle requesting a new game.
            }
        }
    }
}
