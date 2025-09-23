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
The app requires three files to run:
1. log_viewer_app.html
2. log_viewer_app.js
3. log_viewer_app.css

Download the files using the <kbd>Code</kbd> button above and unzip the files into a working folder. Then double-click the 
html file or select File > Open from your preferred browser.

#### Choose Log Folder
Once the app is loaded, click the <kbd>Choose Log Folder</kbd> button and browse to the log folder of your target 
Indigo install. Select the  folder to load all the log files or select a single log file to view. The app supports 
opening log files from a network location; however, this can affect load times depending on the speed of your network 
and the amount of data contained within the log files selected. Be patient, it may take a few beats to load. On an M4 
MacBook Air, it loads180,000 log lines in less than a second.

#### Reload
The view is not updated in real time. To reload the log entry list to view new log entries, click the <kbd>Reload 
button</kbd>. If there are filters set, selecting <kbd>Reload</kbd> will reset the filters as well. If no log files 
have been loaded, the <kbd>Reload</kbd> button will be disabled.

#### Date Filter
To limit the log entry list to a specific date or date range, use the Date Filter inputs. To clear a previous date range
selection, click the <kbd>Clear</kbd> button.

#### Class Filter
The Class Filter dropdown will list all the message classes that exist in the loaded log files. This control is built 
dynamically; that is, when you first load the app, there will be no classes listed in the control.

#### Text Search
Use the Text Search tool to find specific strings of text. The search entry is a literal search (it doesn't support 
complex search patterns.)

#### Themes
The app supports a light and dark theme. It will remember your choice for the future; however, if you clear your 
browser's cache, the preference may be cleared if you delete the app's local storage. This is a "universal" browser 
security feature.

#### Viewing Area
The log messages from the selected files are displayed in this area. Initially, it will contain all loaded messages; 
however, the list will update as filters are applied. Click on a message and it will open in a modal dialog. This is
especially helpful for multiline log messages which are truncated in the main view. There is a <kbd>Copy</kbd> button
provided in the modal which will copy the entire log entry displayed.

<img src="src/Screenshot with Modal.png" alt="Screenshot with Modal" width="800" height="600">

#### Compatability
- This web app is tested against Safari `18.6`, but it should work in other modern browsers (it loads in current 
  versions of FireFox and Chrome, but is not fully tested in those browsers).
- This web app is not designed to be run on small screens, but it should theoretically work if your small screen device 
  can access the Indigo logs folder.

Add suggestions and error reports using the issues tab above.
