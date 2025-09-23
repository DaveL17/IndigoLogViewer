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
}

function reloadLogFiles() {
	if (selectedFolder && selectedFolder.length > 0) {
		loadLogFiles(selectedFolder);
	} else {
		showToast('No folder selected to reload', 'error');
	}
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

				// Don't show individual file progress toasts - only show for large batches
				// if (totalFiles > 5) {
				//     showToast(`Processing files: ${processedFiles}/${totalFiles}`, 'info', 1000);
				// }

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

		// Enable reload button after successful load
		document.getElementById('reloadButton').disabled = false;

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
		copyButton.textContent = 'Copied!';
		copyButton.style.backgroundColor = 'var(--debug-color)';

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
    const button = body.querySelector('.theme-toggle');

    if (body.dataset.theme === 'light') {
        body.dataset.theme = 'dark';
        button.textContent = 'Light ☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        body.dataset.theme = 'light';
        button.textContent = 'Dark 🌙';
        localStorage.setItem('theme', 'light');
    }
}

// Add this function to load the saved theme on page load
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    const body = document.body;
    const button = body.querySelector('.theme-toggle');

    body.dataset.theme = savedTheme;

    if (savedTheme === 'dark') {
        button.textContent = 'Light ☀️';
    } else {
        button.textContent = 'Dark 🌙';
    }
}

// Add this to the end of your script, after the existing initialization:
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
		return;
	}

	if (filteredEntries.length === 0) return;

	switch(e.key) {
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
