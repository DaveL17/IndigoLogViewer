## Indigo Log Viewer

The ***Indigo Log Viewer*** is a simple web-based app that is intended to be a front end viewer of Indigo log files.
While it might work for other log files as well, it is expecting log file entries to be of the form 
`[POSIX Timestamp][Message Class][Message]`. No other log entry format is supported. For example, 
```text
2025-09-10 11:52:01.833	Action Collection	Webhook Post/Form Received
```

### Usage

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
list will update as filters are applied. You can click on a message and it will open in a modal dialog. This is
especially helpful for multiline log messages which are truncated in the main view. There is a <kbd>Copy</kbd> button
in the modal for convenience.
