console.log(APP_VERSION);

let allLogEntries = [];
let availableClasses = new Set();
let availableDates = [];
let currentModalEntry = null;
let filteredEntries = [];
let loadedFileInfo = [];
let selectedClasses = new Set(); // Track selected classes for filtering
let selectedRowIndex = -1;
let visibleStart = 0;
let visibleEnd = 0;

// Virtual scrolling variables
const BUFFER_SIZE = 10; // Extra rows to render above/below visible area
const ROW_HEIGHT = 32; // Minimum height per row
const scrollContainer = document.getElementById('scrollContainer');
const virtualSpacer = document.getElementById('virtualSpacer');
const virtualContent = document.getElementById('virtualContent');

// keep applyFilters() from being called on every keystroke by adding a short wait.
let textFilterTimeout;
document.getElementById('textFilter').addEventListener('input', () => {
    clearTimeout(textFilterTimeout);
    textFilterTimeout = setTimeout(applyFilters, 300);
});

// Inject common config values into DOM once it's loaded
document.addEventListener('DOMContentLoaded', () => {
	// TODO - if this list gets long, consider wrapping in a for each loop
  	document.getElementById('tabTitle').textContent = APP_NAME;
  	document.getElementById('appTitle').textContent = APP_NAME;
  	document.getElementById('aboutTitle').textContent = APP_NAME;
  	document.getElementById('aboutAuthor').textContent = AUTHOR;
  	document.getElementById('aboutVersion').textContent = APP_VERSION;
});

// Sorting variables
let currentSort = {
    column: 'timestamp',
    direction: 'desc' // Default sort to newest entry first
};

// ============================================================================
// Sorting functions
// ============================================================================
function sortBy(column) {
    // Don't sort if we're in the middle of a resize operation
    if (isResizing) {
        return;
    }

    // If clicking the same column, toggle direction
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to ascending (except timestamp which defaults to desc for newest first)
        currentSort.column = column;
        currentSort.direction = column === 'timestamp' ? 'desc' : 'asc';
    }

    applySorting();
    updateSortIndicators();

    // Reset selection and scroll to top after sorting
    selectedRowIndex = -1;
    scrollContainer.scrollTop = 0;
    renderVirtualList();
}

//=============================================================================
// Apply the sort
//=============================================================================
function applySorting() {
    if (filteredEntries.length === 0) return;

    filteredEntries.sort((a, b) => {
        let comparison = 0;

        switch (currentSort.column) {
            case 'timestamp':
                comparison = a.timestamp.getTime() - b.timestamp.getTime();
                break;
            case 'class':
                comparison = a.class.toLowerCase().localeCompare(b.class.toLowerCase());
                break;
            default:
                return 0;
        }

        return currentSort.direction === 'desc' ? -comparison : comparison;
    });
}

//=============================================================================
// Update column sort indicators
//=============================================================================
function updateSortIndicators() {
    // Clear all indicators
    const indicators = document.querySelectorAll('.sort-indicator');
    indicators.forEach(indicator => {
        indicator.className = 'sort-indicator';
    });

    // Set the active indicator
    const activeIndicator = document.getElementById(`sort${currentSort.column.charAt(0).toUpperCase() + currentSort.column.slice(1)}`);
    if (activeIndicator) {
        activeIndicator.className = `sort-indicator ${currentSort.direction}`;
    }
}

// ============================================================================
// Class filter dropdown functions
// ============================================================================
function toggleClassFilter() {
    const dropdown = document.getElementById('classFilterDropdown');
    const classList = document.getElementById('classFilterList');
    const isOpen = dropdown.classList.contains('show');

    if (isOpen) {
        dropdown.classList.remove('show');
    } else {
        dropdown.classList.add('show');
        // Reset scroll position to top when opening
        if (classList) {
            classList.scrollTop = 0;
        }
    }
}

//=============================================================================
// Toggle all classes (hide/show)
//=============================================================================
function toggleAllClasses() {
    const selectAllCheckbox = document.getElementById('selectAllClasses');
    const classCheckboxes = document.querySelectorAll('.class-filter-list input[type="checkbox"]');

    // Toggle all checkboxes to match the select all state
    classCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });

    updateSelectedClasses();
    updateClassFilterButton();
    applyFilters();
}

//=============================================================================
// Toggle class selection
//=============================================================================
function toggleClassSelection(className) {
	selectedClasses.has(className) ? selectedClasses.delete(className) : selectedClasses.add(className);

    updateSelectAllCheckbox();
    updateClassFilterButton();
    applyFilters();
}

//=============================================================================
// Update select check box
//=============================================================================
function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllClasses');
    const classCheckboxes = document.querySelectorAll('.class-filter-list input[type="checkbox"]');
    const checkedCount = Array.from(classCheckboxes).filter(cb => cb.checked).length;

    selectAllCheckbox.checked = checkedCount === classCheckboxes.length;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < classCheckboxes.length;
}

