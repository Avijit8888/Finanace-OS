const app = {
  currentPage: 'dashboard',
  deferredPrompt: null,
  charts: {},

  init() {
    this.registerSW();
    this.setupEventListeners();
    this.setupPWA();
    this.initSidebar();
    
    storage.initCategories().then(() => {
      storage.seedDemoData();
      transactionManager.init();
      dashboard.init();
      analytics.init();
      goals.init();
      this.updateStorageInfo();
    });
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    }
  },

  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
          this.closeModal(m.id);
        });
      }
    });

    document.getElementById('sidebarOverlay').addEventListener('click', () => {
      this.closeSidebar();
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const prompt = document.getElementById('installPrompt');
      if (prompt) prompt.classList.remove('hidden');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      const prompt = document.getElementById('installPrompt');
      if (prompt) prompt.classList.add('hidden');
    });
  },

  setupPWA() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      const prompt = document.getElementById('installPrompt');
      if (prompt) prompt.classList.add('hidden');
    }
  },

  initSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    if (window.innerWidth <= 1024) {
      menuToggle.style.display = 'flex';
    }
    
    window.addEventListener('resize', () => {
      if (window.innerWidth <= 1024) {
        menuToggle.style.display = 'flex';
      } else {
        menuToggle.style.display = 'none';
        this.closeSidebar();
      }
    });

    menuToggle.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  },

  navigate(page) {
    this.currentPage = page;
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById('page-' + page);
    if (targetPage) targetPage.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));

    document.querySelectorAll('.mobile-nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll(`.mobile-nav-item[data-page="${page}"]`).forEach(n => n.classList.add('active'));

    const titles = {
      dashboard: 'Dashboard',
      transactions: 'Transactions',
      analytics: 'Analytics',
      goals: 'Goals & Budget',
      settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'FinanceOS';

    this.closeSidebar();

    if (page === 'dashboard') dashboard.render();
    if (page === 'transactions') transactionManager.render();
    if (page === 'analytics') analytics.render();
    if (page === 'goals') {
      goals.renderGoals();
      goals.renderBudget();
      goals.renderSavingsChart();
    }
    if (page === 'settings') this.updateStorageInfo();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('active');
      if (!document.querySelector('.modal-overlay.active')) {
        document.body.style.overflow = '';
      }
    }
  },

  showAddTransaction(type) {
    transactionManager.showAdd(type);
  },

  toast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };
    const colors = {
      success: 'var(--accent-success)',
      error: 'var(--accent-danger)',
      warning: 'var(--accent-warning)',
      info: 'var(--accent-primary)'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type]}" style="color:${colors[type]};font-size:1.125rem;"></i>
      <span style="font-size:0.9375rem;">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('removing');
      toast.addEventListener('animationend', () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      });
    }, duration);
  },

  refreshAll() {
    dashboard.render();
    if (this.currentPage === 'transactions') transactionManager.render();
    if (this.currentPage === 'analytics') analytics.render();
    if (this.currentPage === 'goals') {
      goals.renderGoals();
      goals.renderBudget();
      goals.renderSavingsChart();
    }
    if (this.currentPage === 'settings') this.updateStorageInfo();
  },

  installPWA() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        this.toast('FinanceOS installed successfully!', 'success');
      }
      this.deferredPrompt = null;
      const prompt = document.getElementById('installPrompt');
      if (prompt) prompt.classList.add('hidden');
    });
  },

  dismissInstall() {
    const prompt = document.getElementById('installPrompt');
    if (prompt) prompt.classList.add('hidden');
    this.deferredPrompt = null;
  },

  updateStorageInfo() {
    const el = document.getElementById('storageUsed');
    if (el) el.textContent = utils.calculateStorageUsed();
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
