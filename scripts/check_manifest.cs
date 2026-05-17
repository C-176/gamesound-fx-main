using System;
using System.IO;
using System.Runtime.InteropServices;

class CheckManifest {
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr LoadLibraryEx(string lpFileName, IntPtr hFile, uint dwFlags);

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    static extern IntPtr FindResource(IntPtr hModule, IntPtr lpName, IntPtr lpType);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr LoadResource(IntPtr hModule, IntPtr hResInfo);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr LockResource(IntPtr hGlobal);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern int SizeofResource(IntPtr hModule, IntPtr hResInfo);

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool FreeLibrary(IntPtr hModule);

    const uint LOAD_LIBRARY_AS_IMAGE_RESOURCE = 0x00000020;
    const uint LOAD_LIBRARY_AS_DATAFILE = 0x00000002;

    static void Main(string[] args) {
        if (args.Length < 1) { Console.Error.WriteLine("Usage: check_manifest <exe_path>"); return; }
        string exePath = args[0];
        if (!File.Exists(exePath)) { Console.Error.WriteLine("File not found: " + exePath); return; }

        IntPtr hMod = LoadLibraryEx(exePath, IntPtr.Zero, LOAD_LIBRARY_AS_DATAFILE);
        if (hMod == IntPtr.Zero) { Console.Error.WriteLine("LoadLibraryEx failed: " + Marshal.GetLastWin32Error()); return; }

        try {
            // RT_MANIFEST = 24, CREATEPROCESS_MANIFEST_RESOURCE_ID = 1
            IntPtr hRes = FindResource(hMod, (IntPtr)1, (IntPtr)24);
            if (hRes == IntPtr.Zero) {
                Console.Error.WriteLine("No RT_MANIFEST found (error " + Marshal.GetLastWin32Error() + ")");
                return;
            }
            IntPtr hLoaded = LoadResource(hMod, hRes);
            IntPtr pData = LockResource(hLoaded);
            int size = SizeofResource(hMod, hRes);
            byte[] buf = new byte[size];
            Marshal.Copy(pData, buf, 0, size);
            string manifest = System.Text.Encoding.UTF8.GetString(buf);
            Console.WriteLine(manifest);
        } finally {
            FreeLibrary(hMod);
        }
    }
}
