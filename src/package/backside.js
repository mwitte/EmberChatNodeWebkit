var gui = require('nw.gui');

// close application if main window got closed
gui.Window.get().on('close', function(){
    gui.App.quit();
});