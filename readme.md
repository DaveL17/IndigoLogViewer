## Indigo Log Viewer

The ***Indigo Log Viewer*** is a simple web-based app that is intended to be a front end viewer of Indigo log files.
While it might work for other log files as well, it is expecting log file entries to be of the form 
`[POSIX Timestamp][Message Class][Message]`. No other log entry format is supported. For example, 
```text
2025-09-10 11:52:01.833	Action Collection	Webhook Post/Form Received
```

[Screenshot](src/Screenshot.png)

### Usage
The app requires three files to run:
1. log_viewer_app.css
2. log_viewer_app.html
3. log_viewer_app.js

Download the files using the <kbd>Code</kbd> button above and unzip the files into a working folder. Then double-click the 
html file or select File > Open from your preferred browser.

#### Choose Log Folder
Click the <kbd>Choose Log Folder</kbd> button and browse to the log folder of your target Indigo install. Select the 
folder to load all the log files or select a single log file to view. The app supports opening log files from a 
network location; however, this can affect load times depending on the amount of data contained within the log files
selected. Be patient, it may take a few beats to load.

#### Reload
The view is not updated in real time. To reload the log entry list, click the <kbd>Reload button</kbd>. If no log
files have been loaded, the <kbd>Reload button</kbd> will be hidden.

#### Date Filter
To limit the log entry list to a specific date or date range, use the Date Filter inputs. To clear a previous selection,
click the <kbd>Clear</kbd> button.

#### Class Filter
The Class Filter dropdown will list all the message classes that exist in the loaded log files.

#### Text Search
Use the Text Search tool to find specific strings of text. The search entry is a literal search (it doesn't support 
complex search patterns.)

#### Themes
The app supports a light and dark theme; the selection is transient aat this time.

#### Viewing Area
The log messages from the selected files are displayed. Initially, it will contain all loaded messages; however, the 
list will update as filters are applied. Click on a message and it will open in a modal dialog. This is
especially helpful for multiline log messages which are truncated in the main view. There is a <kbd>Copy</kbd> button
in the modal for convenience.

[Screenshot with Modal](src/Screenshot%20with%20Modal.png)

#### Compatability
- This web app is tested against Safari `18.6`, but it should work in other modern browsers (it loads in current 
  versions of FireFox and Chrome).
- This web app is not intended to be run on small screens, but it should theoretically work if your small screen device 
  can read the Indigo logs folder.

Add Suggestions and Error Reports using the Issues tab above.
