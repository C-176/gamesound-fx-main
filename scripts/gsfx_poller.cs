using System;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;

class GsfxKeyPoller {
    [DllImport("user32.dll")]
    static extern short GetAsyncKeyState(int vKey);

    static void Main(string[] args) {
        if (args.Length < 1) return;
        var parts = args[0].Split(',');
        var vkCodes = new int[parts.Length];
        for (int i = 0; i < parts.Length; i++)
            vkCodes[i] = int.Parse(parts[i]);

        int intervalMs = 30;
        if (args.Length > 1) int.TryParse(args[1], out intervalMs);

        var prev = new bool[256];

        while (true) {
            for (int i = 0; i < vkCodes.Length; i++) {
                int vk = vkCodes[i];
                if (vk < 0 || vk > 255) continue;
                bool nowDown = (GetAsyncKeyState(vk) & 0x8000) != 0;
                if (nowDown && !prev[vk]) {
                    Console.Write("KEY:");
                    Console.Write(vk);
                    Console.Write('\n');
                }
                prev[vk] = nowDown;
            }
            Console.Out.Flush();
            Thread.Sleep(intervalMs);
        }
    }
}