//=============================================================================
// Update selected classes
//=============================================================================
function updateSelectedClasses() {
    selectedClasses.clear();
    const classCheckboxes = document.querySelectorAll('.class-filter-list input[type="checkbox"]');

    classCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedClasses.add(checkbox.value);
        }
    });
}

//=============================================================================
// Update class filter button
//=============================================================================
function updateClassFilterButton() {
    const button = document.getElementById('classFilterButton');
    const totalClasses = availableClasses.size;
    const selectedCount = selectedClasses.size;

    let buttonText;
    if (totalClasses === 0) {
        buttonText = 'Class Filter'; // Default when no files loaded
    } else if (selectedCount === 0) {
        buttonText = 'No Classes';
    } else if (selectedCount === totalClasses) {
        buttonText = 'All Classes';
    } else if (selectedCount === 1) {
        buttonText = '1 Class Selected';
    } else {
        buttonText = `${selectedCount} Classes Selected`;
    }

    button.innerHTML = `<span>${buttonText}</span><span>▼</span>`;
}

// Close class filter when clicking outside
document.addEventListener('click', function(event) {
    const classFilterContainer = document.querySelector('.class-filter-container');
    const dropdown = document.getElementById('classFilterDropdown');

    if (dropdown && dropdown.classList.contains('show')) {
        if (!classFilterContainer.contains(event.target)) {
            dropdown.classList.remove('show');
            event.stopPropagation();
            event.preventDefault();
        }
    }
}, true); // Use capture phase

//=============================================================================
// Help Menu item
//=============================================================================
function openHelp() {
    const helpUrl = 'https://github.com/DaveL17/IndigoLogViewer';
	window.open(helpUrl, '_blank');

    // Close the hamburger menu
    document.getElementById('hamburgerDropdown').classList.remove('show');
}

//=============================================================================
// Hamburger menu functions
//=============================================================================
function toggleMenu() {
	const dropdown = document.getElementById('hamburgerDropdown');
	const isOpen = dropdown.classList.contains('show');

	if (isOpen) {
		dropdown.classList.remove('show');
	} else {
		dropdown.classList.add('show');
		updateMenuItems();
	}
}

//=============================================================================
// Update menu items
//=============================================================================
function updateMenuItems() {
	// Update theme menu item text
	const themeMenuItem = document.getElementById('themeMenuItem');
	const currentTheme = document.body.dataset.theme;
	themeMenuItem.textContent = currentTheme === 'dark' ? 'Light Theme' : 'Dark Theme';

	// Update file info menu item state. Disabled when no files have been loaded.
	const fileInfoMenuItem = document.getElementById('fileInfoMenuItem');
	loadedFileInfo.length === 0 ? fileInfoMenuItem.classList.add('disabled') : fileInfoMenuItem.classList.remove('disabled');
}

//=============================================================================
// Close menu when clicking outside
//=============================================================================
document.addEventListener('click', function(event) {
	const hamburgerMenu = document.querySelector('.hamburger-menu');
	const dropdown = document.getElementById('hamburgerDropdown');

	if (!hamburgerMenu.contains(event.target)) {
		dropdown.classList.remove('show');
	}
});

//=============================================================================
// Toast notification system
//=============================================================================
function showToast(message, type = 'info', duration = 4000) {
	const toastContainer = document.getElementById('toastContainer');
	const toast = document.createElement('div');
	toast.className = `toast ${type}`;
	toast.textContent = message;

	toastContainer.appendChild(toast);

	// Trigger show animation
	setTimeout(() => toast.classList.add('show'), 100);

	// Hide and remove after duration
	setTimeout(() => {
		toast.classList.add('hide');
		setTimeout(() => {
			if (toast.parentNode) {
				toast.parentNode.removeChild(toast);
			}
		}, 300);
	}, duration);
}

//=============================================================================
// Color log message class field entries error=red, warning=orange, debug=green
//=============================================================================
function getClassColorClass(className) {
	const lowerClass = className.toLowerCase();
	if (lowerClass.includes('error')) {
		return 'error-class';
	} else if (lowerClass.includes('warning')) {
		return 'warning-class';
	} else if (lowerClass.includes('debug')) {
		return 'debug-class';
	}
	return '';
}

//=============================================================================
// Parse log entry
//=============================================================================
function parseLogEntry(entryText) {
	// Parse format: YYYY-MM-DD HH:MM:SS.fff\tClass\tLog Entry (potentially multi-line)
	const firstTab = entryText.indexOf('\t');
	const secondTab = entryText.indexOf('\t', firstTab + 1);

	if (firstTab === -1 || secondTab === -1) {
		return null;
	}

	const timestamp = entryText.substring(0, firstTab).trim().replace(' ', 'T').replace(/^(.*:\d{2})(?!\.\d{3})$/, '$1.000');
	const logClass = entryText.substring(firstTab + 1, secondTab).trim();
	const entry = entryText.substring(secondTab + 1).trim();

	return {
		timestamp: new Date(timestamp),
		timestampString: timestamp.replace('T', ' '),  // take the 'T' back out for display
		class: logClass,
		entry: entry,
		originalLine: entryText
	};
}

