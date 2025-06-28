// Dopamine Diner Popup Script
class DopamineDinerPopup {
  constructor() {
    this.data = {};
    this.dishes = [
      {
        name: "Mindful Morning Bowl",
        icon: "🥣",
        description: "A balanced start with focused browsing",
        ingredients: ["greens", "water"]
      },
      {
        name: "Greasy Dopaminari Alfredo", 
        icon: "🍝",
        description: "Heavy on the scrolling sauce",
        ingredients: ["grease", "salt"]
      },
      {
        name: "Overcooked Reels Ramen",
        icon: "🍜", 
        description: "Too much sugar from short-form content",
        ingredients: ["sugar", "grease"]
      },
      {
        name: "Seasoned Tab Switching Stir-fry",
        icon: "🥘",
        description: "Over-seasoned with context switching",
        ingredients: ["salt", "grease", "sugar"]
      },
      {
        name: "Fresh Focus Salad",
        icon: "🥗",
        description: "Clean and nutritious deep reading",
        ingredients: ["greens", "water"]
      },
      {
        name: "Burnout Burger Deluxe",
        icon: "🍔",
        description: "All the unhealthy digital ingredients",
        ingredients: ["grease", "salt", "sugar"]
      }
    ];
    
    this.ingredients = {
      grease: { icon: "🛢️", name: "Grease", description: "From endless scrolling" },
      sugar: { icon: "🍭", name: "Sugar", description: "From short-form content" },
      salt: { icon: "🧂", name: "Salt", description: "From tab switching" },
      greens: { icon: "🥬", name: "Greens", description: "From focused reading" },
      water: { icon: "💧", name: "Water", description: "From mindful breaks" }
    };
    
    this.upgrades = [
      { id: "basic-kitchen", icon: "🏠", name: "Basic Kitchen", unlockAt: 0 },
      { id: "zen-kitchen", icon: "🧘", name: "Zen Kitchen", unlockAt: 5 },
      { id: "street-food", icon: "🚚", name: "Food Truck", unlockAt: 10 },
      { id: "cafe", icon: "☕", name: "Cozy Café", unlockAt: 15 },
      { id: "restaurant", icon: "🍽️", name: "Restaurant", unlockAt: 25 },
      { id: "master-chef", icon: "👨‍🍳", name: "Master Chef", unlockAt: 50 }
    ];
    
    this.challenges = [
      {
        id: "no-reels",
        text: "Avoid reels and short-form videos today.",
        check: (behavior) => !(behavior.platforms && (behavior.platforms['tiktok.com'] || behavior.platforms['instagram.com'] || behavior.platforms['youtube.com']))
      },
      {
        id: "reading-session",
        text: "Complete a 5-min focused reading session.",
        check: (behavior) => (behavior.timeSpent || 0) >= 300
      },
      {
        id: "tab-limit",
        text: "Keep tab switches under 10 today.",
        check: (behavior) => (behavior.tabSwitches || 0) < 10
      },
      {
        id: "take-break",
        text: "Take at least one mindful break.",
        check: (behavior, data) => (data.sessionsCompleted || 0) > 0
      },
      {
        id: "scroll-moderate",
        text: "Keep doomscrolling (grease) under 30%.",
        check: (behavior) => {
          const scroll = behavior.scrollDistance || 0;
          return scroll < 3000;
        }
      }
    ];
    
    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.updateAll(); // Use a single updateAll for all UI/logic
    // Set up periodic refresh for all dynamic UI
    this.startAutoRefresh();
  }

  startAutoRefresh() {
    // Refresh all UI/data every 10 seconds (or as needed)
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    this._refreshInterval = setInterval(() => {
      this.updateAll();
    }, 10000);
  }

  async updateAll() {
    await this.loadData();
    this.updateUI();
    this.generateTodaysDish();
    this.showDailyChallenge();
  }

