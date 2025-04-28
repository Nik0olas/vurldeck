const { app, BrowserWindow, globalShortcut, dialog } = require('electron');
const path = require('node:path');
const { exec } = require("node:child_process")
const fs = require("fs");
const { ipcMain } = require('electron');
const configPath = `${process.env.HOME}/.config/vurldeck`
let mainWindow
let gameIsOpen = false
let mainWindowIsHidden = false
let isInGame = false
let gamesCache
let exitOverlay
const Database = require('better-sqlite3');
let musicIsPlaying = false
let musicPlayerWindow
let shouldCount
let gameTimeCounter
let currentGame
let toggleKey
let beforeOpenSteam = 0

// Checks if "assets" folder is in /.config/vurldeck and if not, copy the "assets" folder from "resources".
if (!fs.existsSync(`${configPath}/assets`)) {
  fs.cp(path.join(__dirname, "../../assets"), `${configPath}/assets`, { recursive: true }, (err) => {
    if (err) {
      console.log(err)
    }
  })
}

// Checks if "gamehistory.txt" exsits in /.config/vurldeck and if not, create the file with an empty array.
fs.readFile(`${configPath}/gamehistory.txt`, "utf8", (err, data) => {
  if (err) {
    console.log("Creating gamehistory file")
    fs.writeFile(`${configPath}/gamehistory.txt`, "[]", (err) => {
      if (err) {
        console.log(err)
      }
    })
  }
})

// Checks if "togglekey.txt" exsits in /.config/vurldeck and if not, create the file with the default key "Escape".
fs.readFile(`${configPath}/togglekey.txt`, "utf8", (err, data) => {
  if (err) {
    fs.writeFile(`${configPath}/togglekey.txt`, "Escape", (err) => {
      if (err) {
        console.log(err)
      }
    })
  }
})

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Launches flatpak version of Lutris
function launchLutris() {
  exec("flatpak run net.lutris.Lutris")
  if (beforeOpenSteam > 30) {
    exec("steam")
  }
}

// Gets saved game data from Lutris "pga.db" file.
function getLutrisGameData() {
  const db = new Database(`${process.env.HOME}/.var/app/net.lutris.Lutris/data/lutris/pga.db`);
  let gameArray = []

  const stmt = db.prepare('SELECT id, name, slug, runner FROM games')
  const games = stmt.all()

  games.forEach(game => {
      gameArray.push({ id: game.id, name: game.name, slug: game.slug, runner: game.runner})
  });

  return gameArray
}

// When toggle key is pressed while in game, show exit confirmation dialog. If yes then 
function exitOverlayToggle(runner) {
  let response

  function displayDialog(message) {
    response = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Exit game?',
      message: message
    })
  }
  
  if (runner == "steam") {
    displayDialog('Do you want to exit the game? \n\nSince you are playing a Steam game, on exit Steam will have to reboot.')
  } else {
    displayDialog('Do you want to exit the game?')
  }

  if (response == 0) {
    // Kills Lutris. Command is advanced because it needs to find the sandboxed instance to kill.
    exec("ps aux | grep '[b]wrap.*lutris-wrapper' | awk '{print $2}' | xargs -r kill -9")
    // And this kills steam so that steam games get shut down. Steam will launch again when user is in Vurldeck.
    if (runner == "steam") {
      exec("pkill -15 steam")
    }
  } else {
    return
  }
}

// When shutdown deck is triggered show shutdown confirmation dialog
function shutdownDeck() {
  const response = dialog.showMessageBoxSync(mainWindow, {
    type: 'question',
    buttons: ['Yes', 'No'],
    title: 'Shutdown deck?',
    message: 'Do you want to shutdown your deck?'
  })

  if (response == 0) {
    // Shutdowns system
    exec("qdbus org.kde.Shutdown /Shutdown logoutAndShutdown")
  } else {
    return
  }
}

// When recived reset var gameCache. Game cache is used for checking if the lutris list was updated.
ipcMain.on("reset-game-cache", () => {
  gamesCache = ""
})

// When recived open Lutris and hide the main window (Now also opens steam). This is used for when user presses the "Launch Lutris" button.
ipcMain.on("open-lutris", () => {
  currentGame = "Lutris"
  launchLutris()
  mainWindow.hide()
  setTimeout(() => {
    gameIsOpen = true
    mainWindowIsHidden = true
  }, 2000);
})

// Toggels the visibility of the main window. launchLutris() gets triggered when vurldeck is on screen for faster load times and less bugs.
function toggleVisibility() {
  if (!isInGame) {
    if (mainWindowIsHidden) {
      mainWindowIsHidden = false
      launchLutris()
    } else {
      mainWindowIsHidden = true
    }
  }
}