//=============================================================================
// Parse log content
//=============================================================================
function parseLogContent(content) {
	content = content.replace(/^\uFEFF/, '');  // Remove BOM if present

	// Timestamp pattern to match format: YYYY-MM-DD HH:MM:SS.fff
	const timestampPattern = /^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}(?:\.\d{3})?/;

	const lines = content.split('\n');
	const logEntries = [];
	let currentEntry = null;

	for (const line of lines) {
		// Check if this line starts a new log entry
		if (timestampPattern.test(line)) {
			// Save previous entry if it exists
			if (currentEntry) {
				const parsedEntry = parseLogEntry(currentEntry);
				if (parsedEntry) {
					logEntries.push(parsedEntry);
				}
			}
			// Start new entry
			currentEntry = line;
		} else if (currentEntry !== null && line.trim()) {
			// This is a continuation of the current entry (ignore empty lines)
			currentEntry += '\n' + line;
		}
	}

	// Don't forget the last entry
	if (currentEntry) {
		const parsedEntry = parseLogEntry(currentEntry);
		if (parsedEntry) {
			logEntries.push(parsedEntry);
		}
	}

	return logEntries;
}

//=============================================================================
// Select log folder
//=============================================================================
function selectFolder() {
	const folderInput = document.getElementById('folderInput');
	const fileInput = document.getElementById('fileInput');
	// Reset both inputs to ensure clean state
	folderInput.value = '';
	fileInput.value = ''; // Clear the file input
	loadedFileInfo = []; // Reset file info when selecting new folder
	folderInput.click();
	// Close the hamburger menu after selection
	document.getElementById('hamburgerDropdown').classList.remove('show');
}

//=============================================================================
// Select log files
//=============================================================================
function selectFiles() {
	const folderInput = document.getElementById('folderInput');
	const fileInput = document.getElementById('fileInput');
	// Reset both inputs to ensure clean state
	folderInput.value = ''; // Clear the folder input
	fileInput.value = '';
	loadedFileInfo = [];
	fileInput.click();
	document.getElementById('hamburgerDropdown').classList.remove('show');
}

//=============================================================================
// Load selected log files
//=============================================================================
async function loadLogFiles() {
	const folderInput = document.getElementById('folderInput');
	const fileInput = document.getElementById('fileInput');

	let filesToProcess;
	let inputSource;

	if (folderInput.files.length > 0) {
		filesToProcess = folderInput.files;
		inputSource = 'folder';
	} else if (fileInput.files.length > 0) {
		filesToProcess = fileInput.files;
		inputSource = 'files';
	} else {
		showToast('Please select log files or a folder containing log files', 'error');
		return;
	}

	allLogEntries = [];
	availableClasses.clear();
	clearError();

	try {
		// Filter files to match the pattern YYY-MM-DD Events.*
		const logFiles = Array.from(filesToProcess).filter(file => {
			const fileName = file.name;
			// Match pattern like "2025-09-02 Events.txt" or "2025-09-02 Events.log"
			const datePattern = /^\d{4}-\d{2}-\d{2}\s+Events\./i;
			return datePattern.test(fileName);
		});

		if (logFiles.length === 0) {
			showToast('No log files found matching pattern "YYYY-MM-DD Events.*" in selected folder', 'error');
			return;
		}

		let processedFiles = 0;
		let skippedFiles = 0;
		const totalFiles = logFiles.length;
		const fileErrors = new Map(); // Track unique error types to avoid spam

		for (let file of logFiles) {
			try {
				let content = await readFileContent(file);

				// Check if content is meaningful (not just whitespace)
				if (!content || content.trim().length === 0) {
					console.warn(`Skipping empty file: ${file.name}`);
					skippedFiles++;
					continue;
				}

				const entries = parseLogContent(content);

				if (entries.length === 0) {
					console.warn(`No valid log entries found in file: ${file.name}`);
					skippedFiles++;
					continue;
				}

				// Store file info
				loadedFileInfo.push({
					name: file.name,
					size: file.size,
					entryCount: entries.length
				});

				for (let entry of entries) {
					allLogEntries.push(entry);
					availableClasses.add(entry.class);
				}

				processedFiles++;
				console.log(`Successfully processed ${file.name}: ${entries.length} entries`);

			} catch (fileError) {
				// Group similar errors to avoid console spam
				const errorKey = fileError.message.split(' - File:')[0]; // Get error type without filename
				if (!fileErrors.has(errorKey)) {
					fileErrors.set(errorKey, []);
				}
				fileErrors.get(errorKey).push(file.name);

				skippedFiles++;
			}
		}
		// Log consolidated error report
		if (fileErrors.size > 0) {
			console.group('File Processing Errors:');
			fileErrors.forEach((files, errorType) => {
				if (files.length === 1) {
					console.error(`${errorType}: ${files[0]}`);
				} else {
					console.error(`${errorType} (${files.length} files):`, files);
				}
			});
			console.groupEnd();
		}

		if (processedFiles === 0) {
			showToast('No files could be processed successfully', 'error');
			return;
		}

		// Sort entries by timestamp in reverse order (most recent first)
		allLogEntries.sort((a, b) => b.timestamp - a.timestamp);

		// Get unique dates for the date range inputs
		availableDates = [...new Set(allLogEntries.map(entry => {
			const entryYear = entry.timestamp.getFullYear();
			const entryMonth = String(entry.timestamp.getMonth() + 1).padStart(2, '0');
			const entryDay = String(entry.timestamp.getDate()).padStart(2, '0');
			return `${entryYear}-${entryMonth}-${entryDay}`;
		}))].sort().reverse();

		updateFilters();
		setDefaultDateRange();
		applyFilters();

		// Select the most recent entry (first row) after loading
		if (filteredEntries.length > 0) {
			selectedRowIndex = 0;
			scrollToSelectedRow();
			renderVirtualList();
		}

		updateStats();
		updateSortIndicators(); // Show initial sort indicators

		// Create detailed success message
		let successMessage;
		if (skippedFiles > 0) {
			successMessage = `Successfully loaded ${processedFiles}/${totalFiles} log files (${skippedFiles} files skipped due to errors)`;
			console.log(`Processing summary: ${processedFiles} successful, ${skippedFiles} skipped/failed`);
		} else {
			successMessage = `Successfully loaded ${processedFiles} log file${processedFiles > 1 ? 's' : ''}`;
		}

		showToast(successMessage, 'success');

	} catch (error) {
		const sourceText = inputSource === 'folder' ? 'selected folder' : 'selected files';
		showToast(`No log files found matching pattern "YYYY-MM-DD Events.*" in ${sourceText}`, 'error');
	}
}

