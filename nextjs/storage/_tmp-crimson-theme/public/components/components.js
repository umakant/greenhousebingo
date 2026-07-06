(function() {
  'use strict';

  function normalizePath(path) {
    if (!path || path === '/' || path === '#') return path;
    return path.replace(/\/+$/, '').split('?')[0].split('#')[0];
  }

  function loadComponent(elementId, componentPath, callback) {
    var element = document.getElementById(elementId);
    if (!element) return;
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', componentPath, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          element.innerHTML = xhr.responseText;
          if (callback) callback();
        } else {
          console.error('Failed to load component:', componentPath);
        }
      }
    };
    xhr.send();
  }

  function highlightCurrentPage() {
    var currentPath = normalizePath(window.location.pathname);
    var menuItems = document.querySelectorAll('#dsvy-top-menu .menu-item a');
    
    menuItems.forEach(function(link) {
      var href = link.getAttribute('href');
      if (!href || href === '#') return;
      
      var normalizedHref = normalizePath(href);
      
      if (normalizedHref === '/') {
        if (currentPath === '/' || currentPath === '') {
          link.closest('.menu-item').classList.add('current-menu-item');
        }
      } else if (currentPath.indexOf(normalizedHref) === 0) {
        link.closest('.menu-item').classList.add('current-menu-item');
        var parent = link.closest('.menu-item-has-children');
        if (parent) {
          parent.classList.add('current-menu-ancestor');
        }
      }
    });
  }

  function initComponents() {
    var headerPlaceholder = document.getElementById('header-placeholder');
    var footerPlaceholder = document.getElementById('footer-placeholder');
    
    if (headerPlaceholder) {
      loadComponent('header-placeholder', '/components/header.html', function() {
        highlightCurrentPage();
      });
    }
    
    if (footerPlaceholder) {
      loadComponent('footer-placeholder', '/components/footer.html');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
  } else {
    initComponents();
  }
})();
