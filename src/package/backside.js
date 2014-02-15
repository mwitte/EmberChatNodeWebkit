var GUI = require('nw.gui');

// close application if main window got closed
GUI.Window.get().on('close', function(){
    GUI.App.quit();
});
