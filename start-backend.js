// Simple script to start the backend server
const { exec } = require('child_process');

console.log('Starting Tubenix backend server...');

const serverProcess = exec('cd server && node server.js', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(`Stdout: ${stdout}`);
});

serverProcess.stdout.on('data', (data) => {
  console.log(`Backend: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`Backend Error: ${data}`);
});

serverProcess.on('close', (code) => {
  console.log(`Backend server exited with code ${code}`);
});