//=============================================================================
// Read file content
//=============================================================================
async function readFileContent(file, retryCount = 0, maxRetries = 3) {
    const RETRY_DELAYS = [500, 1500, 3000]; // Wait 0.5s, 1.5s, 3s between retries

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = e => {
            // Check if we actually got content
            if (e.target.result === null || e.target.result === undefined) {
                if (retryCount < maxRetries) {
                    console.log(`File empty or unreadable: ${file.name}, retrying in ${RETRY_DELAYS[retryCount]}ms...`);
                    setTimeout(async () => {
                        try {
                            const result = await readFileContent(file, retryCount + 1, maxRetries);
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    }, RETRY_DELAYS[retryCount]);
                } else {
                    reject(new Error(`File is empty or unreadable after ${maxRetries} attempts: ${file.name}`));
                }
                return;
            }
            resolve(e.target.result);
        };

        reader.onerror = () => {
            // Get more specific error information
            let errorMsg = 'Unknown read error';
            let shouldRetry = false;

			if (reader.error) {
				const errorName = reader.error.name;

				switch (errorName) {
					case 'NotFoundError':
						errorMsg = 'File not found';
						shouldRetry = true;
						break;
					case 'NotReadableError':
						errorMsg = 'File not readable (may be locked or being written to)';
						shouldRetry = true;
						break;
					case 'AbortError':
						errorMsg = 'Read operation aborted';
						shouldRetry = false;
						break;
					case 'SecurityError':
						errorMsg = 'Security error (file may be locked or have restricted access)';
						shouldRetry = true;
						break;
					case 'EncodingError':
						errorMsg = 'File encoding error';
						shouldRetry = false;
						break;
					default:
						errorMsg = reader.error.message || 'FileReader error';
						shouldRetry = true;
						break;
				}
			}
            // Retry if appropriate
            if (shouldRetry && retryCount < maxRetries) {
                console.log(`${errorMsg} for ${file.name}, retrying in ${RETRY_DELAYS[retryCount]}ms... (attempt ${retryCount + 1}/${maxRetries})`);
                setTimeout(async () => {
                    try {
                        const result = await readFileContent(file, retryCount + 1, maxRetries);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }, RETRY_DELAYS[retryCount]);
            } else {
                reject(new Error(`${errorMsg} - File: ${file.name} (Size: ${file.size} bytes)${retryCount > 0 ? ` after ${retryCount} retries` : ''}`));
            }
        };

        reader.onabort = () => {
            // Don't retry aborted operations
            reject(new Error(`File read was aborted: ${file.name}`));
        };

        // Extended timeout for network files and files being written to
        const timeout = setTimeout(() => {
            reader.abort();

            // Retry on timeout if we have retries left
            if (retryCount < maxRetries) {
                console.log(`File read timeout for ${file.name}, retrying in ${RETRY_DELAYS[retryCount]}ms...`);
                setTimeout(async () => {
                    try {
                        const result = await readFileContent(file, retryCount + 1, maxRetries);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }, RETRY_DELAYS[retryCount]);
            } else {
                reject(new Error(`File read timeout after ${maxRetries} attempts: ${file.name} (Size: ${file.size} bytes)`));
            }
        }, 30000); // 30 second timeout per attempt

        reader.onloadend = () => {
            clearTimeout(timeout);
        };

        try {
            reader.readAsText(file);
        } catch (error) {
            clearTimeout(timeout);

            // Retry on exception if we have retries left
            if (retryCount < maxRetries) {
                console.log(`Failed to start reading ${file.name}: ${error.message}, retrying in ${RETRY_DELAYS[retryCount]}ms...`);
                setTimeout(async () => {
                    try {
                        const result = await readFileContent(file, retryCount + 1, maxRetries);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                }, RETRY_DELAYS[retryCount]);
            } else {
                reject(new Error(`Failed to start reading file after ${maxRetries} attempts: ${file.name} - ${error.message}`));
            }
        }
    });
}

//=============================================================================
// Update class filter list
//=============================================================================
function updateFilters() {
	const classFilterList = document.getElementById('classFilterList');
	classFilterList.innerHTML = '';

	const sortedClasses = [...availableClasses].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

	// First, ensure all classes are selected if this is initial load
	if (selectedClasses.size === 0) {
		sortedClasses.forEach(cls => selectedClasses.add(cls));
	}

	sortedClasses.forEach(cls => {
		const isChecked = selectedClasses.has(cls);
		const itemDiv = document.createElement('div');
		itemDiv.className = 'class-filter-item';
		itemDiv.onclick = function(e) {
			if (e.target.tagName !== 'INPUT') {
				const checkbox = this.querySelector('input[type="checkbox"]');
				checkbox.checked = !checkbox.checked;
			}
			toggleClassSelection(cls);
		};

		itemDiv.innerHTML = `
			<input type="checkbox" id="class-${cls}" value="${cls}" ${isChecked ? 'checked' : ''} 
				   onclick="event.stopPropagation(); toggleClassSelection('${cls}')">
			<label for="class-${cls}" onclick="event.stopPropagation()">${escapeHtml(cls)}</label>
		`;

		classFilterList.appendChild(itemDiv);
	});

	updateSelectAllCheckbox();
	updateClassFilterButton();

	// Set date range for date pickers
	const startDateFilter = document.getElementById('startDateFilter');
	const endDateFilter = document.getElementById('endDateFilter');

	if (availableDates.length > 0) {
		const minDate = availableDates[availableDates.length - 1];
		const maxDate = availableDates[0];

		startDateFilter.min = minDate;
		startDateFilter.max = maxDate;
		endDateFilter.min = minDate;
		endDateFilter.max = maxDate;
	}
}

//=============================================================================
// Set default date range
//=============================================================================
function setDefaultDateRange() {
	if (availableDates.length > 0) {
		const startDateFilter = document.getElementById('startDateFilter');
		const endDateFilter = document.getElementById('endDateFilter');
		const oldestDate = availableDates[availableDates.length - 1];
		const newestDate = availableDates[0]; // Most recent date

		// Use setTimeout to ensure the value is set after the DOM update
		setTimeout(() => {
			startDateFilter.value = oldestDate;
			endDateFilter.value = newestDate; // Set end date to most recent
		}, 0);
	}
}

//=============================================================================
// Apply filters
//=============================================================================
function applyFilters() {
	let filtered = [...allLogEntries];

	// Apply date range filter
	const startDate = document.getElementById('startDateFilter').value;
	const endDate = document.getElementById('endDateFilter').value;

	if (startDate || endDate) {
		filtered = filtered.filter(entry => {
			// Get the date in local timezone to avoid UTC conversion issues
			const entryYear = entry.timestamp.getFullYear();
			const entryMonth = String(entry.timestamp.getMonth() + 1).padStart(2, '0');
			const entryDay = String(entry.timestamp.getDate()).padStart(2, '0');
			const entryDate = `${entryYear}-${entryMonth}-${entryDay}`;

			const afterStart = !startDate || entryDate >= startDate;
			const beforeEnd = !endDate || entryDate <= endDate;
			return afterStart && beforeEnd;
		});
	}

	// Apply class filter - only include entries with selected classes
	if (selectedClasses.size === 0) {
		// No classes selected - show nothing
		filtered = [];
	} else if (selectedClasses.size < availableClasses.size) {
		// Some but not all classes selected - filter to selected classes
		filtered = filtered.filter(entry => selectedClasses.has(entry.class));
	}
	// If all classes selected (size === availableClasses.size), show all (no filtering)

	// Apply text filter
	const textFilter = document.getElementById('textFilter').value.toLowerCase();
	if (textFilter) {
		filtered = filtered.filter(entry =>
			entry.entry.toLowerCase().includes(textFilter) ||
			entry.class.toLowerCase().includes(textFilter) ||
			entry.timestampString.toLowerCase().includes(textFilter)
		);
	}

	filteredEntries = filtered;
	applySorting(); // Apply current sorting after filtering
	selectedRowIndex = -1; // Reset selection when filters change
	renderVirtualList();
	updateStats();
}

//=============================================================================
// Render virtual list
//=============================================================================
function renderVirtualList() {
	if (filteredEntries.length === 0) {
		virtualSpacer.style.height = '0px';
		virtualContent.innerHTML = `
			<div class="empty-state">
				${allLogEntries.length === 0 ? 'Please load log files to view entries' : 'No entries match the current filters'}
			</div>
		`;
		return;
	}

	const containerHeight = scrollContainer.clientHeight;
	const scrollTop = scrollContainer.scrollTop;
	const totalHeight = filteredEntries.length * ROW_HEIGHT;

	// Calculate visible range
	const visibleStartIndex = Math.floor(scrollTop / ROW_HEIGHT);
	const visibleEndIndex = Math.min(
		filteredEntries.length - 1,
		Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT)
	);

	// Add buffer
	visibleStart = Math.max(0, visibleStartIndex - BUFFER_SIZE);
	visibleEnd = Math.min(filteredEntries.length - 1, visibleEndIndex + BUFFER_SIZE);

	// Set spacer height to maintain scroll position
	virtualSpacer.style.height = `${totalHeight}px`;

	// Generate visible rows
	const rowsHtml = [];
	for (let i = visibleStart; i <= visibleEnd; i++) {
		const entry = filteredEntries[i];
		const colorClass = getClassColorClass(entry.class);
		const isSelected = i === selectedRowIndex;

		// Truncate entry text for display in the table
		const truncatedEntry = entry.entry.length > 100 ? entry.entry.substring(0, 100) + '...' : entry.entry;

		rowsHtml.push(`
			<div class="log-row ${isSelected ? 'selected' : ''}"
				 style="transform: translateY(${i * ROW_HEIGHT}px); position: absolute; width: 100%;"
				 data-index="${i}" onclick="selectRow(this, ${i})">
				<div class="row-timestamp">${entry.timestampString}</div>
				<div class="row-class ${colorClass}" title="${escapeHtml(entry.class)}">${escapeHtml(entry.class)}</div>
				<div class="row-entry" title="Click to view full details">${escapeHtml(truncatedEntry)}</div>
			</div>
		`);
	}

	virtualContent.innerHTML = rowsHtml.join('');
}

//=============================================================================
// Select log row entry
//=============================================================================
function selectRow(clickedRow, index) {
	selectedRowIndex = index;

	// Update selection visually
	const allRows = document.querySelectorAll('.log-row');
	allRows.forEach(row => row.classList.remove('selected'));
	clickedRow.classList.add('selected');

	// Open modal with full log entry details
	openModal(filteredEntries[index]);
}

//=============================================================================
// Arrow key navigation for selected rows
//=============================================================================

//=============================================================================
// Row up
//=============================================================================
function navigateRowUp() {
	if (filteredEntries.length === 0) return;

	if (selectedRowIndex > 0) {
		selectedRowIndex--;
		scrollToSelectedRow();
		renderVirtualList();
	}
}

//=============================================================================
// Row down
//=============================================================================
function navigateRowDown() {
	if (filteredEntries.length === 0) return;

	if (selectedRowIndex < filteredEntries.length - 1) {
		selectedRowIndex++;
		scrollToSelectedRow();
		renderVirtualList();
	} else if (selectedRowIndex === -1 && filteredEntries.length > 0) {
		// If no row is selected, select the first one
		selectedRowIndex = 0;
		scrollToSelectedRow();
		renderVirtualList();
	}
}

//=============================================================================
// Scroll to selected row
//=============================================================================
function scrollToSelectedRow() {
	if (selectedRowIndex === -1) return;

	const containerHeight = scrollContainer.clientHeight;
	const rowTop = selectedRowIndex * ROW_HEIGHT;
	const rowBottom = rowTop + ROW_HEIGHT;
	const scrollTop = scrollContainer.scrollTop;
	const scrollBottom = scrollTop + containerHeight;

	// Check if row is above visible area
	if (rowTop < scrollTop) {
		scrollContainer.scrollTop = rowTop;
	}
	// Check if row is below visible area
	else if (rowBottom > scrollBottom) {
		scrollContainer.scrollTop = rowBottom - containerHeight;
	}
}

// ============================================================================
// Navigation functions
// ============================================================================

//=============================================================================
// Navigate to top of entry list
//=============================================================================
function navigateToTop() {
	scrollContainer.scrollTop = 0;
	selectedRowIndex = 0;
	requestAnimationFrame(renderVirtualList);
}

//=============================================================================
// Navigate to end of entry list
//=============================================================================
function navigateToEnd() {
	scrollContainer.scrollTop = scrollContainer.scrollHeight;
	selectedRowIndex = filteredEntries.length - 1;
	requestAnimationFrame(renderVirtualList);
}

//=============================================================================
// Page up from current view
//=============================================================================
function navigatePageUp() {
	const containerHeight = scrollContainer.clientHeight;
	const pageRows = Math.floor(containerHeight / ROW_HEIGHT);

	scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - (pageRows * ROW_HEIGHT));

	const newVisibleStart = Math.floor(scrollContainer.scrollTop / ROW_HEIGHT);
	selectedRowIndex = Math.max(0, newVisibleStart);
	requestAnimationFrame(renderVirtualList);
}

