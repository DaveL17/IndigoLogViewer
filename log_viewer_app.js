let allLogEntries = [];
let filteredEntries = [];
let availableClasses = new Set();
let availableDates = [];
let currentModalEntry = null;
let selectedFolder = null; // Keep track of the selected folder

// Virtual scrolling variables
const ROW_HEIGHT = 32; // Minimum height per row
const BUFFER_SIZE = 10; // Extra rows to render above/below visible area
let visibleStart = 0;
let visibleEnd = 0;
let selectedRowIndex = -1;

// Sorting variables
let currentSort = {
    column: 'timestamp',
    direction: 'desc' // Default sort to newest entry first
};

// Function to open URL in new tab
function openInNewTab(url) {
    window.open(url, '_blank');
}

// Sorting functions
function sortBy(column) {
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
    const scrollContainer = document.getElementById('scrollContainer');
    scrollContainer.scrollTop = 0;
    renderVirtualList();
}

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

// Help function
function openHelp() {
    // Change this URL to your actual help documentation URL
    const helpUrl = 'https://example.com/help';
    openInNewTab(helpUrl);

    // Show confirmation toast
    showToast('Opening help documentation...', 'info', 2000);

    // Close the hamburger menu
    document.getElementById('hamburgerDropdown').classList.remove('show');
}

// Hamburger menu functions
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

function updateMenuItems() {
	// Update reload menu item state
	const reloadMenuItem = document.getElementById('reloadMenuItem');
	if (selectedFolder && selectedFolder.length > 0) {
		reloadMenuItem.classList.remove('disabled');
	} else {
		reloadMenuItem.classList.add('disabled');
	}

	// Update theme menu item text
	const themeMenuItem = document.getElementById('themeMenuItem');
	const currentTheme = document.body.dataset.theme;
	if (currentTheme === 'dark') {
		themeMenuItem.textContent = 'Light Theme';
	} else {
		themeMenuItem.textContent = 'Dark Theme';
	}
}

// Close menu when clicking outside
document.addEventListener('click', function(event) {
	const hamburgerMenu = document.querySelector('.hamburger-menu');
	const dropdown = document.getElementById('hamburgerDropdown');

	if (!hamburgerMenu.contains(event.target)) {
		dropdown.classList.remove('show');
	}
});

// Toast notification system
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

function getClassColorClass(className) {
	// Used to color log message class field error=red, warning=orange, debug=green
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

function selectFolder() {
	document.getElementById('folderInput').click();
	// Close the hamburger menu after selection
	document.getElementById('hamburgerDropdown').classList.remove('show');
}

function reloadLogFiles() {
	if (selectedFolder && selectedFolder.length > 0) {
		// Show reload toast first, then perform the actual reload
		showToast('Reloading log files...', 'info', 2000);
		// Use setTimeout to ensure toast is shown before starting reload
		setTimeout(() => {
			loadLogFiles(selectedFolder);
		}, 100);
	} else {
		showToast('No folder selected to reload', 'error');
	}
	// Close the hamburger menu
	document.getElementById('hamburgerDropdown').classList.remove('show');
}

async function loadLogFiles(files = null) {
	const folderInput = document.getElementById('folderInput');
	const filesToProcess = files || folderInput.files;

	// Store the selected folder for reloading
	if (filesToProcess && filesToProcess.length > 0) {
		selectedFolder = Array.from(filesToProcess);
	}

	if (filesToProcess.length === 0) {
		showToast('Please select a folder containing log files', 'error');
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
		const totalFiles = logFiles.length;

		for (let file of logFiles) {
			try {
				let content = await readFileContent(file);
				const entries = parseLogContent(content);

				for (let entry of entries) {
					allLogEntries.push(entry);
					availableClasses.add(entry.class);
				}
				processedFiles++;

			} catch (fileError) {
				console.warn(`Failed to read file ${file.name}:`, fileError);
				// Continue processing other files instead of failing completely
				processedFiles++;
				continue;
			}
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
		updateStats();
		updateSortIndicators(); // Show initial sort indicators

		const successMessage = processedFiles < totalFiles
			? `Successfully loaded ${processedFiles}/${totalFiles} log files (${totalFiles - processedFiles} files had errors)`
			: `Successfully loaded ${processedFiles} log file${processedFiles > 1 ? 's' : ''}`;

		showToast(successMessage, 'success');

	} catch (error) {
		showToast('Error loading log files: ' + error.message, 'error');
		console.error('Load error:', error);
	}
}

function readFileContent(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = e => resolve(e.target.result);
		reader.onerror = () => reject(new Error('Failed to read file: ' + file.name));
		reader.readAsText(file);
	});
}

