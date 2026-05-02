import { useCallback, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { message, confirm } from "@tauri-apps/plugin-dialog";

const RELEASES_API =
  "https://api.github.com/repos/awapi/awapi-pdf/releases/latest";
const RELEASES_PAGE =
  "https://github.com/awapi/awapi-pdf/releases/latest";

function isNewerVersion(current: string, latest: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10));
  const [cMaj, cMin, cPat] = parse(current);
  const [lMaj, lMin, lPat] = parse(latest);
  if (lMaj !== cMaj) return lMaj > cMaj;
  if (lMin !== cMin) return lMin > cMin;
  return lPat > cPat;
}

export function useUpdateCheck() {
  const [checking, setChecking] = useState(false);

  const checkForUpdates = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      const current = await getVersion();
      const res = await fetch(RELEASES_API, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      const data = (await res.json()) as { tag_name: string };
      const latest = data.tag_name.replace(/^v/, "");

      if (isNewerVersion(current, latest)) {
        const yes = await confirm(
          `Version ${latest} is available (you have ${current}).\n\nOpen the release page?`,
          { title: "Update Available", okLabel: "Open", cancelLabel: "Later" }
        );
        if (yes) {
          await openUrl(RELEASES_PAGE);
        }
      } else {
        await message(`You're up to date! (v${current})`, {
          title: "No Updates Available",
        });
      }
    } catch (err) {
      await message(
        `Could not check for updates.\n${err instanceof Error ? err.message : String(err)}`,
        { title: "Update Check Failed", kind: "error" }
      );
    } finally {
      setChecking(false);
    }
  }, [checking]);

  return { checkForUpdates, checking };
}
