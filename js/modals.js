let logChart = null;

//=============================================================================
// Open modal
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
// close modal
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
// File Info Modal
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

// ============================================================================
// Chart configuration and initialization
// ============================================================================
class LogChartViewer {
  constructor(canvasId) {
    this.canvasId = canvasId;
    this.chart = null;
  }

// ============================================================================
// Initialize or update the chart
// ============================================================================
renderChart(data, options = {}) {
    const canvas = document.getElementById(this.canvasId);
    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
    }

    // Helper function to calculate a nice max value
    const getNiceMax = (maxValue) => {
      if (maxValue === null || maxValue === 0) return null;

      // Calculate the order of magnitude
      const magnitude = Math.pow(10, Math.floor(Math.log10(maxValue)));

      // Common nice numbers are 1, 2, 2.5, 5, 10 (times the magnitude)
      const niceNumbers = [1, 2, 2.5, 5, 10].map(n => n * magnitude);

      // Find the first nice number that's greater than maxValue
      for (let nice of niceNumbers) {
        if (nice > maxValue) {
          return nice;
        }
      }

      // If none found, use 10 times the magnitude
      return 10 * magnitude;
    };

    const yValues = data.datasets
      .filter(d => !d.yAxisID || d.yAxisID === 'y')
      .flatMap(d => d.data.filter(v => v !== null && v !== undefined));

    const y1Values = data.datasets
      .filter(d => d.yAxisID === 'y1')
      .flatMap(d => d.data.filter(v => v !== null && v !== undefined));

    const yMax = yValues.length > 0 ? getNiceMax(Math.max(...yValues)) : null;
    const y1Max = y1Values.length > 0 ? getNiceMax(Math.max(...y1Values)) : null;

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
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                let value = context.parsed.y;

                if (label) {
                  label += ': ';
                }

                // Only format if this dataset uses the y1 axis
                if (context.dataset.yAxisID === 'y1') {
                  if (value > 999) {
                    value = value / 1000;
                    label += value.toFixed(2) + ' MB';
                  } else if (value > 9999) {
                    label += value.toFixed(2) + ' GB';
                  } else {
                    label += value.toFixed(2) + ' KB';
                  }
                } else {
                  // For y axis, just use the plain value with locale formatting
                  label += value.toLocaleString();
                }

                return label;
              }
            }
          }
        },
        scales: this.getScalesConfig(options.type || 'bar', 0, yMax, 0, y1Max)
      }
    };

    // Create the chart
    this.chart = new Chart(ctx, defaultConfig);

    // Store reference on canvas element for external access
    canvas.chart = this.chart;
  }

// Helper to configure scales based on chart type
getScalesConfig(chartType, yMin = null, yMax = null, y1Min = null, y1Max = null) {
  if (chartType === 'pie' || chartType === 'doughnut') {
    return {}; // Pie and doughnut charts don't use scales
  }

  const currentTheme = document.body.dataset.theme;
  const gridColor = (currentTheme === 'dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = (currentTheme === 'dark') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';

  const yConfig = {
    beginAtZero: true,
    grid: {
      color: gridColor
    },
    position: 'left',
    ticks: {
      precision: 0,
      color: textColor
    }
  };

  const y1Config = {
    beginAtZero: true,
    grid: {
      color: gridColor
    },
    position: 'right',
    ticks: {
      precision: 0,
      color: textColor,
      callback: function(value, index, ticks) {
        if (value > 999) {
          value = value / 1000;
          return value.toLocaleString() + ' MB';
        } else if (value > 9999) {
          return value.toLocaleString() + ' GB';
        } else {
          return value.toLocaleString() + ' KB';
        }
      }
    }
  };

  // Set fixed min/max if provided
  if (yMin !== null) yConfig.min = yMin;
  if (yMax !== null) yConfig.max = yMax;
  if (y1Min !== null) y1Config.min = y1Min;
  if (y1Max !== null) y1Config.max = y1Max;

  return {
    x: {
      grid: {
        color: gridColor
      },
      ticks: {
        color: textColor
      }
    },
    y: yConfig,
    y1: y1Config
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

// ============================================================================
// Create the chart
// ============================================================================
function createLogChart() {
  const chartViewer = new LogChartViewer('logChart');

  const barChartData = {
    labels: sortedFiles.map(file => file.name.split(' ')[0]),  // just the date part of the filename
    datasets: [{
      label: 'Lines',
      data: sortedFiles.map(file => file.entryCount),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
      yAxisID: 'y',
    },
    {
      label: 'Size',
      data: sortedFiles.map(file => file.size / 1000),
      backgroundColor: 'rgba(235, 162, 54, 0.6)',
      borderColor: 'rgba(235, 162, 54, 1)',
      borderWidth: 1,
      yAxisID: 'y1',
    }]
  };

  chartViewer.renderChart(barChartData, {
    type: 'line',
    // title: 'Log Lines per File',
    showLegend: true,
  });

  return chartViewer;
}

// Initialize chart when modal opens
logChart = createLogChart();

}

// ============================================================================
// Update chart if theme changes
// ============================================================================
function updateChartTheme() {
    const chartCanvas = document.getElementById('logChart');

    if (chartCanvas && chartCanvas.chart) {
        const chart = chartCanvas.chart;

        const currentTheme = document.body.dataset.theme;
        const gridColor = (currentTheme === 'dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = (currentTheme === 'dark') ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)';
        const lineColor = (currentTheme === 'dark') ? 'rgba(54, 162, 235, 0.6)' : 'rgba(54, 162, 235, 0.8)';
        const lineBorderColor = (currentTheme === 'dark') ? 'rgba(54, 162, 235, 1)' : 'rgba(54, 162, 235, 1)';

        // Update dataset colors
        chart.data.datasets.forEach(dataset => {
            dataset.backgroundColor = lineColor;
            dataset.borderColor = lineBorderColor;
        });

        // Update scales (axis labels and grid lines)
        if (chart.options.scales.x) {
            chart.options.scales.x.ticks.color = textColor;
            chart.options.scales.x.grid.color = gridColor;
        }

        if (chart.options.scales.y) {
            chart.options.scales.y.ticks.color = textColor;
            chart.options.scales.y.grid.color = gridColor;
        }

        // Update title and legend colors
        if (chart.options.plugins.title) {
            chart.options.plugins.title.color = textColor;
        }

        if (chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }

        // Update chart
        chart.update();
    }
}

// ============================================================================
// Toggle between file list and chart views
// ============================================================================
function toggleFileView() {
    const fileList = document.getElementById('fileListDisplay');
    const chartContainer = document.querySelector('.chart-container');
    const toggleButton = document.getElementById('toggleViewButton');

    fileList.classList.toggle('hidden');
    chartContainer.classList.toggle('visible');

    // Update button text
    if (chartContainer.classList.contains('visible')) {
        toggleButton.textContent = 'Show List';
    } else {
        toggleButton.textContent = 'Show Chart';
    }
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

// ============================================================================
// Event listeners
// ============================================================================
// We wrap the event listener code so that node unit tests will run successfully.
if (typeof document !== 'undefined') {
    document.getElementById("toggleViewButton").addEventListener("click", function() {
        const target = document.getElementById("logChart");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
}

// ============================================================================
// Unit test exports
// ============================================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { formatFileSize };
}