//=============================================================================
// Page down from current view
//=============================================================================
function navigatePageDown() {
	const containerHeight = scrollContainer.clientHeight;
	const pageRows = Math.floor(containerHeight / ROW_HEIGHT);

	scrollContainer.scrollTop = Math.min(
		scrollContainer.scrollHeight - containerHeight,
		scrollContainer.scrollTop + (pageRows * ROW_HEIGHT)
	);

	const newVisibleStart = Math.floor(scrollContainer.scrollTop / ROW_HEIGHT);
	selectedRowIndex = Math.min(filteredEntries.length - 1, newVisibleStart);
	requestAnimationFrame(renderVirtualList);
}

//=============================================================================
// Update stats shown in footer
//=============================================================================
function updateStats() {
	const footer = document.getElementById('footer');
	if (allLogEntries.length === 0) {
		footer.textContent = 'No log files loaded';
	} else {
		const totalEntries = allLogEntries.length;
		const displayedEntries = filteredEntries.length;
		const totalDays = availableDates.length;

		footer.textContent = `Showing ${displayedEntries} of ${totalEntries} entries from ${totalDays} day${totalDays !== 1 ? 's' : ''}`;
	}
}

//=============================================================================
// Clear text filter contents
//=============================================================================
function clearTextFilter() {
	document.getElementById('textFilter').value = '';
	applyFilters();
}

