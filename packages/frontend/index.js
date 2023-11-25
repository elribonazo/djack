const { app, BrowserWindow } = require("electron");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:3000");
  } else {
    win.loadFile("out/index.html"); // Load the built Next.js app
  }
}

app.whenReady().then(createWindow);
