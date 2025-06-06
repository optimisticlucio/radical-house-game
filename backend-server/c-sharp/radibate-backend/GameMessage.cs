using System;
using System.Net.WebSockets;
using System.Security;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace radibate_backend;

public class IncomingGameMessage
{
    /*
    Class that parses messages from the controller.
    */

    public MessageType messageType;
    public Dictionary<string, string>? messageContent;
    public WebSocket requestingSocket;

    public IncomingGameMessage(MessageType messageType, WebSocket websocket,Dictionary<string, string>? messageContent = null)
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

    public static IncomingGameMessage ParseIncomingRequest(string message, WebSocket websocket)
    {
        using var document = JsonDocument.Parse(message);
        var root = document.RootElement;

        if (!root.TryGetProperty("type", out var typeElement))
            throw new ArgumentException("Incoming message missing type key - " + message);

        if (!Enum.TryParse(typeElement.GetString(), out MessageType parsedType))
            throw new ArgumentException("Invalid type key - " + message);

        Dictionary<string, string>? messageContent = null;

        if (root.TryGetProperty("content", out var contentElement) && contentElement.ValueKind == JsonValueKind.Object)
        {
            messageContent = new Dictionary<string, string>();

            foreach (var prop in contentElement.EnumerateObject())
            {
                var value = prop.Value;
                switch (value.ValueKind)
                {
                    case JsonValueKind.String:
                        messageContent[prop.Name] = value.GetString()!;
                        break;
                    case JsonValueKind.Number:
                        messageContent[prop.Name] = value.GetRawText(); // or value.ToString()
                        break;
                    case JsonValueKind.Null:
                        messageContent[prop.Name] = "";
                        break;
                    default:
                        throw new ArgumentException($"Unsupported JSON value type for property '{prop.Name}' - {value.ValueKind}");
                }
            }
        }

        return new IncomingGameMessage(parsedType, websocket, messageContent);
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