//=============================================================================
// Clear date filter contents
//=============================================================================
function clearDateFilter() {
	document.getElementById('startDateFilter').value = '';
	document.getElementById('endDateFilter').value = '';
	applyFilters();
}

//=============================================================================
// Toggle App Theme
//=============================================================================
function toggleTheme() {
    const body = document.body;
    const themeMenuItem = document.getElementById('themeMenuItem');

    if (body.dataset.theme === 'light') {
        body.dataset.theme = 'dark';
        themeMenuItem.textContent = 'Light Theme';
        localStorage.setItem('theme', 'dark');
    } else {
        body.dataset.theme = 'light';
        themeMenuItem.textContent = 'Dark Theme';
        localStorage.setItem('theme', 'light');
    }

	// Update chart if it exists
    updateChartTheme();

    // Close the hamburger menu
    document.getElementById('hamburgerDropdown').classList.remove('show');
}

//=============================================================================
// Load saved theme
//=============================================================================
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;

    body.dataset.theme = savedTheme;

    // Update the menu item text based on current theme
    updateMenuItems();
}

//=============================================================================
// Load saved theme when page loads
//=============================================================================
document.addEventListener('DOMContentLoaded', loadSavedTheme);

//=============================================================================
// If DOMContentLoaded already fired, call it immediately
//=============================================================================
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', loadSavedTheme) : loadSavedTheme();

