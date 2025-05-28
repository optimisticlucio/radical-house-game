using System;
using System.Text.Json;

namespace radibate_backend;

public class IncomingGameMessage
{
    /*
    Class that parses messages from the controller.
    */

    public MessageType messageType;
    public string? messageContent;

    public IncomingGameMessage(MessageType messageType, string? messageContent = null)
    {
        this.messageType = messageType;
        this.messageContent = messageContent;
    }

    public enum MessageType
    {
        CreateGame,
        ConnectToGame
    }

    public static IncomingGameMessage ParseIncomingRequest(string message)
    {
        // TODO: Handle invalid JSON messages.
        var deserializedMessage = JsonSerializer.Deserialize<Dictionary<string, string>>(message);

        if (deserializedMessage == null) throw new NullReferenceException("Incoming message converted to null - " + message);
        if (!deserializedMessage.ContainsKey("type")) throw new ArgumentException("Incoming message missing type key - " + message);
        MessageType parsedType;
        if (!Enum.TryParse<MessageType>(deserializedMessage["type"], out parsedType)) throw new ArgumentException("Invalid type key - " + message);

        return new IncomingGameMessage(parsedType);
    }
}

public class OutgoingGameMessage
{
    /*
    Class that creates messages to send to the controller.
    */

    public required MessageType messageType;
    public string? messageContent;

    public OutgoingGameMessage(MessageType messageType, string? messageContent = null)
    {
        this.messageType = messageType;
        this.messageContent = messageContent;
    }

    public enum MessageType
    {
        InvalidRequest,
        GameCreated,
        ConnectedToGame
    }

    public override string ToString()
    {
        Dictionary<string, string> outgoingMessage = new Dictionary<string, string>()
        {
            {"type", Enum.GetName(messageType)!}
        };

        if (messageContent != null)
        {
            //TODO: Handle this case.
        }

        return JsonSerializer.Serialize(outgoingMessage);
    }
}
