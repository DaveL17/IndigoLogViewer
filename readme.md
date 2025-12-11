## Indigo Log Viewer

---

The ***Indigo Log Viewer*** is a simple web-based app that is intended to be a front end viewer of Indigo log files.

<img src="assets/images/Screenshot.png" alt="Screenshot" width="800" height="600">

While it might work for other log files as well, it is expecting log file entries to be of the form 
`[POSIX Timestamp][Message Class][Message]`.
```text
2025-09-10 11:52:01.833	Action Collection	Webhook Post/Form Received
```
 This is the only format that is supported.

### Usage

---
> [!NOTE] 
> The structure of the project has changed from the initial release. While it's still possible to manually copy the
project files individually, downloading the "official" release is now the best and safest approach.

For the best experience, get the latest official release. Select releases on the right and choose the release to 
download. Unzip the files into a working folder and double-click the html file (or select File > Open from your 
preferred browser).

### Menu

---
Use the hamburger menu in the upper right-hand corner to access app features.

#### Choose Log Folder
<kbd>Choose Log Folder</kbd> Select this option to load all the log files to view (you can also use this menu item to 
select a single log file). The app supports opening log files from a network location; however, this can affect load 
times depending on the speed of your network and the amount of data contained within the log files selected. Be 
patient, it may take a few beats to load. On an M4 MacBook, it loads 200,000 log lines in less than a second when run 
on the server machine.

#### Choose Log Files
<kbd>Choose Log Files</kbd> Select this option to load multiple files at once (including discontinuous files).

#### File Info
<kbd>File Info</kbd> Select this option to see useful information about the files loaded. The tool shows file name, file 
size, and the number of entries per file. This is a handy way to see if any of your log files are outside the norm. For 
example, if your typical log file is typically 700K, a 1MB file will stand out. There are two views for this dialog--list 
view and chart view. Use the button at the bottom of the dialog to toggle between the two views.

While in chart view, you can hide individual series by clicking on it within the legend.

#### File Info List View
<img src="assets/images/fileInfoListView.png" alt="File Info List View" width="800" height="600">

#### File Info Chart View
<img src="assets/images/fileInfoChartView.png" alt="File Info Chart View" width="800" height="600">

#### Themes
<kbd>[Light/Dark] Theme</kbd> The app supports two themes. It will remember your choice for the future; however, if you 
clear your browser's cache, the preference may be cleared if you delete the app's local storage. This is a "universal" 
browser security feature. To toggle the theme, select  from the menu.

#### Help
<kbd>Help</kbd> Select this option to view the GitHub repository and this readme file.

#### About
<kbd>About</kbd> Typical About information.

### Search Tools

---
#### Class Filter
The Class Filter dropdown will list all the message classes that exist in the loaded log files. This control is built 
dynamically; that is, when you first load the app, there will be no classes listed in the control. Once the control is
populated, it will contain all the classes that are contained in the loaded data. By default, all classes are shown. To
exclude classes uncheck their dropdown entry. You can also unselect all classes and then begin to build a list by
re-enabling classes one by one.

#### Text Search
Use the Text Search tool to find specific strings of text. The search entry is a literal search (it doesn't support 
complex search patterns.)

#### Date Filter
To limit the log entry list to a specific date or date range, use the Date Filter inputs. To clear a previous date range
selection, click the <kbd>Clear</kbd> button.

### Viewing Area

---
The log messages from the selected files are displayed in this area. Initially, it will contain all loaded messages; 
however, the list will update as filters are applied. Click on a message and it will open in a modal dialog. This is
especially helpful for multiline log messages which are truncated in the main view. There is a <kbd>Copy</kbd> button
provided in the modal which will copy the entire log entry displayed.

The log file view is not updated in real time. To reload the log entry list to view new log entries, it's necessary to
re-choose the log folder (due to legitimate modern browser-imposed security features).

<img src="assets/images/Screenshot with Modal.png" alt="Screenshot with Modal" width="800" height="600">

#### Columns
Both the timestamp and class columns are sortable in place. You can click on the column heading to sort the data. You 
can sort only one column at a time. Additionally, both columns are resizeable if needed.

### Compatability

---
- This web app is tested against Safari `18.6`, but it should work in other modern browsers (it loads in current 
  versions of FireFox and Chrome, but is not fully tested in those browsers).
- This web app is not designed to be run on small screens, but it should theoretically work if your small screen device 
  can access the Indigo logs folder.

### Getting Creative

---
You can move the app's files to Indigo's public webserver folder and serve the app from there. This will allow you to 
add the app to the dock and make it a stand-alone web personal web app (PWA). You can also serve the app from node.js. 
There are lots of options, but you are on your own for configuring anything beyond the instructions above.

### Suggestions and Error Reports

---
Add suggestions and error reports using the issues tab above.

### Serving the App from Indigo

---
One suggested place store the Indigo Log Viewer files is in the Indigo Web Assets tree. Copy the entire contents of the 
ZIP you downloaded to Indigo's public Web Assets folder:
```bash
/Library/Application Support/Perceptive Automation/Indigo XXXX.X/Web Assets/public/
```
Then the URL to the application would be something like:
```bash
https://localhost:8176/public/log_viewer_app.html
```
This is only one possible approach, and you may need to adjust the above depending on your installation.  You 
can then put a link on a control page and launch the app from there, launch it from a bookmark, whatever. 

> [!WARNING] 
> Indigo's public web assets folder is served up without authentication so anyone that has access to your server's IP or 
> has your reflector name can access the contents of this folder. You can also place the app's files in the static Web 
> Assets folder which requires authentication. Regardless, no one will have access to your Indigo log files unless they 
> are able to point to that folder (and have access to read its contents.)
