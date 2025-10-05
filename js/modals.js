let logChart = null;

//=============================================================================
// Open the modal
//=============================================================================
function openModal(logEntry) {
	currentModalEntry = logEntry;
	const modalOverlay = document.getElementById('modalOverlay');
	const modalLogContent = document.getElementById('modalLogContent');
	const classColorClass = getClassColorClass(logEntry.class);

	modalLogContent.innerHTML = `<span class="modal-timestamp">${escapeHtml(logEntry.timestampString)}</span>\t<span class="modal-class ${classColorClass}">${escapeHtml(logEntry.class)}</span>\t${escapeHtml(logEntry.entry)}`;

	modalOverlay.classList.add('active');
	document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

//=============================================================================
// close the modal
//=============================================================================
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

//=============================================================================
// Copy log entry text
//=============================================================================
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

// ============================================================================
// File Info Modal functions
// ============================================================================
function openFileInfoModal() {
    // Close hamburger menu
    document.getElementById('hamburgerDropdown').classList.remove('show');

    if (loadedFileInfo.length === 0) {
        return; // Should not happen due to disabled state, but safe check
    }

    const fileInfoModal = document.getElementById('fileInfoModalOverlay');
    const fileListDisplay = document.getElementById('fileListDisplay');

    // Build file list table
    let tableHtml = '<div class="file-info-table">';
    tableHtml += '<div class="file-info-row file-info-header">';
    tableHtml += '<div class="file-info-cell">File Name</div>';
    tableHtml += '<div class="file-info-cell">Size</div>';
    tableHtml += '<div class="file-info-cell">Entries</div>';
    tableHtml += '</div>';

    // Sort files by name
    const sortedFiles = [...loadedFileInfo].sort((a, b) =>
        a.name.localeCompare(b.name)
    );

    sortedFiles.forEach(file => {
        tableHtml += '<div class="file-info-row">';
        tableHtml += `<div class="file-info-cell" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>`;
        tableHtml += `<div class="file-info-cell">${formatFileSize(file.size)}</div>`;
        tableHtml += `<div class="file-info-cell">${file.entryCount.toLocaleString()}</div>`;
        tableHtml += '</div>';
    });

    tableHtml += '</div>';
    fileListDisplay.innerHTML = tableHtml;

    fileInfoModal.classList.add('active');
    document.body.style.overflow = 'hidden';

// =====================================================================================================================
// Chart configuration and initialization
class LogChartViewer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.chart = null;
  }
  // Initialize or update the chart with your data
  renderChart(data, options = {}) {
    const ctx = document.getElementById(this.canvasId).getContext('2d');

    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }

    // Default configuration
    const defaultConfig = {
      type: options.type || 'bar', // 'bar', 'line', 'pie', 'doughnut'
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: options.showLegend !== false,
            position: 'top',
          },
          title: {
            display: options.title !== undefined,
            text: options.title || 'Log Statistics'
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        scales: this.getScalesConfig(options.type || 'bar')
      }
    };

    // Create the chart
    this.chart = new Chart(ctx, defaultConfig);
  }

  // Helper to configure scales based on chart type
  getScalesConfig(chartType) {
    if (chartType === 'pie' || chartType === 'doughnut') {
      return {}; // Pie and doughnut charts don't use scales
    }

	const currentTheme = document.body.dataset.theme;
    const gridColor = (currentTheme === 'dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = (currentTheme === 'dark') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

    return {
      x: {
        grid: {
          color: gridColor
        },
        ticks: {
          color: textColor
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: gridColor
        },
        ticks: {
          precision: 0,
          color: textColor
        }
      }
    };
  }

  // Destroy chart instance
  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

function createLogChart() {
  const chartViewer = new LogChartViewer('logChart');

  const barChartData = {
    labels: sortedFiles.map(file => file.name.split(' ')[0]),  // just the date part of the filename
    datasets: [{
      label: 'Lines',
      data: sortedFiles.map(file => file.entryCount),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };

  chartViewer.renderChart(barChartData, {
    type: 'line',
    title: 'Log Lines per File',
    showLegend: false
  });

  return chartViewer;
}

// Initialize chart when modal opens
logChart = createLogChart();

// =====================================================================================================================
}

//=============================================================================
// Close file info modal
//=============================================================================
function closeFileInfoModal(event) {
    if (event && event.target !== document.getElementById('fileInfoModalOverlay')) {
        return;
    }

    const fileInfoModal = document.getElementById('fileInfoModalOverlay');
    fileInfoModal.classList.remove('active');
    document.body.style.overflow = '';

    // Add this to clean up the chart
      if (logChart) {
        logChart.destroy();
        logChart = null;
      }
    }

//=============================================================================
// Format file size
//=============================================================================
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// Open about modal
// ============================================================================
function openAboutModal() {
    // Close hamburger menu
    document.getElementById('hamburgerDropdown').classList.remove('show');

    const aboutModalOverlay = document.getElementById('aboutModalOverlay');

    aboutModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ============================================================================
// Close about modal
// ============================================================================
function closeAboutModal(event) {
    if (event && event.target !== document.getElementById('aboutModalOverlay')) {
        return;
    }

    const aboutModal = document.getElementById('aboutModalOverlay');
    aboutModal.classList.remove('active');
    document.body.style.overflow = '';
}
