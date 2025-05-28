using System;
using System.IO.Compression;
using System.Runtime.CompilerServices;
using System.Security;

namespace radibate_backend;

public abstract class GameState
{
    public Game parentGame;

    public GameState(Game parentGame)
    {
        this.parentGame = parentGame;
    }
    public abstract Task PlayPhase();
    public abstract void End();


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

        public override void End()
        {
            // TODO
        }

    }

    public class StanceTakingPhase : GameState
    {
        public string discussionTopic = "Discussion Topic Not Set!";
        public Game.Player[] debaters = new Game.Player[2];
        public string[] positions = new string[2];

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
            // TODO
        }

        public override void End()
        {
            // TODO - Package the player info nice and neat for someone to get later.
        }

        public static string GetRandomDebateTopic()
        {
            string[] allQuestions = File.ReadAllLines("/assets/questions.txt");

            return allQuestions[Utils.rng.Next(allQuestions.Length)];
        }
    }

    public class PublicDiscussionPhase(Game parentGame) : GameState(parentGame)
    {
        private string discussionTopic = "Discussion Topic Not Set!";
        private Game.Player[] debaters = new Game.Player[2];
        private string[] positions = new string[2];

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
            // TODO
        }

        public override void End()
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
    }
}
