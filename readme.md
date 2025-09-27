## Indigo Log Viewer

The ***Indigo Log Viewer*** is a simple web-based app that is intended to be a front end viewer of Indigo log files.
While it might work for other log files as well, it is expecting log file entries to be of the form 
`[POSIX Timestamp][Message Class][Message]`. No other log entry format is supported. For example, this is the only 
format that is supported:
```text
2025-09-10 11:52:01.833	Action Collection	Webhook Post/Form Received
```
<img src="src/Screenshot.png" alt="Screenshot" width="800" height="600">

### Usage
For the best experience, download the files using the <kbd>Code</kbd> button above and unzip the files into a working 
folder. Then double-click the html file or select File > Open from your preferred browser.

The app requires three files to run:
1. log_viewer_app.html
2. log_viewer_app.js
3. log_viewer_app.css

There are other files in the zip, that the app will use if they're present (images, etc.)

### Menu
#### Choose Log Folder
Once the app is loaded, click the menu button in the upper right corner and browse to the log folder of your target 
Indigo install. Select the folder to load all the log files or select a single log file to view. The app supports 
opening log files from a network location; however, this can affect load times depending on the speed of your network 
and the amount of data contained within the log files selected. Be patient, it may take a few beats to load. On an M4 
MacBook, it loads 200,000 log lines in less than a second when run on the server machine.

The log file view is not updated in real time. To reload the log entry list to view new log entries, it's necessary to
re-choose the log folder (due to legitimate modern browser-imposed security features).

#### Themes
The app supports a light and dark theme. It will remember your choice for the future; however, if you clear your 
browser's cache, the preference may be cleared if you delete the app's local storage. This is a "universal" browser 
security feature. To toggle the theme, select [Light/Dark] Theme from the menu.

#### Help
Clicking help will take you to the GitHub repository and this readme file.

### Search Tools
#### Class Filter
The Class Filter dropdown will list all the message classes that exist in the loaded log files. This control is built 
dynamically; that is, when you first load the app, there will be no classes listed in the control.

#### Text Search
Use the Text Search tool to find specific strings of text. The search entry is a literal search (it doesn't support 
complex search patterns.)

#### Date Filter
To limit the log entry list to a specific date or date range, use the Date Filter inputs. To clear a previous date range
selection, click the <kbd>Clear</kbd> button.

### Viewing Area
The log messages from the selected files are displayed in this area. Initially, it will contain all loaded messages; 
however, the list will update as filters are applied. Click on a message and it will open in a modal dialog. This is
especially helpful for multiline log messages which are truncated in the main view. There is a <kbd>Copy</kbd> button
provided in the modal which will copy the entire log entry displayed.

<img src="src/Screenshot with Modal.png" alt="Screenshot with Modal" width="800" height="600">

#### Columns
Both the timestamp and class columns are sortable in place. You can click on the column heading to sort the data. You 
can sort only one column at a time. Additionally, both columns are resizeable if needed.

### Compatability
- This web app is tested against Safari `18.6`, but it should work in other modern browsers (it loads in current 
  versions of FireFox and Chrome, but is not fully tested in those browsers).
- This web app is not designed to be run on small screens, but it should theoretically work if your small screen device 
  can access the Indigo logs folder.

### Suggestions and Error Reports
Add suggestions and error reports using the issues tab above.
