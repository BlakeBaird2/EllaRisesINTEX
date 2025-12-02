// Ella Rises - Main JavaScript

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

    // Close menu when a link is clicked
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
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
    form.addEventListener('submit', (e) => {
      if (!confirm('Are you sure you want to delete this item?')) {
        e.preventDefault();
      }
    });
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
      const dropdown = toggle.closest('.dropdown, .dropdown-mobile');
      const isActive = dropdown.classList.contains('active');
      
      // Close all other dropdowns
      document.querySelectorAll('.dropdown, .dropdown-mobile').forEach(d => {
        d.classList.remove('active');
      });
      
      // Toggle current dropdown
      if (!isActive) {
        dropdown.classList.add('active');
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
});