  async loadData() {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        'totalScrollDistance',
        'sessionsCompleted', 
        'burnAlertsTriggered',
        'kitchenLevel',
        'unlockedUpgrades',
        'dailyDishes',
        'todaysBehavior',
        'todaysChallenge',
        'todaysChallengeCompleted',
        // Settings
        'burnAlertFrequency',
        'taskPreference',
        'burnAlertTimeout',
        'customScrollCap',
        'customTimeCap'
      ], (result) => {
        this.data = {
          totalScrollDistance: result.totalScrollDistance || 0,
          sessionsCompleted: result.sessionsCompleted || 0,
          burnAlertsTriggered: result.burnAlertsTriggered || 0,
          kitchenLevel: result.kitchenLevel || 1,
          unlockedUpgrades: result.unlockedUpgrades || ['basic-kitchen'],
          dailyDishes: result.dailyDishes || [],
          todaysBehavior: result.todaysBehavior || {
            scrollDistance: 0,
            timeSpent: 0,
            tabSwitches: 0,
            platforms: {}
          }
        };
        this.todaysChallenge = result.todaysChallenge;
        this.todaysChallengeCompleted = result.todaysChallengeCompleted;
        // Settings defaults
        this.burnAlertFrequency = result.burnAlertFrequency || 'smart';
        this.taskPreference = result.taskPreference || 'auto';
        this.burnAlertTimeout = typeof result.burnAlertTimeout === 'number' ? result.burnAlertTimeout : 60;
        this.customScrollCap = typeof result.customScrollCap === 'number' ? result.customScrollCap : 10000;
        this.customTimeCap = typeof result.customTimeCap === 'number' ? result.customTimeCap : 3600;
        resolve();
      });
    });
  }

  setupEventListeners() {
    // Learn ingredients button
    document.getElementById('learn-ingredients').addEventListener('click', () => {
      document.getElementById('education-modal').classList.add('active');
    });

    // Close education modal
    document.getElementById('close-education').addEventListener('click', () => {
      document.getElementById('education-modal').classList.remove('active');
    });

    // Reset day button
    document.getElementById('reset-day').addEventListener('click', () => {
      this.resetDay();
    });

    // Settings button (now opens modal)
    document.getElementById('settings').addEventListener('click', () => {
      this.openSettingsModal();
    });

    // Close modal when clicking outside (for education modal)
    document.getElementById('education-modal').addEventListener('click', (e) => {
      if (e.target.id === 'education-modal') {
        document.getElementById('education-modal').classList.remove('active');
      }
    });

    // Settings modal close (delegated, since modal is injected)
    document.body.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('dd-settings-modal-overlay')) {
        e.target.classList.remove('active');
      }
      if (e.target.id === 'close-settings') {
        document.querySelector('.dd-settings-modal-overlay').classList.remove('active');
      }
    });

    // Listen for storage changes (sync across popups/tabs)
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        this.updateAll();
      }
    });
  }

  openSettingsModal() {
    let modal = document.querySelector('.dd-settings-modal-overlay');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'dd-settings-modal-overlay';
      modal.innerHTML = `
        <div class="dd-modal">
          <div class="dd-modal-header">
            <h3>Settings</h3>
            <button class="dd-close-btn" id="close-settings">×</button>
          </div>
          <div class="dd-modal-body">
            <form id="dd-settings-form">
              <div class="dd-settings-group">
                <label for="burn-alert-frequency">🔥 Burn Alert Frequency</label>
                <select id="burn-alert-frequency" name="burnAlertFrequency">
                  <option value="10">Every 10 minutes</option>
                  <option value="20">Every 20 minutes</option>
                  <option value="smart">Smart AI Mode</option>
                </select>
              </div>
              <div class="dd-settings-group">
                <label for="task-preference">🧘 Mindful Task Preference</label>
                <select id="task-preference" name="taskPreference">
                  <option value="auto">Let Dopamine Diner choose</option>
                  <option value="breathing">Breathing</option>
                  <option value="puzzle">Puzzle</option>
                  <option value="reflection">Reflection</option>
                </select>
              </div>
              <div class="dd-settings-group">
                <label for="burn-alert-timeout">⏱️ Burn Alert Timeout (<span id="timeout-value">${this.burnAlertTimeout}</span>s)</label>
                <input type="range" id="burn-alert-timeout" name="burnAlertTimeout" min="30" max="120" step="5" value="${this.burnAlertTimeout}">
              </div>
              <div class="dd-settings-group">
                <label for="custom-scroll-cap">🛢️ Scroll Cap Alert (px)</label>
                <input type="number" id="custom-scroll-cap" name="customScrollCap" min="1000" max="100000" step="100" value="${this.customScrollCap}">
              </div>
              <div class="dd-settings-group">
                <label for="custom-time-cap">⏱️ Time Spent Alert (seconds)</label>
                <input type="number" id="custom-time-cap" name="customTimeCap" min="60" max="28800" step="60" value="${this.customTimeCap}">
              </div>
              <button type="submit" class="dd-settings-save-btn">Save Settings</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      // Settings form logic
      const form = modal.querySelector('#dd-settings-form');
      const freq = form.querySelector('#burn-alert-frequency');
      const task = form.querySelector('#task-preference');
      const timeout = form.querySelector('#burn-alert-timeout');
      const timeoutVal = form.querySelector('#timeout-value');
      const scrollCap = form.querySelector('#custom-scroll-cap');
      const timeCap = form.querySelector('#custom-time-cap');

      // Set current values
      freq.value = this.burnAlertFrequency;
      task.value = this.taskPreference;
      timeout.value = this.burnAlertTimeout;
      timeoutVal.textContent = this.burnAlertTimeout;
      scrollCap.value = this.customScrollCap;
      timeCap.value = this.customTimeCap;

      timeout.addEventListener('input', () => {
        timeoutVal.textContent = timeout.value;
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        chrome.storage.local.set({
          burnAlertFrequency: freq.value,
          taskPreference: task.value,
          burnAlertTimeout: Number(timeout.value),
          customScrollCap: Number(scrollCap.value),
          customTimeCap: Number(timeCap.value)
        }, () => {
          this.burnAlertFrequency = freq.value;
          this.taskPreference = task.value;
          this.burnAlertTimeout = Number(timeout.value);
          this.customScrollCap = Number(scrollCap.value);
          this.customTimeCap = Number(timeCap.value);
          modal.classList.remove('active');
        });
      });
    } else {
      // Update values if modal already exists
      modal.querySelector('#burn-alert-frequency').value = this.burnAlertFrequency;
      modal.querySelector('#task-preference').value = this.taskPreference;
      modal.querySelector('#burn-alert-timeout').value = this.burnAlertTimeout;
      modal.querySelector('#timeout-value').textContent = this.burnAlertTimeout;
      modal.querySelector('#custom-scroll-cap').value = this.customScrollCap;
      modal.querySelector('#custom-time-cap').value = this.customTimeCap;
    }
    modal.classList.add('active');
  }

  resetDay() {
    if (confirm('Reset today\'s cooking session? This will clear your daily progress.')) {
      // Clear today's behavior, challenge, and dish
      chrome.storage.local.set({
        todaysBehavior: {
          scrollDistance: 0,
          timeSpent: 0,
          tabSwitches: 0,
          platforms: {}
        },
        todaysChallenge: null, // Chef's Order (daily challenge) reset
        todaysChallengeCompleted: false,
        dailyDishes: []
      }, () => {
        this.todaysChallenge = null;
        this.todaysChallengeCompleted = false;
        this.data.dailyDishes = [];
        // Also clear challenge status in UI
        const status = document.querySelector('.dd-challenge-status');
        if (status) status.textContent = "";
        this.updateAll();
      });
    }
  }

  showDailyChallenge() {
    // Pick or persist today's challenge
    const today = new Date().toISOString().slice(0, 10);
    let challengeObj = this.todaysChallenge;
    if (!challengeObj || challengeObj.date !== today) {
      // Pick random challenge
      const challenge = this.challenges[Math.floor(Math.random() * this.challenges.length)];
      challengeObj = { id: challenge.id, text: challenge.text, date: today };
      chrome.storage.local.set({ todaysChallenge: challengeObj, todaysChallengeCompleted: false }, () => {
        this.todaysChallenge = challengeObj;
        this.todaysChallengeCompleted = false;
        this.renderDailyChallenge(challengeObj);
      });
    } else {
      this.renderDailyChallenge(challengeObj);
    }
  }

  renderDailyChallenge(challengeObj) {
    // Render Chef's Order (daily challenge) in popup
    let challengeSection = document.getElementById('dd-daily-challenge');
    if (!challengeSection) {
      challengeSection = document.createElement('section');
      challengeSection.className = 'dd-daily-challenge-section';
      challengeSection.id = 'dd-daily-challenge';
      const container = document.querySelector('.dd-header');
      container.insertAdjacentElement('afterend', challengeSection);
    }
    // Only show "✅ Completed" if actually completed
    const completed = !!this.todaysChallengeCompleted;

    challengeSection.innerHTML = `
      <div class="dd-daily-challenge-card${completed ? ' completed' : ''}">
        <span class="dd-challenge-icon">👨‍🍳</span>
        <span class="dd-challenge-label">Chef’s Order:</span>
        <span class="dd-challenge-text">${challengeObj.text}</span>
        <span class="dd-challenge-status">${completed ? "✅ Completed" : ""}</span>
      </div>
    `;
    // Check completion
    this.checkChallengeCompletion(challengeObj);
  }

  checkChallengeCompletion(challengeObj) {
    if (this.todaysChallengeCompleted) return;
    const challenge = this.challenges.find(c => c.id === challengeObj.id);
    if (!challenge) return;
    const completed = challenge.check(this.data.todaysBehavior, this.data);
    if (completed) {
      chrome.storage.local.set({ todaysChallengeCompleted: true }, () => {
        this.todaysChallengeCompleted = true;
        // Update UI
        const status = document.querySelector('.dd-challenge-status');
        if (status) status.textContent = "✅ Completed";
        const card = document.querySelector('.dd-daily-challenge-card');
        if (card) card.classList.add('completed');
        // Update progress bar to 100%
        const bar = document.querySelector('.dd-challenge-progress-inner');
        if (bar) bar.style.width = "100%";
      });
    } else {
      // Optionally update progress bar for partial progress (future enhancement)
      const bar = document.querySelector('.dd-challenge-progress-inner');
      if (bar) bar.style.width = "0%";
    }
  }

  updateUI() {
    // Update header
    document.getElementById('kitchen-level').textContent = this.data.kitchenLevel;

    // Update stats
    document.getElementById('total-scroll').textContent = this.formatNumber(this.data.totalScrollDistance);
    document.getElementById('session-time').textContent = Math.floor(this.data.todaysBehavior.timeSpent / 60);
    document.getElementById('burn-alerts').textContent = this.data.burnAlertsTriggered;
    document.getElementById('mindful-sessions').textContent = this.data.sessionsCompleted;

    // Update ingredients
    this.updateIngredients();

    // Update upgrades
    this.updateUpgrades();

    // Update daily challenge
    this.showDailyChallenge();
  }

  updateIngredients() {
    const grid = document.getElementById('ingredients-grid');
    grid.innerHTML = '';

    const behavior = this.data.todaysBehavior;
    const ingredientAmounts = this.calculateIngredients(behavior);

    Object.entries(ingredientAmounts).forEach(([key, amount]) => {
      if (amount > 0) {
        const ingredient = this.ingredients[key];
        const item = document.createElement('div');
        item.className = 'dd-ingredient-item';
        item.innerHTML = `
          <span class="dd-ingredient-icon">${ingredient.icon}</span>
          <div class="dd-ingredient-name">${ingredient.name}</div>
          <div class="dd-ingredient-amount">${amount}%</div>
          <div class="dd-ingredient-tooltip">${ingredient.description}</div>
        `;
        grid.appendChild(item);
      }
    });
  }

  calculateIngredients(behavior) {
    const total = behavior.scrollDistance + behavior.timeSpent + behavior.tabSwitches;
    if (total === 0) return {};

    return {
      grease: Math.min(100, Math.floor((behavior.scrollDistance / 10000) * 100)),
      sugar: Math.min(100, Math.floor((behavior.timeSpent / 3600) * 100)), // Hours to percentage
      salt: Math.min(100, Math.floor((behavior.tabSwitches / 50) * 100)),
      greens: Math.max(0, 100 - Math.floor((behavior.scrollDistance / 5000) * 100)),
      water: Math.floor(this.data.sessionsCompleted * 10)
    };
  }

  updateUpgrades() {
    const grid = document.getElementById('upgrades-grid');
    grid.innerHTML = '';

    this.upgrades.forEach(upgrade => {
      const isUnlocked = this.data.unlockedUpgrades.includes(upgrade.id);
      const canUnlock = this.data.sessionsCompleted >= upgrade.unlockAt;
      
      const item = document.createElement('div');
      item.className = `dd-upgrade-item ${isUnlocked ? 'unlocked' : canUnlock ? 'available' : 'locked'}`;
      item.innerHTML = `
        <div class="dd-upgrade-icon">${upgrade.icon}</div>
        <div class="dd-upgrade-name">${upgrade.name}</div>
      `;
      
      if (canUnlock && !isUnlocked) {
        item.addEventListener('click', () => this.unlockUpgrade(upgrade.id));
        item.style.cursor = 'pointer';
      }
      
      grid.appendChild(item);
    });
  }

  generateTodaysDish() {
    const behavior = this.data.todaysBehavior;
    const ingredients = this.calculateIngredients(behavior);

    // Select dish based on dominant ingredients
    let selectedDish;
    const dominantIngredient = Object.entries(ingredients)
      .sort(([,a], [,b]) => b - a)[0];

    if (!dominantIngredient || dominantIngredient[1] === 0) {
      selectedDish = this.dishes[0]; // Default mindful bowl
    } else {
      // Select dish based on ingredient profile
      const [ingredient, amount] = dominantIngredient;
      if (ingredient === 'grease' && amount > 50) {
        selectedDish = this.dishes[1]; // Greasy Alfredo
      } else if (ingredient === 'sugar' && amount > 50) {
        selectedDish = this.dishes[2]; // Reels Ramen
      } else if (ingredient === 'salt' && amount > 50) {
        selectedDish = this.dishes[3]; // Tab Switching Stir-fry
      } else if (ingredient === 'greens' || ingredient === 'water') {
        selectedDish = this.dishes[4]; // Focus Salad
      } else {
        selectedDish = this.dishes[5]; // Burnout Burger
      }
    }

    // Update dish display
    document.querySelector('.dd-dish-icon').textContent = selectedDish.icon;
    document.getElementById('dish-name').textContent = selectedDish.name;
    document.getElementById('dish-description').textContent = selectedDish.description;
  }

  unlockUpgrade(upgradeId) {
    if (!this.data.unlockedUpgrades.includes(upgradeId)) {
      this.data.unlockedUpgrades.push(upgradeId);
      chrome.storage.local.set({ unlockedUpgrades: this.data.unlockedUpgrades });
      this.updateUpgrades();
      
      // Show unlock animation
      this.showUnlockNotification(upgradeId);
    }
  }

  showUnlockNotification(upgradeId) {
    const upgrade = this.upgrades.find(u => u.id === upgradeId);
    // Create a temporary notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 1001;
      animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = `🎉 Unlocked: ${upgrade.name}!`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Add this method to the class:
  handleTakeBreak() {
    // Always show one of the three break types, chosen randomly
    const breakTypes = ['nature_video', 'flower_breath', 'quote_carousel'];
    const pick = breakTypes[Math.floor(Math.random() * breakTypes.length)];
    switch (pick) {
      case 'nature_video':
        this.showNatureVideoModal();
        break;
      case 'flower_breath':
        this.showFlowerBreathModal();
        break;
      case 'quote_carousel':
        this.showQuoteCarouselModal();
        break;
      default:
        this.showNatureVideoModal();
    }
  }

  // Nature Video Loop Modal (YouTube embed, 2–3 min, unskippable)
  showNatureVideoModal() {
    this.closeAllBreakModals();
    const modal = document.createElement('div');
    modal.className = 'dd-nature-video-modal';
    modal.innerHTML = `
      <div class="dd-nature-video-frame">
        <iframe width="100%" height="100%" src="https://www.youtube.com/embed/1ZYbU82GVz4?autoplay=1&mute=0&controls=0&loop=1&playlist=1ZYbU82GVz4" 
          frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>
      <button class="dd-nature-video-close" style="display:none;">×</button>
    `;
    document.body.appendChild(modal);

    // Show close button after 2.5 minutes (150s)
    setTimeout(() => {
      const closeBtn = modal.querySelector('.dd-nature-video-close');
      closeBtn.style.display = 'block';
      closeBtn.classList.add('active');
      closeBtn.onclick = () => modal.remove();
    }, 150000); // 2.5 min

    // Prevent closing before timeout
    modal.addEventListener('click', (e) => {
      if (e.target === modal) e.stopPropagation();
    });
  }

  // Breathe with a Flower Modal (SVG animation, 5 rounds)
  showFlowerBreathModal() {
    this.closeAllBreakModals();
    const modal = document.createElement('div');
    modal.className = 'dd-modal-overlay active';
    modal.innerHTML = `
      <div class="dd-modal dd-flower-breath-modal">
        <div class="dd-flower-svg" id="flower-svg">
          <!-- Simple SVG flower -->
          <svg viewBox="0 0 100 100" width="100" height="100">
            <g id="petals">
              <ellipse cx="50" cy="30" rx="12" ry="28" fill="#fbbf24" opacity="0.7"/>
              <ellipse cx="50" cy="70" rx="12" ry="28" fill="#fbbf24" opacity="0.7"/>
              <ellipse cx="30" cy="50" rx="28" ry="12" fill="#fbbf24" opacity="0.7"/>
              <ellipse cx="70" cy="50" rx="28" ry="12" fill="#fbbf24" opacity="0.7"/>
            </g>
            <circle cx="50" cy="50" r="16" fill="#f59e42"/>
          </svg>
        </div>
        <div class="dd-flower-breath-instruction">Breathe with the flower</div>
        <div class="dd-flower-breath-counter" id="flower-breath-counter">Round 1 of 5</div>
        <button class="dd-close-btn" id="close-flower-breath" style="display:none;">Done</button>
      </div>
    `;
    document.body.appendChild(modal);

    const flower = modal.querySelector('#flower-svg');
    const counter = modal.querySelector('#flower-breath-counter');
    const closeBtn = modal.querySelector('#close-flower-breath');
    let round = 0;

    const doBreath = () => {
      flower.classList.add('dd-flower-breath-inhale');
      setTimeout(() => {
        flower.classList.remove('dd-flower-breath-inhale');
        flower.classList.add('dd-flower-breath-exhale');
        setTimeout(() => {
          flower.classList.remove('dd-flower-breath-exhale');
          round++;
          counter.textContent = `Round ${Math.min(round + 1, 5)} of 5`;
          if (round < 5) {
            setTimeout(doBreath, 800);
          } else {
            counter.textContent = 'Well done! 🌼';
            closeBtn.style.display = 'block';
          }
        }, 2000);
      }, 2000);
    };
    doBreath();

    closeBtn.onclick = () => modal.remove();
  }

  // Serene Quote Carousel Modal (swipeable quotes)
  showQuoteCarouselModal() {
    this.closeAllBreakModals();
    const quotes = [
      { text: "Nothing is urgent right now.", illustration: "🌙", author: "Serene Chef" },
      { text: "Let your mind rest like a calm lake.", illustration: "🏞️", author: "Zen Master" },
      { text: "You are enough, just as you are.", illustration: "🌸", author: "Gentle Gardener" },
      { text: "Breathe in peace, breathe out tension.", illustration: "🍃", author: "Mindful Baker" },
      { text: "Let go of hurry. Enjoy this moment.", illustration: "☁️", author: "Cloud Whisperer" }
    ];
    let idx = 0;

    const modal = document.createElement('div');
    modal.className = 'dd-modal-overlay active';
    modal.innerHTML = `
      <div class="dd-modal dd-quote-carousel-modal">
        <div class="dd-quote-slide">
          <div class="dd-quote-illustration" id="quote-illustration">${quotes[0].illustration}</div>
          <div class="dd-quote-text" id="quote-text">${quotes[0].text}</div>
          <div class="dd-quote-author" id="quote-author">— ${quotes[0].author}</div>
        </div>
        <div class="dd-quote-carousel-controls">
          <button class="dd-quote-carousel-btn" id="prev-quote" ${idx === 0 ? 'disabled' : ''}>&lt; Prev</button>
          <button class="dd-quote-carousel-btn" id="next-quote">${quotes.length > 1 ? 'Next &gt;' : 'Done'}</button>
        </div>
        <button class="dd-close-btn" id="close-quote-carousel" style="display:none;">Done</button>
      </div>
    `;
    document.body.appendChild(modal);

    const updateQuote = () => {
      modal.querySelector('#quote-illustration').textContent = quotes[idx].illustration;
      modal.querySelector('#quote-text').textContent = quotes[idx].text;
      modal.querySelector('#quote-author').textContent = `— ${quotes[idx].author}`;
      modal.querySelector('#prev-quote').disabled = idx === 0;
      modal.querySelector('#next-quote').textContent = idx === quotes.length - 1 ? 'Done' : 'Next >';
    };

    modal.querySelector('#prev-quote').onclick = () => {
      if (idx > 0) {
        idx--;
        updateQuote();
      }
    };
    modal.querySelector('#next-quote').onclick = () => {
      if (idx < quotes.length - 1) {
        idx++;
        updateQuote();
      } else {
        modal.remove();
      }
    };
    // Optionally show a close button after all quotes viewed
    modal.querySelector('#close-quote-carousel').onclick = () => modal.remove();
  }

  // Utility to close all break modals before opening a new one
  closeAllBreakModals() {
    document.querySelectorAll('.dd-nature-video-modal, .dd-modal-overlay.active').forEach(el => el.remove());
  }

  createBurnAlertModal(reason, message, taskType = 'breathing') {
    const modal = document.createElement('div');
    modal.className = 'dd-modal-overlay active';
    modal.innerHTML = `
      <div class="dd-modal dd-burn-alert-modal">
        <div class="dd-modal-header">
          <h3>Burn Alert!</h3>
          <button class="dd-close-btn" id="close-burn-alert">×</button>
        </div>
        <div class="dd-modal-body">
          <p>${message}</p>
          <div class="dd-modal-reason">${reason}</div>
          <div class="dd-modal-actions">
            <button class="dd-btn-primary" id="take-action">Take Action</button>
            <button class="dd-btn-secondary" id="ignore-alert">Ignore</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close button
    modal.querySelector('#close-burn-alert').onclick = () => modal.remove();

    // Take Action button (opens task modal)
    const actionBtn = modal.querySelector('#take-action');
    actionBtn.onclick = () => {
      this.openTaskModal(taskType);
      modal.remove();
    };

    // Ignore button (just closes modal)
    const ignoreBtn = modal.querySelector('#ignore-alert');
    ignoreBtn.onclick = () => modal.remove();

    // Break button (triggers break logic)
    const breakBtn = modal.querySelector('.dd-btn-break');
    breakBtn.addEventListener('click', () => this.handleTakeBreak());
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new DopamineDinerPopup();
});

// Add CSS animation for unlock notification
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);