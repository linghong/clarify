const { exec } = require("child_process");
const os = require("os");

const isWindows = os.platform() === "win32";
const command = isWindows ? "cmd /c setup_and_run.bat" : "sh setup_and_run.sh";

console.log(`Running: ${command}`);

const process = exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`);
    return;
  }

});

// display the output of the process
process.stdout.pipe(process.stdout);
process.stderr.pipe(process.stderr);