setInterval(() => {
  // Checks if game is open by checking if Lutris is running. 
  // If Lutris is not running then assume that game is closed. Lutris will launch again when user is in Vurldeck.
  if (gameIsOpen) {
    exec("flatpak ps | grep lutris", (error, stdout, stderr) => {
      if (stdout.trim() === "") {
        gameIsOpen = false
        shouldCount = false
        mainWindowIsHidden = false
        launchLutris()

        mainWindow.webContents.send("send-game-time-data", currentGame, gameTimeCounter)
      }
    });
  }  

  // Shows or hides mainWindow.
  if (mainWindowIsHidden) {
    mainWindow.hide()
  } else {
    mainWindow.show()
  }
}, 100);

// Adds a second to gameTimeCounter which is later on sent to mainWindow. This is used to track time played.
setInterval(() => {
  gameTimeCounter += 1
}, 1000);

// Gets games from "getLutrisGameData" function and sends them one by one starting with the most recently played game.
function drawGames() {
  const lutrisGames = getLutrisGameData();

  const lutrisGameSet = new Set(lutrisGames.map(game => game.name.trim().toLowerCase()));

  // Clears old games from mainWindow game-grid.
  mainWindow.webContents.send("clear-games");

  //
  fs.readFile(`${configPath}/gamehistory.txt`, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading game history file:", err);
      return;
    }
    try {
      // Here it gets the games from "gamehistory.txt" in /.config/vurldeck and matches and sorts them with lutrisGames var.
      const history = JSON.parse(data);

      const updatedGames = lutrisGames.map(game => {
        const historyEntry = history.find(entry => entry.game.toLowerCase() === game.name.toLowerCase());
        return {
          game: game.name,
          lastplayed: historyEntry ? historyEntry.lastplayed : 0
        };
      });

      updatedGames.sort((a, b) => b.lastplayed - a.lastplayed);

      // After games are sorted send them one by one to mainWindow using "draw-game".
      for (let game of updatedGames) {
        mainWindow.webContents.send("draw-game", game.game);
      }

    } catch (parseError) {
      console.error("Error parsing game history JSON:", parseError);
    }
  });
}



// Saves last played data for later use (When drawing games to mainWindow).
ipcMain.on("save-game-history", (event, data) => {
  fs.writeFile(`${configPath}/gamehistory.txt`, data, (err) => {
    if (err) {
      console.log(err)
    }
  })
})


const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

// When recived it will check if window is already hidden or visible and play a sound based on the current state. Then it calls function "toggleVisibility"
ipcMain.on("toggle-visibility", (event, bool) => {
  if (bool) {
    if (gameIsOpen) return
    if (!mainWindowIsHidden) {
      mainWindow.webContents.send("play-change-sound")
    } else {
      mainWindow.webContents.send("play-change-2-sound")
    }
    toggleVisibility()
  }
})

// Check if "gamesCache" var is matching Lutris game data. If not call function "drawGames".
setInterval(() => {
  const games = getLutrisGameData()

  if (JSON.stringify(games) != JSON.stringify(gamesCache)) {
    gamesCache = games
    drawGames()
  }
}, 100);


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Checks current toggle key from "togglekey.txt" in /.config/vurldeck and registers it.
  fs.readFile(`${configPath}/togglekey.txt`, "utf8", (err, data) => {
    if (err) {
      console.log(err)
    }
  
    toggleKey = data

    // Registers the key.
    globalShortcut.register(toggleKey, (event) => {
      if (!gameIsOpen) {
        // Sends "escape-key-pressed" so that mainWindow can handle what to do next.
        mainWindow.webContents.send("escape-key-pressed")
      } else {
        // Sends to mainWindow so that mainWindow will response with current game name.
        mainWindow.webContents.send("get-game-exit")
      }
    });
  })

  // Calls functions on start
  createWindow();
  drawGames()
  launchLutris()

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

process.on('uncaughtException', (err) => {
  console.error('Suppressed error:', err); // Optional logging
  // Don't crash the app
});

// Launches Lutris, sets up game tracking, finds the game by name, toggles visibility, and runs the game by ID.
ipcMain.on("start-game", (event, gameName) => {
  launchLutris()
  const lutrisGames = getLutrisGameData()
  gameIsOpen = true
  gameTimeCounter = 0
  shouldCount = true
  currentGame = gameName

  // Finds game in list by name and when found gets the game id. Then uses a command to launch it by game id. Also toggels visibility.
  for (let i = 0; i < lutrisGames.length; i++) {
    if (lutrisGames[i].name == gameName) {
      toggleVisibility(true)
      exec(`flatpak run net.lutris.Lutris lutris:rungameid/${lutrisGames[i].id}`)
      return
    }
  }
})

