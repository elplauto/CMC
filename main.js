const { app, BrowserWindow, Menu } = require('electron')
const path = require('path');
const url = require('url');

app.on('ready', function(){

    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            nodeIntegration: true,
            spellcheck: true
        }
    });
    win.maximize();
    win.show();
    win.loadURL(url.format({
        pathname: path.join(__dirname, './index.html'),
        protocol: 'file:',
        slashes:true
    }));
    // Quit app when closed
    win.on('closed', function(){
        app.quit();
    });
      
    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    // Insert menu
    Menu.setApplicationMenu(mainMenu);
});

// Create menu template
const mainMenuTemplate =  [
    // Each object is a dropdown
    {
        label: 'Developer Tools',
        submenu:[
            {
                role: 'reload'
            },
            {
                label: 'Toggle DevTools',
                accelerator:process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click(item, focusedWindow){
                    focusedWindow.toggleDevTools();
                }
            }
        ]
    } 
];