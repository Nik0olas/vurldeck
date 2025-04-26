# Vurldeck

**Vurldeck** is an alternative to Steam Big Picture Mode, designed specifically for use in **Steam Deck's Desktop Mode**.  
It brings features focused on ease of navigation and control, including:

- **One-Click Switch**: Seamlessly switch between Vurldeck and your Desktop with a single click.
- **Immediate Desktop Boot**: Boot directly into Desktop Mode instead of Game Mode.

Vurldeck aims to make Desktop Mode a first-class experience on the Steam Deck.

![Vurldeck Screenshot](https://github.com/Nik0olas/vurldeck/blob/0d815d8bd933e16d8f6fa81f2e615471c51a1429/screenshot/1.png)

---

## Features
- 🖱️ One-click switching between Desktop and Vurldeck
- ⚡ Instant boot into Desktop Mode
- 🖥️ Uses Lutris for the best experience
- 🛠️ Customizable CSS and Sounds
- 🌺 Customize your Vurldeck background by changing your Desktop wallpaper

---

## Installation

1. Download the latest `vurldeck-setup` from the [Releases](https://github.com/Nik0olas/vurldeck/releases) tab.
2. Make sure you have **Lutris (Flatpak Version)** installed:
   - If not installed, the Vurldeck setup will redirect you to the Flathub page automatically.
   - You can also manually install Lutris from [Flathub](https://flathub.org/apps/net.lutris.Lutris).
3. Follow the setup instructions provided during installation.
4. Launch and enjoy!

---

## Usage Guide

### Adding Games to Vurldeck
To add games to Vurldeck, you need to add them to **Lutris**:
- Press the **"Launch Lutris"** button inside Vurldeck.
- In Lutris, you can either:
  - Add games from available sources (like GOG, Epic Games, etc.), or
  - Manually add a game by pressing the **`+` button** in the top left corner.

### Switching Between Desktop and Controller Layouts
You can switch between Desktop and Controller button layouts using **Steam Input Action Sets**:
- **By default**, your Steam Deck has both a Desktop Layout and a Controller Layout.
- To switch between layouts:
  - Hold down your **Menu button** (☰) (unless you have changed it in Steam Controller Settings).
- You will hear a **beep** and see a **notification** in the bottom right corner confirming the change.
- This feature is not unique to Vurldeck and can also be done directly within Steam.

### Switching Between Desktop and Vurldeck
- Press the **Toggle Button** to switch between the Desktop and Vurldeck.
- **By default**, the Toggle Button is mapped to **Escape** (`Esc`).
- On the Steam Deck, you can press **Escape** using the **Menu button** (☰) by default.

### Closing a Game
- Make sure you have the **Desktop Button Layout** selected.
- Press your **Toggle Button** (Escape/Menu button).
- When prompted, select **"Yes"** to close the game.

### Customizing CSS and Sounds
To change the **CSS** or **sounds** in Vurldeck, you can modify the files in the **assets folder**:
- The assets folder is located at:  
  `~/.config/vurldeck/assets`
- In this folder, you can change:
  - **CSS files** to modify the visual style
  - **Sound files** to customize audio effects

---

## Technologies Used
- [Electron](https://www.electronjs.org/) — Cross-platform desktop app framework

---

## Author
**Nik0olas**

---

## License
This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE](LICENSE) file for details.
