// Root-level server entry point for deployment platforms like Render
// This file exists to ensure the server starts correctly regardless of working directory

const path = require('path');
const { spawn } = require('child_process');

// Change to server directory and run the actual server
process.chdir(path.join(__dirname, 'server'));
require('./server/server.js');
