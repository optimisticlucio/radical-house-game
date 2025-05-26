using System;

namespace radibate_backend;

public class BackendConsoleUI
{
    public static void Main(string[] args)
    {
        Console.WriteLine("Starting BackendConsoleUI!");
        Console.WriteLine("Creating SessionManager...");
        SessionManager sessionManager = new SessionManager();
        Console.WriteLine("SessionManager Created!");
    }
}