// Sets the wallpaper every second so that even when wallpaper is updated on desktop it will still match in Vurldeck.
setInterval(() => {
  setWallpaper()
}, 1000);

// Immediately triggers "setWallpaper" when page loads so that the wallpaper apperas faster then having to wait one second.
ipcMain.on("get-wallpaper", () => {
  setWallpaper()
})

// Finds current wallpaper and sets it as background in Vurldeck.
function setWallpaper() {
  const { execSync } = require('child_process');
  // This script finds the wallpaper and returns the name.
  const script = `
      var allDesktops = desktops();
      for (i=0;i<allDesktops.length;i++) {
        d = allDesktops[i];
        print(d.wallpaperPlugin);
        print(d.currentConfigGroup);
        d.currentConfigGroup = ["Wallpaper", "org.kde.image", "General"];
        print(d.readConfig("Image"));
      }
    `;
    let output = execSync(`qdbus org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript '${script}'`).toString();

    // By default the output will have "org.kde.image" so this just removes it.
    output = output.replaceAll("org.kde.image", "")

    mainWindow.webContents.send("set-wallpaper", output)
}

// When recived it will check if music is already playing and if mainWindow is hidden. 
// If both are false then create a new window that plays the music. This is done so that even when pages are changed it will still continue playing the music.
ipcMain.on("should-play-music", () => {
  if (!musicIsPlaying) {
    if (!mainWindowIsHidden) {
      musicIsPlaying = true
      const createWindow = () => {
        // Create the browser window.
        musicPlayerWindow = new BrowserWindow({
          width: 100,
          height: 100,
          frame: false,
          fullscreen: false,
          show: false,
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
          },
        });
      
        // and load the index.html of the app.
        musicPlayerWindow.loadFile(path.join(__dirname, 'musicplayer.html'));
      };

      createWindow()
    }
  }
})

// When recived it will check if music is playing. If it is then close the music player window.
ipcMain.on("should-NOT-play-music", () => {
  if (musicIsPlaying) {
    musicIsPlaying = false
    musicPlayerWindow.close()
  }
})

// When recived it will call the "shutdownDeck" function.
ipcMain.on("shutdown-deck", () => {
  shutdownDeck()
})

setInterval(() => {
  // If music is playing but the mainWindow is hidden then close the music player to stop the music.
  if (musicIsPlaying) {
    if (mainWindowIsHidden) {
      musicIsPlaying = false
      musicPlayerWindow.close()
    }
  }
  // If is not in game and mainWindow is not hidden then start steam in background. This is done to fix bugs since steam is shutdown in "exitOverlayToggle" function.
  if (beforeOpenSteam > 30) {
    if (!isInGame) {
      if (!mainWindowIsHidden) {
        exec("steam")
      }
    }
  } else {
    beforeOpenSteam += 1
  }
}, 1000);

// When recived open devtools.
ipcMain.on("open-devtools", () => {
  mainWindow.webContents.openDevTools()
})

// When recived change toggle key to the user selected key. It writes the new key to "togglekey.txt" in /.config/vurldeck
ipcMain.on("set-toggle-key", (event, key) => {
  fs.writeFile(`${configPath}/togglekey.txt`, key, (err) => {
    if (err) {
      console.log(err)
      return
    }

    const response = dialog.showMessageBoxSync(mainWindow, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Restart vurldeck?',
      message: 'Vurldeck needs to be restarted for changes to apply. Restart now?'
    })

    if (response == 0) {
      app.relaunch()
      app.exit()
    } else {
      return
    }
  })
})

// Gets current toggle key and sends it back to mainWindow. This is used for displaying the current key in settings.
ipcMain.on("get-current-toggle-key", () => {
  mainWindow.webContents.send("response-toggle-key", toggleKey)
})

// When recived it will remove Vurldeck from autostart and makes Steam Deck's game mode default.
ipcMain.on("uninstall-vurldeck", async () => {
  // Removes the vurldeck.desktop file from autostart.
  const autostartDir = path.join(process.env.HOME, '.config', 'autostart')
  await fs.promises.unlink(path.join(autostartDir, 'vurldeck.desktop'))

  // Makes Steam Deck start in game mode by default.
  exec("steamos-session-select gamescope")
})

// Recives the name and finds the runner that the game is using and then calls "exitOverlayToggle".
ipcMain.on("exit-game", (event, game) => {
  const lutrisGames = getLutrisGameData();
  let foundRunner

  for (let i = 0; i < lutrisGames.length; i++) {
    if (game == lutrisGames[i].name) {
      foundRunner = lutrisGames[i].runner
      break
    }
  }

  exitOverlayToggle(foundRunner)
})