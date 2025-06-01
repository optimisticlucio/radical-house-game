using System;

namespace radibate_backend;

public static class Utils
{
    public static Random rng = new Random();

    public static void Shuffle<T>(this IList<T> list)
    {
        int n = list.Count;
        while (n > 1)
        {
            n--;
            int k = rng.Next(n + 1);
            T value = list[k];
            list[k] = list[n];
            list[n] = value;
        }
    }
    
    public class CountdownTimer
    {
        private readonly int _durationSeconds;
        private CancellationTokenSource _cts = new(); // Initialized here
        private DateTime _endTime;

        public event Action? OnTimerFinished; // Nullable to avoid warning

        public CountdownTimer(int durationSeconds)
        {
            _durationSeconds = durationSeconds;
        }

        public TimeSpan TimeRemaining => _endTime - DateTime.UtcNow;

        public int GetRemainingSeconds() => Math.Max(0, (int)TimeRemaining.TotalSeconds);

        public async Task StartAsync()
        {
            _cts = new CancellationTokenSource();
            _endTime = DateTime.UtcNow.AddSeconds(_durationSeconds);

            try
            {
                await Task.Delay(TimeRemaining, _cts.Token);
                OnTimerFinished?.Invoke(); // Safe to call even if null
            }
            catch (TaskCanceledException)
            {
                // Timer was cancelled
            }
        }

        public void Cancel()
        {
            _cts.Cancel();
        }
    }
}   
