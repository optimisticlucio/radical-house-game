using System;
using System.Threading.Tasks;

namespace radibate_backend;

public class BackendConsoleUI
{
    public static async Task Main(string[] args)
    {
        Console.WriteLine("Starting BackendConsoleUI!");
        Console.WriteLine("Creating SessionManager...");
        SessionManager sessionManager = new SessionManager();
        Console.WriteLine("SessionManager Created!");
        await sessionManager.Start();
    }
}
