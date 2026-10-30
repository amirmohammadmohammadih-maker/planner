// Prints the most likely LAN IPv4 address of this computer (for the phone to connect to).
import os from "node:os";
const candidates = [];
for (const [name, list] of Object.entries(os.networkInterfaces())) {
  for (const i of list ?? []) {
    if (i.family !== "IPv4" || i.internal || i.address.startsWith("169.254.")) continue;
    if (/vEthernet|WSL|Docker|VirtualBox|VMware|Loopback|Hyper-V/i.test(name)) continue;
    const score = i.address.startsWith("192.168.") ? 3 : i.address.startsWith("10.") ? 2 : /^172\.(1[6-9]|2\d|3[01])\./.test(i.address) ? 1 : 0;
    candidates.push({ address: i.address, score });
  }
}
candidates.sort((a, b) => b.score - a.score);
process.stdout.write(candidates[0]?.address ?? "");
