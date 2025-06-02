using System;
using System.Net.WebSockets;
using System.Security;
using System.Text.Json;

namespace radibate_backend;

public class IncomingGameMessage
{
    /*
    Class that parses messages from the controller.
    */

    public MessageType messageType;
    public Dictionary<string, string>? messageContent;
    public WebSocket? requestingSocket;

    public IncomingGameMessage(MessageType messageType, Dictionary<string, string>? messageContent = null, WebSocket? websocket = null)
    {
        this.messageType = messageType;
        this.messageContent = messageContent;
        this.requestingSocket = websocket;
    }

    public enum MessageType
    {
        CreateGame, // Creates a new game, and places the given user in it.
        ConnectToGame, // Tries connecting to an existing game.
        GameAction, // Catchall for requests within the game.
        RequestStateInfo // Client requests snapshot of the current game state.
    }

    public static IncomingGameMessage ParseIncomingRequest(string message, WebSocket? websocket = null)
    {
        // TODO: Handle invalid JSON messages.
        var deserializedMessage = JsonSerializer.Deserialize<Dictionary<string, string>>(message);

        if (deserializedMessage == null) throw new NullReferenceException("Incoming message converted to null - " + message);
        if (!deserializedMessage.ContainsKey("type")) throw new ArgumentException("Incoming message missing type key - " + message);
        MessageType parsedType;
        if (!Enum.TryParse(deserializedMessage["type"], out parsedType)) throw new ArgumentException("Invalid type key - " + message);

        Dictionary<string, string>? messageContent = null;
        if (deserializedMessage.ContainsKey("content"))
        {
            // TODO: Handle invalid JSON content.
            messageContent = JsonSerializer.Deserialize<Dictionary<string, string>>(deserializedMessage["content"]);
        }

        return new IncomingGameMessage(parsedType, messageContent, websocket);
    }
}

public class OutgoingGameMessage
{
    /*
    Class that creates messages to send to the controller.
    */

    public MessageType messageType;
    public object? messageContent;

    public OutgoingGameMessage(MessageType messageType, object? messageContent = null)
    {
        this.messageType = messageType;
        this.messageContent = messageContent;
    }

    public enum MessageType
    {
        InvalidRequest, // Sent back if the user gave an illogical request.
        ConnectedAsHost, // Sent to confirm a game has been created by user request, and tells them the room code.
        ConnectedToGame,  // Sent to confirm the user has connected to a room.
        StanceSnapshot,  // A snapshot of the current game state to make sure everyone's onboard.
        GameUpdate // A specific update of an individual state change. Assumes the client knows the current state.
    }

    public override string ToString()
    {
        Dictionary<string, object> outgoingMessage = new Dictionary<string, object>()
        {
            {"type", Enum.GetName(messageType)!}
        };

        if (messageContent != null)
        {
            outgoingMessage.Add("content", messageContent);
        }

        return JsonSerializer.Serialize(outgoingMessage);
    }
}
