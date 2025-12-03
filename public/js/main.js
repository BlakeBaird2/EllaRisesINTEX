// Ella Rises - Main JavaScript

// Custom confirmation modal
function showConfirmModal(message, onConfirm, onCancel) {
  // Remove any existing modal
  const existingModal = document.querySelector('.confirm-modal-overlay');
  if (existingModal) {
    existingModal.remove();
  }

  // Escape HTML to prevent XSS attacks
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  const escapedMessage = escapeHtml(message);

  // Create modal HTML
  const modalHTML = `
    <div class="confirm-modal-overlay">
      <div class="confirm-modal">
        <div class="confirm-modal-header">
          <h3>Confirm Action</h3>
        </div>
        <div class="confirm-modal-body">
          <p>${escapedMessage}</p>
        </div>
        <div class="confirm-modal-footer">
          <button class="confirm-modal-cancel">Cancel</button>
          <button class="confirm-modal-confirm">Confirm</button>
        </div>
      </div>
    </div>
  `;

  // Insert modal into page
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const overlay = document.querySelector('.confirm-modal-overlay');
  const confirmBtn = overlay.querySelector('.confirm-modal-confirm');
  const cancelBtn = overlay.querySelector('.confirm-modal-cancel');

  // Handle confirm
  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });

  // Handle cancel
  const handleCancel = () => {
    overlay.remove();
    if (onCancel) onCancel();
  };

  cancelBtn.addEventListener('click', handleCancel);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) handleCancel();
  });

  // Handle escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('header nav.header-nav-mobile');
  const header = document.querySelector('header');
  const navLinks = document.querySelectorAll('header nav.header-nav-mobile a');
  const body = document.body;

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mobileNav.classList.toggle('active');
      header.classList.toggle('menu-open');
      body.classList.toggle('menu-open');
      menuToggle.setAttribute('aria-expanded', menuToggle.classList.contains('active'));
    });

    // Close menu when a link is clicked (but not dropdown toggles)
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        // Don't close menu if clicking on dropdown toggle
        if (link.classList.contains('dropdown-toggle-mobile')) {
          return;
        }
        // Don't close menu if clicking inside dropdown menu
        if (link.closest('.dropdown-menu-mobile')) {
          return;
        }
        menuToggle.classList.remove('active');
        mobileNav.classList.remove('active');
        header.classList.remove('menu-open');
        body.classList.remove('menu-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Confirmation for delete actions
  const deleteForms = document.querySelectorAll('form[action*="delete"]');

  deleteForms.forEach(form => {
    // Check if we've already added the listener
    if (form.dataset.deleteListenerAdded) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showConfirmModal(
        'Are you sure you want to delete this item? This action cannot be undone.',
        () => {
          // User confirmed, submit the form
          form.submit();
        }
      );
    });

    // Mark this form as having the listener
    form.dataset.deleteListenerAdded = 'true';
  });
  
  // Auto-hide alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach(alert => {
    setTimeout(() => {
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  });

  // Dashboard dropdown toggle
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle, .dropdown-toggle-mobile');
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling up
      const dropdown = toggle.closest('.dropdown, .dropdown-mobile');
      const isActive = dropdown.classList.contains('active');
      
      // Close all other dropdowns
      document.querySelectorAll('.dropdown, .dropdown-mobile').forEach(d => {
        d.classList.remove('active');
      });

      // Toggle current dropdown
      if (!isActive) {
        dropdown.classList.add('active');
      } else {
        dropdown.classList.remove('active');
      }
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown, .dropdown-mobile')) {
      document.querySelectorAll('.dropdown, .dropdown-mobile').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });

  // Close dropdown when clicking on a dropdown link
  const dropdownLinks = document.querySelectorAll('.dropdown-menu a, .dropdown-menu-mobile a');
  dropdownLinks.forEach(link => {
    link.addEventListener('click', () => {
      const dropdown = link.closest('.dropdown, .dropdown-mobile');
      if (dropdown) {
        dropdown.classList.remove('active');
      }
    });
  });

  // Trim search inputs on page load (in case they have spaces from URL)
  const searchInputs = document.querySelectorAll('input[name="search"]');
  searchInputs.forEach(input => {
    if (input.value) {
      input.value = input.value.trim();
    }
  });

  // Trim search inputs before form submission
  const searchForms = document.querySelectorAll('form');
  searchForms.forEach(form => {
    form.addEventListener('submit', function(e) {
      const searchInput = form.querySelector('input[name="search"]');
      if (searchInput && searchInput.value) {
        searchInput.value = searchInput.value.trim();
        // If search is empty after trimming, clear it
        if (!searchInput.value) {
          searchInput.value = '';
        }
      }
    });
  });
});