function updateFilters() {
	// Update class filter
	const classFilter = document.getElementById('classFilter');
	classFilter.innerHTML = '<option value="">All Classes</option>';
   [...availableClasses].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(cls => {
        classFilter.innerHTML += `<option value="${cls}">${cls}</option>`;
	});

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

	// Apply class filter
	const classFilter = document.getElementById('classFilter').value;
	if (classFilter) {
		filtered = filtered.filter(entry => entry.class === classFilter);
	}

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

function renderVirtualList() {
	const scrollContainer = document.getElementById('scrollContainer');
	const virtualSpacer = document.getElementById('virtualSpacer');
	const virtualContent = document.getElementById('virtualContent');

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

function selectRow(clickedRow, index) {
	selectedRowIndex = index;

	// Update selection visually
	const allRows = document.querySelectorAll('.log-row');
	allRows.forEach(row => row.classList.remove('selected'));
	clickedRow.classList.add('selected');

	// Open modal with full log entry details
	openModal(filteredEntries[index]);
}

// Arrow key navigation for selected rows
function navigateRowUp() {
	if (filteredEntries.length === 0) return;

	if (selectedRowIndex > 0) {
		selectedRowIndex--;
		scrollToSelectedRow();
		renderVirtualList();
	}
}

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

function scrollToSelectedRow() {
	if (selectedRowIndex === -1) return;

	const scrollContainer = document.getElementById('scrollContainer');
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

function openModal(logEntry) {
	currentModalEntry = logEntry;
	const modalOverlay = document.getElementById('modalOverlay');
	const modalLogContent = document.getElementById('modalLogContent');
	const classColorClass = getClassColorClass(logEntry.class);

	modalLogContent.innerHTML = `<span class="modal-timestamp">${escapeHtml(logEntry.timestampString)}</span>\t<span class="modal-class ${classColorClass}">${escapeHtml(logEntry.class)}</span>\t${escapeHtml(logEntry.entry)}`;

	modalOverlay.classList.add('active');
	document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal(event) {
	// If event is provided and the target is not the overlay itself, don't close
	if (event && event.target !== document.getElementById('modalOverlay')) {
		return;
	}

	const modalOverlay = document.getElementById('modalOverlay');
	modalOverlay.classList.remove('active');
	document.body.style.overflow = ''; // Restore scrolling
	currentModalEntry = null;
}

function copyLogEntry() {
	if (!currentModalEntry) return;

	const textToCopy = `${currentModalEntry.timestampString}\t${currentModalEntry.class}\t${currentModalEntry.entry}`;

	navigator.clipboard.writeText(textToCopy).then(() => {
		// Provide visual feedback
		const copyButton = document.querySelector('.modal-button.copy');
		const originalText = copyButton.textContent;

		setTimeout(() => {
			copyButton.textContent = originalText;
			copyButton.style.backgroundColor = '';
		}, 1000);
	}).catch(err => {
		console.error('Failed to copy text: ', err);
		showToast('Failed to copy to clipboard', 'error');
	});
}

// Navigation functions
function navigateToTop() {
	const scrollContainer = document.getElementById('scrollContainer');
	scrollContainer.scrollTop = 0;
	selectedRowIndex = 0;
	requestAnimationFrame(renderVirtualList);
}

function navigateToEnd() {
	const scrollContainer = document.getElementById('scrollContainer');
	scrollContainer.scrollTop = scrollContainer.scrollHeight;
	selectedRowIndex = filteredEntries.length - 1;
	requestAnimationFrame(renderVirtualList);
}

function navigatePageUp() {
	const scrollContainer = document.getElementById('scrollContainer');
	const containerHeight = scrollContainer.clientHeight;
	const pageRows = Math.floor(containerHeight / ROW_HEIGHT);

	scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop - (pageRows * ROW_HEIGHT));

	const newVisibleStart = Math.floor(scrollContainer.scrollTop / ROW_HEIGHT);
	selectedRowIndex = Math.max(0, newVisibleStart);
	requestAnimationFrame(renderVirtualList);
}

function navigatePageDown() {
	const scrollContainer = document.getElementById('scrollContainer');
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

function clearTextFilter() {
	document.getElementById('textFilter').value = '';
	applyFilters();
}

function clearDateFilter() {
	document.getElementById('startDateFilter').value = '';
	document.getElementById('endDateFilter').value = '';
	applyFilters();
}

function toggleTheme() {
    const body = document.body;
    const themeMenuItem = document.getElementById('themeMenuItem');

    if (body.dataset.theme === 'light') {
        body.dataset.theme = 'dark';
        themeMenuItem.textContent = 'â˜€ï¸ Light Theme';
        localStorage.setItem('theme', 'dark');
    } else {
        body.dataset.theme = 'light';
        themeMenuItem.textContent = 'ðŸŒ™ Dark Theme';
        localStorage.setItem('theme', 'light');
    }

    // Close the hamburger menu
    document.getElementById('hamburgerDropdown').classList.remove('show');
}

// Add this function to load the saved theme on page load
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;

    body.dataset.theme = savedTheme;

    // Update the menu item text based on current theme
    updateMenuItems();
}

// Load saved theme when page loads
document.addEventListener('DOMContentLoaded', loadSavedTheme);

// If DOMContentLoaded already fired, call it immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSavedTheme);
} else {
    loadSavedTheme();
}

function escapeHtml(text) {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function showError(message) {
	document.getElementById('errorMessage').textContent = message;
}

function clearError() {
	document.getElementById('errorMessage').textContent = '';
}

// Event listeners for real-time filtering
 document.getElementById('folderInput').addEventListener('change', async () => await loadLogFiles());
// document.getElementById('folderInput').addEventListener('change', () => loadLogFiles());
document.getElementById('startDateFilter').addEventListener('change', applyFilters);
document.getElementById('endDateFilter').addEventListener('change', applyFilters);
document.getElementById('classFilter').addEventListener('change', applyFilters);
document.getElementById('textFilter').addEventListener('input', applyFilters);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
	// Close modal with Escape key
	if (e.key === 'Escape') {
		closeModal();
		// Also close hamburger menu if it's open
		document.getElementById('hamburgerDropdown').classList.remove('show');
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

// Column resizing variables
let isResizing = false;
let currentResizeHandle = null;
let startX = 0;
let startWidth = 0;
let columnType = '';

// Default column widths
const DEFAULT_COLUMN_WIDTHS = {
    timestamp: 180,
    class: 150
};

// Current column widths (will be updated as user resizes)
let columnWidths = { ...DEFAULT_COLUMN_WIDTHS };

// Initialize resizable columns
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

// Create a resize handle element
function createResizeHandle(columnType) {
    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.dataset.columnType = columnType;

    // Add event listeners
    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });

    return handle;
}

// Start column resize
function startResize(e) {
    e.preventDefault();
    e.stopPropagation();

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

// Handle column resize
function handleResize(e) {
    if (!isResizing || !currentResizeHandle) return;

    e.preventDefault();

    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const deltaX = currentX - startX;

    // Update column width
    columnWidths[columnType] = Math.max(50, startWidth + deltaX); // Minimum width of 50px
    updateColumnWidths();
}

// Stop column resize
function stopResize() {
    if (!isResizing) return;

    isResizing = false;

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
}

// Update column widths using CSS variables
function updateColumnWidths() {
    const root = document.documentElement;
    root.style.setProperty('--timestamp-width', columnWidths.timestamp + 'px');
    root.style.setProperty('--class-width', columnWidths.class + 'px');
}

// Save column widths to localStorage
function saveColumnWidths() {
    try {
        localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
    } catch (error) {
        console.warn('Failed to save column widths to localStorage:', error);
    }
}

// Load column widths from localStorage
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

// Reset column widths to defaults
function resetColumnWidths() {
    columnWidths = { ...DEFAULT_COLUMN_WIDTHS };
    updateColumnWidths();
    saveColumnWidths();
    renderVirtualList();
    showToast('Column widths reset to defaults', 'info');
}

// Add this to your existing DOMContentLoaded event or initialization
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

// Initialize column resize functionality
initializeColumnResize();

// Virtual scrolling event listener
document.getElementById('scrollContainer').addEventListener('scroll', () => {
	requestAnimationFrame(renderVirtualList);
});

// Handle window resize for virtual scrolling
window.addEventListener('resize', () => {
	requestAnimationFrame(renderVirtualList);
});

// Initialize display
renderVirtualList();
updateStats();
