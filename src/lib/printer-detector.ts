import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DetectedSystemPrinter } from "@/types/adisyon";

const execFileAsync = promisify(execFile);

const VIRTUAL_NAME_REGEX =
  /(print to pdf|xps document writer|onenote|^fax$|adobe pdf|foxit.*pdf)/i;
const VIRTUAL_PORT_REGEX = /^(PORTPROMPT:|SHRFAX:|nul:)$/i;

const PRINTER_CACHE_TTL_MS = 300_000;

const globalForPrinters = globalThis as unknown as {
  __cachedPrinters?: DetectedSystemPrinter[];
  __cachedPrintersAt?: number;
  __inFlightScan?: Promise<DetectedSystemPrinter[]>;
};

export function isVirtualPrinter(name: string, portName: string): boolean {
  return VIRTUAL_NAME_REGEX.test(name) || VIRTUAL_PORT_REGEX.test(portName);
}

export async function detectSystemPrinters(
  forceRefresh = false
): Promise<DetectedSystemPrinter[]> {
  if (
    !forceRefresh &&
    globalForPrinters.__cachedPrinters &&
    globalForPrinters.__cachedPrintersAt &&
    Date.now() - globalForPrinters.__cachedPrintersAt < PRINTER_CACHE_TTL_MS
  ) {
    return globalForPrinters.__cachedPrinters;
  }

  if (process.platform !== "win32") {
    return [];
  }

  if (globalForPrinters.__inFlightScan) {
    return globalForPrinters.__inFlightScan;
  }

  globalForPrinters.__inFlightScan = (async () => {
    try {
      const { stdout } = await execFileAsync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "Get-Printer | Select-Object Name, DriverName, PortName | ConvertTo-Json -Compress",
        ],
        { timeout: 3500, windowsHide: true }
      );

      const trimmed = stdout.trim();
      if (!trimmed) {
        globalForPrinters.__cachedPrinters = [];
        globalForPrinters.__cachedPrintersAt = Date.now();
        return [];
      }

      const parsed = JSON.parse(trimmed) as
        | Array<{ Name?: string; DriverName?: string; PortName?: string }>
        | { Name?: string; DriverName?: string; PortName?: string };

      const list = Array.isArray(parsed) ? parsed : [parsed];
      const normalized: DetectedSystemPrinter[] = list
        .filter((p) => Boolean(p && p.Name))
        .map((p) => {
          const name = String(p.Name ?? "").trim();
          const driverName = String(p.DriverName ?? "").trim();
          const portName = String(p.PortName ?? "").trim();
          return {
            name,
            driverName,
            portName,
            isVirtual: isVirtualPrinter(name, portName),
          };
        });

      globalForPrinters.__cachedPrinters = normalized;
      globalForPrinters.__cachedPrintersAt = Date.now();
      return normalized;
    } catch {
      return globalForPrinters.__cachedPrinters ?? [];
    } finally {
      globalForPrinters.__inFlightScan = undefined;
    }
  })();

  return globalForPrinters.__inFlightScan;
}
