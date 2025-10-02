//=============================================================================
// Toast notifications
//=============================================================================

//=============================================================================
// Show the toast
//=============================================================================
function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('Toast container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    toastContainer.appendChild(toast);

    // Trigger show animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });

    // Hide and remove after duration
    const hideTimeout = setTimeout(() => {
        toast.classList.add('hide');

        // Use transitionend event instead of fixed timeout
        const handleTransitionEnd = () => {
            toast.removeEventListener('transitionend', handleTransitionEnd);
            toast.remove();
        };

        toast.addEventListener('transitionend', handleTransitionEnd);

        // Fallback in case transition doesn't fire
        setTimeout(() => {
            toast.remove();
        }, 500);
    }, duration);

    // Optional: Allow clicking to dismiss
    toast.addEventListener('click', () => {
        clearTimeout(hideTimeout);
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 300);
    });

    return toast; // Return toast element for external control if needed
}
