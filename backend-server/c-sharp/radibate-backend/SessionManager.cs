using System;

namespace radibate_backend;

public class SessionManager
{
    Dictionary<string, GameInfo> GameSessions = new Dictionary<string, GameInfo>();

    public SessionManager()
    {
        // TODO

    }

    GameInfo StartNewGame()
    {
        GameInfo newGameSession = new GameInfo();

        // Check if we have no duplication of session keys.
        while (GameSessions.ContainsKey(newGameSession.sessionKey))
        {
            newGameSession.GenerateSessionKey();
        }

        newGameSession.StartGame();

        return newGameSession;
    }

    public class GameInfo
    {
        public Game game { get; private set; }
        public String sessionKey { get; private set; }

        public GameInfo()
        {
            GenerateSessionKey();
        }

        // Creates a random key for the session, and returns it. Does not assure uniqueness.
        public String GenerateSessionKey()
        {
            if (game != null)
            {
                throw new Exception("Generated session key for a game in progress!");
            }
            return GlobalData.random.Next(0, 1000000).ToString();
        }

        public void StartGame()
        {
            if (game != null)
            {
                throw new Exception("Attempted to overwrite game in progress!");
            }
            game = new Game();
        }
    }
}