//=============================================================================
//Escape html
//=============================================================================
function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

//=============================================================================
// Clear error
//=============================================================================
function clearError() {
	document.getElementById('errorMessage').textContent = '';
}

//=============================================================================
// Event listeners for real-time filtering
//=============================================================================
document.getElementById('folderInput').addEventListener('change', async () => await loadLogFiles());
document.getElementById('startDateFilter').addEventListener('change', applyFilters);
document.getElementById('endDateFilter').addEventListener('change', applyFilters);

//=============================================================================
// Keyboard navigation
//=============================================================================
document.addEventListener('keydown', (e) => {
	// Close modal with Escape key
	if (e.key === 'Escape') {
		closeModal();
		// Also close hamburger menu if it's open
		document.getElementById('hamburgerDropdown').classList.remove('show');
		// Also close file info modal if it's open
		const fileInfoModal = document.getElementById('fileInfoModalOverlay');
		if (fileInfoModal.classList.contains('active')) {
			closeFileInfoModal();
		}
		return;
	}

	if (filteredEntries.length === 0) return;

	switch(e.key) {
		case 'ArrowUp':
			e.preventDefault();
			navigateRowUp();
			break;
		case 'ArrowDown':
			e.preventDefault();
			navigateRowDown();
			break;
		case 'Enter':
			e.preventDefault();
			if (selectedRowIndex >= 0 && selectedRowIndex < filteredEntries.length) {
				openModal(filteredEntries[selectedRowIndex]);
			}
			break;
		case 'Home':
			e.preventDefault();
			navigateToTop();
			break;
		case 'End':
			e.preventDefault();
			navigateToEnd();
			break;
		case 'PageUp':
			e.preventDefault();
			navigatePageUp();
			break;
		case 'PageDown':
			e.preventDefault();
			navigatePageDown();
			break;
	}
});

// ============================================================================
// Column Resizing functions
// ============================================================================

//=============================================================================
// Column resizing variables
//=============================================================================
let isResizing = false;
let currentResizeHandle = null;
let startX = 0;
let startWidth = 0;
let columnType = '';

