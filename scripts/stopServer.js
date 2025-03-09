const { exec } = require("child_process");
const os = require("os");

const isWindows = os.platform() === "win32";
const command = isWindows
  ? 'taskkill /IM python.exe /F'  // Windows: Force kill all Python processes
  : "pkill -f 'uvicorn' || echo 'Python server not running'";  // macOS/Linux

console.log(`Stopping AI local server with: ${command}`);

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error stopping server: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }
});
