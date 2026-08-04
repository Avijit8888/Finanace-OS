const storage = {
  KEYS: {
    TRANSACTIONS: 'financeos_transactions',
    GOALS: 'financeos_goals',
    BUDGET: 'financeos_budget',
    CATEGORIES: 'financeos_categories',
    SETTINGS: 'financeos_settings'
  },

  getTransactions() {
    try {
      const data = localStorage.getItem(this.KEYS.TRANSACTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setTransactions(transactions) {
    localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  addTransaction(transaction) {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    this.setTransactions(transactions);
  },

  updateTransaction(id, updates) {
    const transactions = this.getTransactions();
    const idx = transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      transactions[idx] = { ...transactions[idx], ...updates };
      this.setTransactions(transactions);
    }
  },

  deleteTransaction(id) {
    const transactions = this.getTransactions().filter(t => t.id !== id);
    this.setTransactions(transactions);
  },

  getGoals() {
    try {
      const data = localStorage.getItem(this.KEYS.GOALS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setGoals(goals) {
    localStorage.setItem(this.KEYS.GOALS, JSON.stringify(goals));
  },

  addGoal(goal) {
    const goals = this.getGoals();
    goals.push(goal);
    this.setGoals(goals);
  },

  updateGoal(id, updates) {
    const goals = this.getGoals();
    const idx = goals.findIndex(g => g.id === id);
    if (idx !== -1) {
      goals[idx] = { ...goals[idx], ...updates };
      this.setGoals(goals);
    }
  },

  deleteGoal(id) {
    const goals = this.getGoals().filter(g => g.id !== id);
    this.setGoals(goals);
  },

  getBudget() {
    try {
      const data = localStorage.getItem(this.KEYS.BUDGET);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setBudget(budget) {
    localStorage.setItem(this.KEYS.BUDGET, JSON.stringify(budget));
  },

  getCategories() {
    try {
      const data = localStorage.getItem(this.KEYS.CATEGORIES);
      if (data) return JSON.parse(data);
    } catch {}
    return null;
  },

  setCategories(categories) {
    localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(categories));
  },

  getSettings() {
    try {
      const data = localStorage.getItem(this.KEYS.SETTINGS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  setSettings(settings) {
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  },

  clearAll() {
    Object.values(this.KEYS).forEach(key => localStorage.removeItem(key));
  },

  async initCategories() {
    let categories = this.getCategories();
    if (!categories) {
      try {
        const response = await fetch('data/categories.json');
        categories = await response.json();
        this.setCategories(categories);
      } catch {
        categories = {
          income: [
            { id: 'salary', name: 'Salary', icon: 'fa-money-bill-wave', color: '#10b981' },
            { id: 'freelance', name: 'Freelance', icon: 'fa-laptop-code', color: '#3b82f6' },
            { id: 'investment', name: 'Investment', icon: 'fa-chart-line', color: '#8b5cf6' },
            { id: 'gift', name: 'Gift', icon: 'fa-gift', color: '#ec4899' },
            { id: 'refund', name: 'Refund', icon: 'fa-rotate-left', color: '#06b6d4' },
            { id: 'other_income', name: 'Other Income', icon: 'fa-circle-plus', color: '#84cc16' }
          ],
          expense: [
            { id: 'food', name: 'Food & Dining', icon: 'fa-utensils', color: '#f59e0b' },
            { id: 'transport', name: 'Transport', icon: 'fa-car', color: '#ef4444' },
            { id: 'shopping', name: 'Shopping', icon: 'fa-bag-shopping', color: '#ec4899' },
            { id: 'entertainment', name: 'Entertainment', icon: 'fa-film', color: '#8b5cf6' },
            { id: 'bills', name: 'Bills & Utilities', icon: 'fa-file-invoice-dollar', color: '#f97316' },
            { id: 'health', name: 'Health', icon: 'fa-heart-pulse', color: '#ef4444' },
            { id: 'education', name: 'Education', icon: 'fa-graduation-cap', color: '#3b82f6' },
            { id: 'housing', name: 'Housing', icon: 'fa-house', color: '#06b6d4' },
            { id: 'travel', name: 'Travel', icon: 'fa-plane', color: '#10b981' },
            { id: 'subscriptions', name: 'Subscriptions', icon: 'fa-tv', color: '#6366f1' },
            { id: 'other_expense', name: 'Other Expense', icon: 'fa-circle-minus', color: '#9ca3af' }
          ]
        };
        this.setCategories(categories);
      }
    }
    return categories;
  },

  seedDemoData() {
    const transactions = this.getTransactions();
    if (transactions.length > 0) return;

    const today = new Date();
    const demoData = [];
    const categories = this.getCategories() || { income: [], expense: [] };
    const incomeCats = categories.income.map(c => c.id);
    const expenseCats = categories.expense.map(c => c.id);

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      if (i % 3 === 0 && incomeCats.length > 0) {
        demoData.push({
          id: utils.generateId(),
          type: 'income',
          amount: Math.floor(Math.random() * 2000) + 500,
          description: 'Income transaction',
          category: incomeCats[Math.floor(Math.random() * incomeCats.length)],
          date: dateStr,
          notes: '',
          createdAt: new Date().toISOString()
        });
      }

      if (expenseCats.length > 0) {
        const numExpenses = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numExpenses; j++) {
          demoData.push({
            id: utils.generateId(),
            type: 'expense',
            amount: Math.floor(Math.random() * 150) + 10,
            description: 'Expense transaction',
            category: expenseCats[Math.floor(Math.random() * expenseCats.length)],
            date: dateStr,
            notes: '',
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    this.setTransactions(demoData);

    const goals = [
      {
        id: 'goal_' + Date.now(),
        name: 'Emergency Fund',
        target: 10000,
        current: 3500,
        icon: 'fa-piggy-bank',
        date: '',
        createdAt: new Date().toISOString()
      },
      {
        id: 'goal_' + (Date.now() + 1),
        name: 'New Laptop',
        target: 2000,
        current: 800,
        icon: 'fa-laptop',
        date: '',
        createdAt: new Date().toISOString()
      }
    ];
    this.setGoals(goals);

    const budget = {
      food: 600,
      transport: 300,
      shopping: 400,
      entertainment: 200,
      bills: 500,
      health: 200,
      education: 300,
      housing: 1200,
      travel: 300,
      subscriptions: 100,
      other_expense: 200
    };
    this.setBudget(budget);
  }
};