//=============================================================================
// Default column widths
//=============================================================================
const DEFAULT_COLUMN_WIDTHS = {
    timestamp: 180,
    class: 150
};

//=============================================================================
// Current column widths (will be updated as user resizes)
//=============================================================================
let columnWidths = { ...DEFAULT_COLUMN_WIDTHS };

//=============================================================================
// Initialize resizable columns
//=============================================================================
function initializeResizableColumns() {
    // Create resize handles for each resizable column
    const timestampHeader = document.querySelector('.header-timestamp');
    const classHeader = document.querySelector('.header-class');

    // Add resize handle to timestamp column
    if (timestampHeader) {
        const timestampHandle = createResizeHandle('timestamp');
        timestampHeader.appendChild(timestampHandle);
    }

    // Add resize handle to class column
    if (classHeader) {
        const classHandle = createResizeHandle('class');
        classHeader.appendChild(classHandle);
    }

    // Set initial column widths
    updateColumnWidths();
}

//=============================================================================
// Create a resize handle element
//=============================================================================
function createResizeHandle(columnType) {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.dataset.columnType = columnType;

    // Add event listeners
    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });

    return handle;
}

//=============================================================================
// Start column resize
//=============================================================================
function startResize(e) {
    e.preventDefault();
    e.stopPropagation();  // This prevents the click from bubbling up to the column header

    isResizing = true;
    currentResizeHandle = e.target;
    columnType = e.target.dataset.columnType;

    // Get starting position and width
    startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    startWidth = columnWidths[columnType];

    // Add visual feedback
    currentResizeHandle.classList.add('resizing');
    document.body.classList.add('no-select');

    // Add global event listeners
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('touchmove', handleResize, { passive: false });
    document.addEventListener('touchend', stopResize);

    // Change cursor globally
    document.body.style.cursor = 'col-resize';
}

//=============================================================================
// Handle column resize
//=============================================================================
function handleResize(e) {
    if (!isResizing || !currentResizeHandle) return;

    e.preventDefault();
    e.stopPropagation();

    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const deltaX = currentX - startX;

    // Update column width
    columnWidths[columnType] = Math.max(50, startWidth + deltaX); // Minimum width of 50px
    updateColumnWidths();
}

//=============================================================================
// Stop column resize
//=============================================================================
function stopResize() {
    if (!isResizing) return;

    // Remove visual feedback
    if (currentResizeHandle) {
        currentResizeHandle.classList.remove('resizing');
    }
    document.body.classList.remove('no-select');
    document.body.style.cursor = '';

    // Remove global event listeners
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.removeEventListener('touchmove', handleResize);
    document.removeEventListener('touchend', stopResize);

    // Clear references
    currentResizeHandle = null;
    columnType = '';

    // Save column widths to localStorage
    saveColumnWidths();

    // Re-render the virtual list to update row widths
    renderVirtualList();

    // Add a small delay before allowing sorting to prevent accidental sort triggers
    setTimeout(() => {
        isResizing = false;
    }, 100);
}

//=============================================================================
// Update column widths using CSS variables
//=============================================================================
function updateColumnWidths() {
    const root = document.documentElement;
    root.style.setProperty('--timestamp-width', columnWidths.timestamp + 'px');
    root.style.setProperty('--class-width', columnWidths.class + 'px');
}

//=============================================================================
// Save column widths to localStorage
//=============================================================================
function saveColumnWidths() {
    try {
        localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
    } catch (error) {
        console.warn('Failed to save column widths to localStorage:', error);
    }
}

//=============================================================================
// Load column widths from localStorage
//=============================================================================
function loadColumnWidths() {
    try {
        const saved = localStorage.getItem('columnWidths');
        if (saved) {
            const parsedWidths = JSON.parse(saved);
            columnWidths = { ...DEFAULT_COLUMN_WIDTHS, ...parsedWidths };
            updateColumnWidths();
        }
    } catch (error) {
        console.warn('Failed to load column widths from localStorage:', error);
        columnWidths = { ...DEFAULT_COLUMN_WIDTHS };
        updateColumnWidths();
    }
}

//=============================================================================
// Initialize column resize data
//=============================================================================
function initializeColumnResize() {
    loadColumnWidths();

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initializeResizableColumns, 100);
        });
    } else {
        setTimeout(initializeResizableColumns, 100);
    }
}

//=============================================================================
// Initialize column resize functionality
//=============================================================================
initializeColumnResize();

//=============================================================================
// Virtual scrolling event listener
//=============================================================================
document.getElementById('scrollContainer').addEventListener('scroll', () => {
	requestAnimationFrame(renderVirtualList);
});

//=============================================================================
// Handle window resize for virtual scrolling
//=============================================================================
window.addEventListener('resize', () => {
	requestAnimationFrame(renderVirtualList);
});

//=============================================================================
// Load files listener
//=============================================================================
document.getElementById('fileInput').addEventListener('change', async () => await loadLogFiles());

//=============================================================================
// Initialize display
//=============================================================================
renderVirtualList();
updateStats();
