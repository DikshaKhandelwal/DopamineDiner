// Content script for behavior tracking and burn alerts
class DopamineDinerTracker {
  constructor() {
    this.scrollData = {
      distance: 0,
      startTime: Date.now(),
      lastScrollTime: Date.now(),
      scrollSpeed: 0
    };
    this.isTracking = true;
    this.burnAlertShown = false;

    // --- Burn alert control ---
    this.burnAlertLastShown = 0;
    this.burnCooldownMinutes = 15; // 15 min cooldown
    this.burnTriggerThreshold = 0.75; // Sensitivity threshold (0-1, higher = less sensitive)

    // Session timer for accurate timeSpent (pause on blur, resume on focus)
    this.sessionActive = true;
    this.sessionStart = Date.now();
    this.sessionAccum = 0;

    this.init();
  }

  init() {
    this.trackScrollBehavior();
    this.trackTimeSpent();
    this.listenForMessages();
    this.detectPlatform();
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    const platforms = {
      'youtube.com': 'video_content',
      'instagram.com': 'social_media',  
      'twitter.com': 'social_media',
      'x.com': 'social_media',
      'reddit.com': 'forum',
      'tiktok.com': 'short_form',
      'facebook.com': 'social_media'
    };
    
    this.platform = platforms[hostname.replace('www.', '')] || 'general';
  }

  trackScrollBehavior() {
    let scrollTimeout;

    window.addEventListener('scroll', () => {
      const now = Date.now();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Calculate scroll distance and speed
      const timeDiff = now - this.scrollData.lastScrollTime;
      const scrollDiff = Math.abs(scrollTop - (this.scrollData.lastPosition || 0));

      this.scrollData.distance += scrollDiff;
      this.scrollData.scrollSpeed = timeDiff > 0 ? (scrollDiff / timeDiff) * 1000 : 0;
      this.scrollData.lastPosition = scrollTop;
      this.scrollData.lastScrollTime = now;

      // Check for doomscrolling pattern using refined logic
      this.checkBurnTrigger();

      // Clear timeout and set new one
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.reportBehaviorData();
      }, 5000);
    });
  }

  // --- Burn alert logic with cooldown and sensitivity ---
  checkBurnTrigger() {
    // Only trigger if not already showing a modal
    if (this.burnAlertShown) return;

    // Cooldown: Only allow one modal every X minutes
    const now = Date.now();
    if (now - this.burnAlertLastShown < this.burnCooldownMinutes * 60 * 1000) return;

    // Sensitivity: Calculate a "burn score" based on scroll speed and time spent
    const normScroll = Math.min(1, this.scrollData.scrollSpeed / 3500); // 3500 px/s = max
    const normTime = Math.min(1, this.getTimeSpent() / 600); // 10 min = max
    const burnScore = (normScroll * 0.7 + normTime * 0.3); // Weight scroll speed more

    if (burnScore >= this.burnTriggerThreshold) {
      this.burnAlertLastShown = now;
      this.showBurnAlert('Doomscrolling Detected', 'You\'ve been scrolling fast for a while. Time for a mindful pause!');
    }
  }

  trackTimeSpent() {
    // Track active time on page
    this.isActive = true;

    window.addEventListener('focus', () => {
      this.isActive = true;
      if (!this.sessionActive) {
        this.sessionActive = true;
        this.sessionStart = Date.now();
      }
    });
    window.addEventListener('blur', () => {
      this.isActive = false;
      if (this.sessionActive) {
        this.sessionActive = false;
        this.sessionAccum += Date.now() - this.sessionStart;
      }
    });

    // Report data every 30 seconds
    setInterval(() => {
      if (this.isActive) {
        this.reportBehaviorData();
      }
    }, 30000);
  }

  getTimeSpent() {
    // Returns session time in seconds, pausing on blur
    let active = this.sessionAccum;
    if (this.sessionActive) {
      active += Date.now() - this.sessionStart;
    }
    return Math.floor(active / 1000);
  }

  reportBehaviorData() {
    const data = {
      scrollDistance: this.scrollData.distance,
      scrollSpeed: this.scrollData.scrollSpeed,
      timeSpent: this.getTimeSpent(),
      platform: this.platform,
      url: window.location.href,
      timestamp: Date.now(),
      tabId: this.getTabId()
    };

    chrome.runtime.sendMessage({
      type: 'UPDATE_BEHAVIOR_DATA',
      data: data
    });

    // Update daily challenge status after reporting data
    this.updateDailyChallengeStatus();
  }

  getTabId() {
    // Generate a simple tab identifier for this session
    if (!this.tabId) {
      this.tabId = Math.random().toString(36).substr(2, 9);
    }
    return this.tabId;
  }

  listenForMessages() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'TRIGGER_BURN_ALERT') {
        this.showBurnAlert(request.reason, request.message);
      }
    });
  }

  showBurnAlert(reason, message) {
    if (this.burnAlertShown) return;
    this.burnAlertShown = true;
    this.isTracking = false;

    // Track burn alert count for stats
    try {
      chrome.storage.local.get(['burnAlertsTriggered'], (result) => {
        const count = (result.burnAlertsTriggered || 0) + 1;
        chrome.storage.local.set({ burnAlertsTriggered: count });
      });
    } catch (e) {}

    // Choose a random mindful task
    const taskType = this.pickMindfulTask();

    // Create burn alert modal
    const modal = this.createBurnAlertModal(reason, message, taskType);
    document.body.appendChild(modal);

    // Freeze scrolling
    document.body.style.overflow = 'hidden';

    // Auto-dismiss after 90 seconds if no interaction
    setTimeout(() => {
      if (modal.parentNode) {
        this.dismissBurnAlert(modal);
      }
    }, 90000);
  }

  pickMindfulTask() {
    // Weighted random selection - some games are more likely
    const games = [
      { id: 'breathing', weight: 17 },
      { id: 'icon_match', weight: 19 },
      { id: 'nature_gif', weight: 10 },
      { id: 'scroll_puzzle', weight: 9 },
      { id: 'chef_memory', weight: 17 },
      { id: 'footprint_maze', weight: 10 },
      { id: 'breathing_bubble', weight: 18 },
      { id: 'turtle_race', weight: 10 },
      { id: 'egg_catch', weight: 15 }
    ];

    const totalWeight = games.reduce((sum, game) => sum + game.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const game of games) {
      random -= game.weight;
      if (random <= 0) {
        return game.id;
      }
    }
    
    return 'breathing'; // fallback
  }

  createBurnAlertModal(reason, message, taskType = 'breathing') {
    const modal = document.createElement('div');
    modal.className = 'dopamine-diner-modal';
    modal.innerHTML = `
      <div class="dd-modal-backdrop">
        <div class="dd-modal-content">
          <div class="dd-burn-icon">🔥</div>
          <h2 class="dd-modal-title">Your Dish is Burning!</h2>
          <p class="dd-modal-message">${message}</p>
          <div class="dd-mindful-task"></div>
          <div class="dd-reflection" style="display:none;">
            <label for="dd-reflection-input">Quick reflection: Why am I still here?</label>
            <textarea id="dd-reflection-input" placeholder="I'm here because..." maxlength="200"></textarea>
            <div class="dd-char-counter">0/200</div>
          </div>
          <div class="dd-modal-actions">
            <button class="dd-btn-continue" style="display:none;" disabled>Continue Cooking</button>
            <button class="dd-btn-break">Take a Break</button>
          </div>
        </div>
      </div>
    `;

    const taskContainer = modal.querySelector('.dd-mindful-task');
    const reflection = modal.querySelector('.dd-reflection');
    const continueBtn = modal.querySelector('.dd-btn-continue');
    const breakBtn = modal.querySelector('.dd-btn-break');
    const textarea = modal.querySelector('#dd-reflection-input');
    const charCounter = modal.querySelector('.dd-char-counter');

    // Track completion state
    let taskComplete = false;
    let reflectionComplete = false;

    // Helper to enable continue only when both are done
    function updateContinueState() {
      if (taskComplete && reflectionComplete) {
        continueBtn.disabled = false;
        continueBtn.style.display = 'block';
        continueBtn.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
      } else {
        continueBtn.disabled = true;
        continueBtn.style.display = 'none';
      }
    }

    // Enhanced reflection logic with character counter
    textarea.addEventListener('input', () => {
      const length = textarea.value.length;
      charCounter.textContent = `${length}/200`;
      
      if (length >= 10) {
        reflection.classList.add('dd-reflection-complete');
        if (!reflection.querySelector('.dd-checkmark')) {
          const check = document.createElement('div');
          check.className = 'dd-checkmark';
          check.innerHTML = '✓';
          check.style.cssText = `
            position: absolute; top: 8px; right: 8px;
            background: #10b981; color: white; border-radius: 50%;
            width: 24px; height: 24px; display: flex; align-items: center;
            justify-content: center; font-weight: bold; font-size: 14px;
          `;
          reflection.style.position = 'relative';
          reflection.appendChild(check);
        }
        reflectionComplete = true;
      } else {
        reflection.classList.remove('dd-reflection-complete');
        const checkmark = reflection.querySelector('.dd-checkmark');
        if (checkmark) checkmark.remove();
        reflectionComplete = false;
      }
      updateContinueState();
    });

    // Insert mindful task module
    switch (taskType) {
      case 'breathing':
        this.renderBreathingTaskWithCompletion(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      case 'icon_match':
        this.renderIconMatchTaskWithCompletion(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      case 'nature_gif':
        this.renderNatureGifTask(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      case 'scroll_puzzle':
        this.renderScrollPuzzleTask(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      case 'chef_memory':
        this.renderChefMemoryTask(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      case 'footprint_maze':
        this.renderFootprintMazeTask(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      case 'breathing_bubble':
        this.renderBreathingBubbleTask(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      case 'turtle_race':
        this.renderTurtleRaceTask(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      case 'egg_catch':
        this.renderEnhancedEggCatchTask(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
      default:
        this.renderBreathingTaskWithCompletion(taskContainer, modal, () => {
          taskComplete = true;
          updateContinueState();
        });
        break;
    }

    // Continue: only enabled after task+reflection
    continueBtn.addEventListener('click', () => this.handleContinue(modal));
    breakBtn.addEventListener('click', () => this.handleTakeBreak(modal));

    return modal;
  }

  // Helper for breathing task with completion callback
  renderBreathingTaskWithCompletion(container, modal, onComplete) {
    container.innerHTML = `
      <div class="dd-task-breathing">
        <div class="dd-breathing-circle"></div>
        <p style="color:#92400e; margin: 12px 0;">Take 4 deep breaths with the circle</p>
        <div class="dd-breath-counter" style="color:#059669; font-weight: 600;">Breath 1 of 4</div>
        <div class="dd-breath-progress" style="width: 100%; height: 4px; background: #fed7aa; border-radius: 2px; margin: 8px 0;">
          <div class="dd-progress-bar" style="width: 0%; height: 100%; background: #10b981; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    const task = container.querySelector('.dd-task-breathing');
    const circle = task.querySelector('.dd-breathing-circle');
    const counter = task.querySelector('.dd-breath-counter');
    const progressBar = task.querySelector('.dd-progress-bar');
    let breathCount = 0;

    const breathe = () => {
      circle.classList.add('dd-inhale');
      setTimeout(() => {
        circle.classList.remove('dd-inhale');
        circle.classList.add('dd-exhale');
        setTimeout(() => {
          circle.classList.remove('dd-exhale');
          breathCount++;
          progressBar.style.width = `${(breathCount / 4) * 100}%`;
          
          if (breathCount < 4) {
            counter.textContent = `Breath ${breathCount + 1} of 4`;
            setTimeout(breathe, 1000);
          } else {
            counter.textContent = 'Well done! 🧘‍♀️';
            task.classList.add('dd-completed');
            modal.querySelector('.dd-reflection').style.display = 'block';
            if (typeof onComplete === 'function') onComplete();
          }
        }, 3000); // Longer exhale
      }, 2500); // Longer inhale
    };
    breathe();
  }

  // Helper for icon match task with completion callback
  renderIconMatchTaskWithCompletion(container, modal, onComplete) {
    const icons = ['🌲','🌊','🌸','🌞','🍃','🌻','🦋','🌙'];
    const gameIcons = icons.slice(0, 4); // Use 4 pairs for better difficulty
    let pairs = gameIcons.concat(gameIcons);
    pairs = pairs.sort(() => Math.random() - 0.5);

    container.innerHTML = `
      <div class="dd-icon-match-game">
        <p style="color:#92400e; margin-bottom: 12px; font-weight: 600;">Match the nature pairs</p>
        <div class="dd-icon-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; max-width: 200px; margin: 0 auto;"></div>
        <div class="dd-icon-match-status" style="color:#059669; margin-top: 12px; font-weight: 600;"></div>
        <div class="dd-match-progress" style="width: 100%; height: 4px; background: #fed7aa; border-radius: 2px; margin: 8px 0;">
          <div class="dd-progress-bar" style="width: 0%; height: 100%; background: #10b981; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    
    const grid = container.querySelector('.dd-icon-grid');
    const status = container.querySelector('.dd-icon-match-status');
    const progressBar = container.querySelector('.dd-progress-bar');
    let selected = [];
    let matched = [];

    pairs.forEach((icon, i) => {
      const btn = document.createElement('button');
      btn.className = 'dd-icon-btn';
      btn.textContent = icon;
      btn.dataset.index = i;
      btn.style.cssText = `
        width: 40px; height: 40px; border: 2px solid #fbbf24;
        background: #fff7ed; border-radius: 8px; font-size: 1.5rem;
        cursor: pointer; transition: all 0.2s; display: flex;
        align-items: center; justify-content: center;
      `;
      
      btn.addEventListener('click', () => {
        if (btn.classList.contains('matched') || selected.length === 2 || btn.classList.contains('selected')) return;
        
        btn.classList.add('selected');
        btn.style.background = '#fbbf24';
        selected.push({icon, idx: i, btn});
        
        if (selected.length === 2) {
          if (selected[0].icon === selected[1].icon && selected[0].idx !== selected[1].idx) {
            // Match found
            setTimeout(() => {
              selected[0].btn.classList.add('matched');
              selected[1].btn.classList.add('matched');
              selected[0].btn.style.background = '#10b981';
              selected[1].btn.style.background = '#10b981';
              selected[0].btn.style.color = 'white';
              selected[1].btn.style.color = 'white';
              matched.push(selected[0].icon);
              status.textContent = 'Matched! ✨';
              progressBar.style.width = `${(matched.length / gameIcons.length) * 100}%`;
              selected = [];
              
              if (matched.length === gameIcons.length) {
                setTimeout(() => {
                  status.textContent = '🎉 All matched! Well done.';
                  modal.querySelector('.dd-reflection').style.display = 'block';
                  if (typeof onComplete === 'function') onComplete();
                }, 500);
              }
            }, 300);
          } else {
            // No match
            setTimeout(() => {
              selected[0].btn.classList.remove('selected');
              selected[1].btn.classList.remove('selected');
              selected[0].btn.style.background = '#fff7ed';
              selected[1].btn.style.background = '#fff7ed';
              status.textContent = 'Try again! 🤔';
              selected = [];
            }, 1000);
          }
        }
      });
      grid.appendChild(btn);
    });
  }

  renderNatureGifTask(container, modal, onComplete) {
    const scenes = [
      { 
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80',
        title: 'Forest Path',
        description: 'Imagine walking through this peaceful forest...'
      },
      { 
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80',
        title: 'Mountain Lake',
        description: 'Feel the calm of this serene mountain lake...'
      },
      { 
        url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=400&q=80',
        title: 'Ocean Waves',
        description: 'Listen to the rhythm of gentle waves...'
      }
    ];
    
    const scene = scenes[Math.floor(Math.random() * scenes.length)];
    
    container.innerHTML = `
      <div class="dd-nature-scene-task">
        <p style="color:#92400e; margin-bottom: 12px; font-weight: 600;">🌿 Mindful Nature Break</p>
        <div class="dd-scene-container" style="position: relative; border-radius: 12px; overflow: hidden; margin-bottom: 12px;">
          <img src="${scene.url}" class="dd-nature-img" alt="${scene.title}" style="width: 100%; height: 120px; object-fit: cover;" />
          <div class="dd-scene-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; padding: 8px; font-size: 0.9rem;">
            ${scene.description}
          </div>
        </div>
        <div class="dd-nature-timer" style="color:#fbbf24; font-weight: 600; margin-bottom: 8px;">Take 30 seconds to breathe and observe</div>
        <div class="dd-timer-progress" style="width: 100%; height: 6px; background: #fed7aa; border-radius: 3px; margin-bottom: 12px;">
          <div class="dd-timer-bar" style="width: 0%; height: 100%; background: #10b981; border-radius: 3px; transition: width 1s linear;"></div>
        </div>
        <button class="dd-nature-continue-btn" disabled style="padding: 8px 16px; border-radius: 8px; background: #d1d5db; color: #6b7280; border: none; font-weight: 600; cursor: not-allowed;">
          Continue (30s)
        </button>
      </div>
    `;
    
    const timerEl = container.querySelector('.dd-nature-timer');
    const continueBtn = container.querySelector('.dd-nature-continue-btn');
    const timerBar = container.querySelector('.dd-timer-bar');
    
    let seconds = 30;
    const timer = setInterval(() => {
      seconds--;
      const progress = ((30 - seconds) / 30) * 100;
      timerBar.style.width = `${progress}%`;
      continueBtn.textContent = `Continue (${seconds}s)`;
      
      if (seconds === 0) {
        clearInterval(timer);
        continueBtn.disabled = false;
        continueBtn.style.background = '#10b981';
        continueBtn.style.color = 'white';
        continueBtn.style.cursor = 'pointer';
        continueBtn.textContent = 'Continue ✨';
        timerEl.textContent = 'Well done! How do you feel?';
      }
    }, 1000);

    continueBtn.addEventListener('click', () => {
      if (!continueBtn.disabled) {
        modal.querySelector('.dd-reflection').style.display = 'block';
        if (typeof onComplete === 'function') onComplete();
      }
    });
  }

  renderScrollPuzzleTask(container, modal, onComplete) {
    container.innerHTML = `
      <div style="text-align:center;">
        <strong style="color:#92400e;">🧩 Digital Detox Puzzle</strong>
        <p style="color:#a16207; font-size: 0.9rem; margin: 8px 0;">Arrange the healthy digital habits in order</p>
        <div id="puzzle-pieces" style="display:flex; flex-direction: column; gap:8px; margin:12px 0;"></div>
        <div id="puzzle-status" style="color:#059669;font-weight:600; margin-top: 12px;"></div>
        <div class="dd-memory-progress" style="width: 100%; height: 4px; background: #fed7aa; border-radius: 2px; margin: 8px 0;">
          <div class="dd-progress-bar" style="width: 0%; height: 100%; background: #10b981; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    
    const habits = [
      { id: 1, text: "🌅 Start with intention", order: 1 },
      { id: 2, text: "📚 Focus deeply", order: 2 },
      { id: 3, text: "⏸️ Take breaks", order: 3 },
      { id: 4, text: "🌙 End mindfully", order: 4 }
    ];
    
    // Shuffle the habits
    const shuffled = [...habits].sort(() => Math.random() - 0.5);
    const piecesContainer = container.querySelector('#puzzle-pieces');
    const status = container.querySelector('#puzzle-status');
    
    let currentOrder = [];
    
    shuffled.forEach((habit, index) => {
      const piece = document.createElement('div');
      piece.style.cssText = `
        padding: 12px; background: #fff7ed; border: 2px solid #fbbf24;
        border-radius: 8px; cursor: pointer; transition: all 0.2s;
        user-select: none; position: relative;
      `;
      piece.textContent = habit.text;
      piece.dataset.id = habit.id;
      piece.dataset.order = habit.order;
      
      piece.addEventListener('click', () => {
        if (currentOrder.includes(habit.id)) return;
        
        currentOrder.push(habit.id);
        piece.style.background = '#10b981';
        piece.style.color = 'white';
        piece.style.border = '2px solid #059669';
        
        // Add order number
        const orderNum = document.createElement('span');
        orderNum.textContent = currentOrder.length;
        orderNum.style.cssText = `
          position: absolute; top: -8px; right: -8px;
          background: #f97316; color: white; border-radius: 50%;
          width: 20px; height: 20px; display: flex; align-items: center;
          justify-content: center; font-size: 0.8rem; font-weight: bold;
        `;
        piece.appendChild(orderNum);
        
        if (currentOrder.length === habits.length) {
          // Check if order is correct
          const isCorrect = currentOrder.every((id, index) => {
            const habit = habits.find(h => h.id === id);
            return habit.order === index + 1;
          });
          
          if (isCorrect) {
            status.textContent = '🎉 Perfect! You understand healthy digital habits.';
            setTimeout(() => {
              modal.querySelector('.dd-reflection').style.display = 'block';
              if (typeof onComplete === 'function') onComplete();
            }, 1000);
          } else {
            status.textContent = '🤔 Try again! Think about the natural flow of a day.';
            setTimeout(() => {
              // Reset
              currentOrder = [];
              piecesContainer.querySelectorAll('div').forEach(p => {
                p.style.background = '#fff7ed';
                p.style.color = '#92400e';
                p.style.border = '2px solid #fbbf24';
                const orderNum = p.querySelector('span');
                if (orderNum) orderNum.remove();
              });
              status.textContent = '';
            }, 2000);
          }
        }
      });
      
      piecesContainer.appendChild(piece);
    });
  }

  renderChefMemoryTask(container, modal, onComplete) {
    container.innerHTML = `
      <div style="text-align:center;">
        <strong style="color:#92400e;">🎯 Digital Ingredient Memory</strong>
        <p style="color:#a16207; font-size: 0.9rem; margin: 8px 0;">Match ingredients with their digital meanings</p>
        <div id="memory-grid" style="display:grid;grid-template-columns:repeat(4,50px);gap:8px;justify-content:center;margin:14px 0 10px 0;"></div>
        <div id="game-status" style="color:#059669;font-weight:600;margin-bottom:8px;"></div>
        <div class="dd-memory-progress" style="width: 100%; height: 4px; background: #fed7aa; border-radius: 2px; margin: 8px 0;">
          <div class="dd-progress-bar" style="width: 0%; height: 100%; background: #10b981; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    
    const memoryData = [
      { icon: "🍭", label: "Reels" },
      { icon: "🧂", label: "Tabs" },
      { icon: "🛢️", label: "Scroll" },
      { icon: "🥬", label: "Focus" }
    ];
    
    const grid = container.querySelector("#memory-grid");
    const status = container.querySelector("#game-status");
    const progressBar = container.querySelector(".dd-progress-bar");
    let firstCard = null;
    let secondCard = null;
    let lockBoard = false;
    let matchedPairs = 0;
    
    function shuffleAndBuildGame() {
      const cards = [];
      memoryData.forEach(item => {
        cards.push({ type: "icon", value: item.icon, pair: item.label });
        cards.push({ type: "label", value: item.label, pair: item.icon });
      });
      cards.sort(() => 0.5 - Math.random());
      grid.innerHTML = "";
      
      cards.forEach((card) => {
        const div = document.createElement("div");
        div.className = "dd-card";
        div.dataset.type = card.type;
        div.dataset.value = card.value;
        div.dataset.pair = card.pair;
        div.style.cssText = `
          width: 46px; height: 46px; background: #fff7ed; border: 2px solid #fbbf24;
          border-radius: 8px; display: flex; align-items: center; justify-content: center;
          font-size: ${card.type === "icon" ? "1.5rem" : "0.7rem"}; cursor: pointer;
          color: #92400e; font-weight: 600; transition: all 0.2s;
        `;
        div.innerHTML = '?';
        div.addEventListener("click", () => flipCard(div));
        grid.appendChild(div);
      });
    }
    
    function flipCard(card) {
      if (lockBoard || card.classList.contains("flipped") || card === firstCard) return;

      card.classList.add("flipped");
      card.innerHTML = card.dataset.value;
      card.style.background = '#fbbf24';

      if (!firstCard) {
        firstCard = card;
      } else {
        secondCard = card;
        lockBoard = true;

        const isMatch = (
          firstCard.dataset.pair === secondCard.dataset.value &&
          secondCard.dataset.pair === firstCard.dataset.value
        );

        if (isMatch) {
          matchedPairs++;
          firstCard.style.background = '#10b981';
          secondCard.style.background = '#10b981';
          firstCard.style.color = 'white';
          secondCard.style.color = 'white';
          progressBar.style.width = `${(matchedPairs / memoryData.length) * 100}%`;
          resetCards();

          if (matchedPairs === memoryData.length) {
            status.textContent = "🎉 You understand the ingredients!";
            setTimeout(() => {
              modal.querySelector('.dd-reflection').style.display = 'block';
              if (typeof onComplete === 'function') onComplete();
            }, 1000);
          }
        } else {
          setTimeout(() => {
            firstCard.classList.remove("flipped");
            secondCard.classList.remove("flipped");
            firstCard.innerHTML = '?';
            secondCard.innerHTML = '?';
            firstCard.style.background = '#fff7ed';
            secondCard.style.background = '#fff7ed';
            resetCards();
          }, 1000);
        }
      }
    }
    
    function resetCards() {
      [firstCard, secondCard] = [null, null];
      lockBoard = false;
    }
    
    shuffleAndBuildGame();
  }

  renderFootprintMazeTask(container, modal, onComplete) {
    container.innerHTML = `
      <div style="text-align:center;">
        <strong style="color:#92400e;">👣 Digital Footprint Maze</strong>
        <p style="color:#a16207; font-size: 0.9rem; margin: 8px 0;">Navigate mindfully to the exit</p>
        <div id="maze-grid" style="display:grid;grid-template-columns:repeat(5,32px);gap:2px;justify-content:center;margin:10px auto;"></div>
        <div id="maze-status" style="color:#059669;font-weight:600; margin-top: 8px;"></div>
        <div style="font-size:0.8rem;color:#a16207; margin-top: 8px;">Use arrow keys to move 🦶 to 🟩</div>
      </div>
    `;
    
    const size = 5;
    const grid = Array(size * size).fill('');
    grid[0] = '🦶';
    grid[size * size - 1] = '🟩';

    // Create a solvable maze with strategic wall placement
    function createMaze() {
      // Clear previous walls
      for (let i = 1; i < size * size - 1; i++) {
        grid[i] = '';
      }
      
      // Add walls that create a simple but engaging path
      const walls = [6, 8, 11, 13, 16, 18]; // Strategic positions
      walls.forEach(pos => {
        if (pos < size * size - 1) {
          grid[pos] = '🧱';
        }
      });
      
      // Ensure path exists using simple pathfinding
      if (!isPathClear()) {
        // Fallback: minimal walls
        for (let i = 1; i < size * size - 1; i++) grid[i] = '';
        grid[7] = '🧱';
        grid[12] = '🧱';
        grid[17] = '🧱';
      }
    }

    function isPathClear() {
      const visited = Array(size * size).fill(false);
      const queue = [0];
      visited[0] = true;
      
      while (queue.length) {
        const idx = queue.shift();
        if (idx === size * size - 1) return true;
        
        const neighbors = [];
        if (idx % size > 0) neighbors.push(idx - 1);
        if (idx % size < size - 1) neighbors.push(idx + 1);
        if (idx - size >= 0) neighbors.push(idx - size);
        if (idx + size < size * size) neighbors.push(idx + size);
        
        for (const n of neighbors) {
          if (!visited[n] && grid[n] !== '🧱') {
            visited[n] = true;
            queue.push(n);
          }
        }
      }
      return false;
    }

    createMaze();

    function render() {
      const maze = container.querySelector('#maze-grid');
      maze.innerHTML = '';
      grid.forEach((cell, idx) => {
        const div = document.createElement('div');
        div.style.cssText = `
          width: 30px; height: 30px; background: #fff7ed; border: 1px solid #fbbf24;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; color: #92400e;
        `;
        div.textContent = cell || '';
        maze.appendChild(div);
      });
    }
    
    render();
    let pos = 0;
    let moves = 0;
    
    function move(dir) {
      let next = pos;
      if (dir === 'ArrowRight' && (pos % size) < size - 1) next++;
      if (dir === 'ArrowLeft' && (pos % size) > 0) next--;
      if (dir === 'ArrowUp' && pos >= size) next -= size;
      if (dir === 'ArrowDown' && pos < size * (size - 1)) next += size;
      
      if (grid[next] === '🧱') return;
      
      grid[pos] = '';
      pos = next;
      moves++;
      
      if (grid[pos] === '🟩') {
        grid[pos] = '🦶';
        render();
        const efficiency = moves <= 8 ? 'efficiently' : 'successfully';
        container.querySelector('#maze-status').innerHTML = `🎉 Escaped ${efficiency}! (${moves} moves)`;
        
        // Celebration effect
        setTimeout(() => {
          modal.querySelector('.dd-reflection').style.display = 'block';
          if (typeof onComplete === 'function') onComplete();
        }, 1500);
        
        document.removeEventListener('keydown', handler);
        return;
      }
      
      grid[pos] = '🦶';
      render();
    }
    
    function handler(e) {
      if (['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault();
        move(e.key);
      }
    }
    
    document.addEventListener('keydown', handler);
    modal.addEventListener('remove', () => document.removeEventListener('keydown', handler));
  }

  renderBreathingBubbleTask(container, modal, onComplete) {
    container.innerHTML = `
      <div style="text-align:center;">
        <strong style="color:#92400e;">🧘 Breathing Bubble</strong>
        <p style="color:#a16207; font-size: 0.9rem; margin: 8px 0;">Hold to inhale, release to exhale - 3 rounds</p>
        <div id="bubble" style="margin:16px auto;width:80px;height:80px;border-radius:50%;background:#10b981;box-shadow:0 0 20px #10b98199;transition:all 0.5s;cursor:pointer;"></div>
        <div id="bubble-instruction" style="margin:8px 0;font-weight:600;color:#92400e;">Click and hold to inhale...</div>
        <div id="bubble-status" style="color:#059669;font-weight:600;"></div>
        <div class="dd-bubble-progress" style="width: 100%; height: 4px; background: #fed7aa; border-radius: 2px; margin: 8px 0;">
          <div class="dd-progress-bar" style="width: 0%; height: 100%; background: #10b981; border-radius: 2px; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    
    const bubble = container.querySelector('#bubble');
    const instruction = container.querySelector('#bubble-instruction');
    const status = container.querySelector('#bubble-status');
    const progressBar = container.querySelector('.dd-progress-bar');
    let phase = 0, rounds = 0, timer = null, holding = false;

    function updateProgress() {
      progressBar.style.width = `${(rounds / 3) * 100}%`;
    }

    function showCompletion() {
      status.textContent = 'Perfect breathing! 🌸';
      updateProgress();
      setTimeout(() => {
        modal.querySelector('.dd-reflection').style.display = 'block';
        if (typeof onComplete === 'function') onComplete();
      }, 1000);
    }

    function nextPhase() {
      if (phase === 0) {
        instruction.textContent = 'Hold for 4 seconds...';
        bubble.style.background = '#fbbf24';
        timer = setTimeout(() => { phase = 2; nextPhase(); }, 4000);
        phase = 1;
      } else if (phase === 1) {
        status.textContent = 'Hold longer for better effect';
        instruction.textContent = 'Click and hold to inhale...';
        bubble.style.background = '#10b981';
        bubble.style.transform = 'scale(1)';
        phase = 0;
      } else if (phase === 2) {
        instruction.textContent = 'Exhale slowly...';
        bubble.style.background = '#059669';
        bubble.style.transform = 'scale(0.8)';
        setTimeout(() => {
          rounds++;
          updateProgress();
          if (rounds >= 3) {
            showCompletion();
          } else {
            instruction.textContent = 'Click and hold to inhale...';
            bubble.style.background = '#10b981';
            bubble.style.transform = 'scale(1)';
            phase = 0;
          }
        }, 4000);
      }
    }
    
    bubble.onmousedown = bubble.ontouchstart = (e) => {
      e.preventDefault();
      if (phase === 0) {
        holding = true;
        instruction.textContent = 'Inhale deeply...';
        bubble.style.transform = 'scale(1.3)';
        bubble.style.boxShadow = '0 0 30px #10b98199';
        timer = setTimeout(() => nextPhase(), 4000);
      }
    };
    
    bubble.onmouseup = bubble.ontouchend = bubble.onmouseleave = (e) => {
      e.preventDefault();
      if (!holding) return;
      holding = false;
      bubble.style.transform = 'scale(1)';
      bubble.style.boxShadow = '0 0 20px #10b98199';
      if (phase === 1) {
        clearTimeout(timer);
        nextPhase();
      }
    };
  }

  renderTurtleRaceTask(container, modal, onComplete) {
    container.innerHTML = `
      <div style="text-align:center;">
        <strong style="color:#92400e;">🐢 Mindful Pace Challenge</strong>
        <p style="color:#a16207; font-size: 0.9rem; margin: 8px 0;">Move slowly and steadily - patience wins!</p>
        <div id="turtle-track" style="width:240px;height:40px;background:#fff7ed;border-radius:20px;position:relative;margin:12px auto;border:2px solid #fbbf24;">
          <span id="turtle" style="position:absolute;left:4px;top:2px;font-size:2rem;transition:left 0.3s ease;">🐢</span>
          <span id="finish-line" style="position:absolute;right:4px;top:2px;font-size:2rem;">🏁</span>
        </div>
        <div id="turtle-status" style="color:#059669;font-weight:600; margin: 8px 0;"></div>
        <button id="turtle-tap" style="margin-top:10px;padding:8px 20px;border-radius:8px;background:#10b981;color:#fff;font-weight:600;border:none;cursor:pointer;">Move Turtle</button>
        <div style="font-size:0.8rem;color:#a16207; margin-top: 8px;">Wait at least 1 second between moves</div>
      </div>
    `;
    
    const turtle = container.querySelector('#turtle');
    const tapBtn = container.querySelector('#turtle-tap');
    const status = container.querySelector('#turtle-status');
    let pos = 4, lastTap = 0, moves = 0;
    const finishPos = 200;
    const minInterval = 1000; // 1 second minimum

    function updateTurtle() {
      turtle.style.left = `${pos}px`;
      const progress = (pos - 4) / (finishPos - 4);
      
      if (pos >= finishPos) {
        status.textContent = '🎉 Perfect! Slow and steady wins!';
        tapBtn.disabled = true;
        tapBtn.style.background = '#d1d5db';
        setTimeout(() => {
          modal.querySelector('.dd-reflection').style.display = 'block';
          if (typeof onComplete === 'function') onComplete();
        }, 1000);
      }
    }

    tapBtn.onclick = () => {
      const now = Date.now();
      const timeSinceLastTap = now - lastTap;
      
      if (timeSinceLastTap < minInterval && lastTap > 0) {
        status.textContent = '🐌 Too fast! Wait a moment...';
        tapBtn.style.background = '#ef4444';
        setTimeout(() => {
          tapBtn.style.background = '#10b981';
          status.textContent = '';
        }, 1000);
        return;
      }
      
      lastTap = now;
      moves++;
      pos += 20;
      
      if (pos < finishPos) {
        status.textContent = `Good pace! ${Math.ceil((finishPos - pos) / 20)} moves to go`;
      }
      
      updateTurtle();
    };
  }

  renderEggCatchTask(container, modal, onComplete) {
    // Use the enhanced egg catch task logic
    this.renderEnhancedEggCatchTask(container, modal, onComplete);
  }

  renderEnhancedEggCatchTask(container, modal, onComplete) {
    container.innerHTML = `
      <div style="text-align:center;">
        <strong style="color:#92400e;">🍳 Enhanced Focus Egg Catch</strong>
        <p style="color:#a16207; font-size: 0.9rem; margin: 8px 0;">Catch 8 eggs, avoid distractions! Use WASD or Arrow keys</p>
        <div id="enhanced-egg-game" style="position:relative;width:280px;height:180px;background:linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);border-radius:12px;margin:12px auto;overflow:hidden;border:2px solid #fbbf24;">
          <div id="enhanced-egg-pan" style="position:absolute;bottom:8px;left:120px;width:40px;height:16px;background:linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>
          <div id="enhanced-score-display" style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.7);color:white;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;">Score: 0</div>
          <div id="enhanced-lives-display" style="position:absolute;top:8px;right:8px;background:rgba(220,38,38,0.8);color:white;padding:4px 8px;border-radius:6px;font-size:12px;font-weight:600;">Lives: 3</div>
        </div>
        <div id="enhanced-egg-status" style="color:#059669;font-weight:600; margin: 8px 0;">Eggs caught: 0/8</div>
        <div style="font-size:0.8rem;color:#a16207;">WASD or Arrow keys to move pan</div>
        <div class="dd-egg-progress" style="width: 100%; height: 6px; background: #fed7aa; border-radius: 3px; margin: 8px 0;">
          <div class="dd-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #10b981, #fbbf24); border-radius: 3px; transition: width 0.3s;"></div>
        </div>
        <div id="enhanced-power-ups" style="margin-top:8px;font-size:0.8rem;color:#7c3aed;">
          🌟 Golden Egg: +3 points | 💎 Diamond Egg: +5 points | ⚡ Speed Boost
        </div>
      </div>
    `;
    
    const pan = container.querySelector("#enhanced-egg-pan");
    const game = container.querySelector("#enhanced-egg-game");
    const status = container.querySelector("#enhanced-egg-status");
    const progressBar = container.querySelector(".dd-progress-bar");
    const scoreDisplay = container.querySelector("#enhanced-score-display");
    const livesDisplay = container.querySelector("#enhanced-lives-display");

    let panPos = 120;
    let score = 0;
    let lives = 3;
    let running = true;
    let gameSpeed = 1;
    let powerUpActive = false;
    const target = 8;

    function updateProgress() {
      progressBar.style.width = `${Math.min(100, (score / target) * 100)}%`;
      status.textContent = `Score: ${score} (Need ${Math.max(0, target - score)} more points)`;
    }

    function updateDisplays() {
      scoreDisplay.textContent = `Score: ${score}`;
      livesDisplay.textContent = `Lives: ${lives}`;
      updateProgress();
    }

    function movePan(dir) {
      if (!running) return;
      const speed = powerUpActive ? 25 : 20;
      if (dir === "ArrowLeft" || dir === "KeyA") panPos = Math.max(8, panPos - speed);
      if (dir === "ArrowRight" || dir === "KeyD") panPos = Math.min(232, panPos + speed);
      if (dir === "ArrowUp" || dir === "KeyW") panPos = Math.max(8, panPos - speed);
      if (dir === "ArrowDown" || dir === "KeyS") panPos = Math.min(232, panPos + speed);
      pan.style.left = panPos + "px";
    }

    function dropItem() {
      if (!running) return;

      // Enhanced item types with different probabilities
      const rand = Math.random();
      let itemType, emoji, points, isGood;

      if (rand < 0.05) {
        itemType = "diamond";
        emoji = "💎";
        points = 5;
        isGood = true;
      } else if (rand < 0.15) {
        itemType = "golden";
        emoji = "🌟";
        points = 3;
        isGood = true;
      } else if (rand < 0.2) {
        itemType = "speed";
        emoji = "⚡";
        points = 1;
        isGood = true;
      } else if (rand < 0.65) {
        itemType = "regular";
        emoji = "🥚";
        points = 1;
        isGood = true;
      } else {
        itemType = "distraction";
        emoji = ["📱", "💻", "📺", "🎮"][Math.floor(Math.random() * 4)];
        points = 0;
        isGood = false;
      }

      const item = document.createElement("div");
      item.textContent = emoji;
      item.dataset.type = itemType;
      item.dataset.points = points;
      item.style.cssText = `
        position: absolute; 
        left: ${Math.floor(Math.random() * 240)}px; 
        top: 0px;
        font-size: ${itemType === "diamond" ? "1.8rem" : itemType === "golden" ? "1.6rem" : "1.4rem"}; 
        color: #92400e; 
        transition: top 0.1s linear;
        filter: ${
          itemType === "diamond"
            ? "drop-shadow(0 0 8px #7c3aed)"
            : itemType === "golden"
              ? "drop-shadow(0 0 6px #fbbf24)"
              : itemType === "speed"
                ? "drop-shadow(0 0 4px #10b981)"
                : "none"
        };
        z-index: 10;
      `;
      game.appendChild(item);

      let top = 0;
      const fallSpeed = 3 * gameSpeed;
      const fall = setInterval(() => {
        if (!running) {
          clearInterval(fall);
          if (item.parentNode) item.remove();
          return;
        }

        top += fallSpeed;
        item.style.top = top + "px";

        if (top >= 156) {
          // Hit bottom area
          const itemLeft = Number.parseInt(item.style.left);
          if (itemLeft >= panPos - 12 && itemLeft <= panPos + 52) {
            // Caught!
            if (isGood) {
              score += points;

              // Special effects for special items
              if (itemType === "speed") {
                powerUpActive = true;
                pan.style.boxShadow = "0 0 12px #10b981";
                setTimeout(() => {
                  powerUpActive = false;
                  pan.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
                }, 5000);
                status.textContent = "⚡ Speed Boost Active!";
              } else if (itemType === "diamond") {
                status.textContent = "💎 Diamond Egg! +5 points!";
              } else if (itemType === "golden") {
                status.textContent = "🌟 Golden Egg! +3 points!";
              } else {
                status.textContent = `🥚 Good catch! +${points} point`;
              }

              updateDisplays();

              if (score >= target) {
                running = false;
                status.textContent = "🎉 Perfect focus! Mission accomplished!";
                setTimeout(() => {
                  modal.querySelector(".dd-reflection").style.display = "block";
                  if (typeof onComplete === "function") onComplete();
                }, 1000);
              }
            } else {
              // Caught distraction - lose life
              lives--;
              updateDisplays();
              status.textContent = `${emoji} Distraction caught! Stay focused on eggs`;

              if (lives <= 0) {
                running = false;
                status.textContent = "💔 Game Over! Try to stay focused next time.";
                setTimeout(() => {
                  modal.querySelector(".dd-reflection").style.display = "block";
                  if (typeof onComplete === "function") onComplete();
                }, 2000);
              } else {
                setTimeout(() => {
                  if (running) updateDisplays();
                }, 1500);
              }
            }
          } else if (!isGood) {
            // Missed distraction - good!
            status.textContent = "✅ Good! You avoided the distraction";
            setTimeout(() => {
              if (running) updateDisplays();
            }, 1000);
          }
          clearInterval(fall);
          if (item.parentNode) item.remove();
        }
      }, 50);
    }

    function handler(e) {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyS", "KeyW", "KeyD"].includes(e.code)) {
        e.preventDefault();
        movePan(e.code);
      }
    }

    document.addEventListener("keydown", handler);
    modal.addEventListener("remove", () => {
      document.removeEventListener("keydown", handler);
      running = false;
    });

    // Start dropping items with increasing difficulty
    function dropLoop() {
      if (running) {
        dropItem();
        // Increase game speed slightly over time
        gameSpeed = Math.min(2, 1 + score * 0.05);
        const dropInterval = Math.max(800, 1500 - score * 50);
        setTimeout(dropLoop, dropInterval);
      }
    }

    updateDisplays();
    dropLoop();
  }

  handleContinue(modal) {
    const reflection = modal.querySelector('#dd-reflection-input')?.value || '';
    chrome.runtime.sendMessage({
      type: 'COMPLETE_MINDFUL_TASK',
      taskType: 'breathing_reflection',
      reflection: reflection
    });
    // Store reflection in chrome.storage.local
    if (reflection && reflection.length > 2) {
      chrome.storage.local.get(['reflections'], (result) => {
        const today = new Date().toISOString().slice(0, 10);
        const reflections = result.reflections || [];
        reflections.push({ date: today, text: reflection });
        chrome.storage.local.set({ reflections });
      });
    }
    this.dismissBurnAlert(modal);
  }

  handleTakeBreak(modal) {
    chrome.runtime.sendMessage({
      type: 'COMPLETE_MINDFUL_TASK',
      taskType: 'take_break'
    });
    
    // Dismiss current modal first
    this.dismissBurnAlert(modal);
    
    // Show innovative break activity
    this.showInnovativeBreakActivity();
  }

  showInnovativeBreakActivity() {
    const activities = [
      'flower_breath',
      'nature_sounds',
      'gratitude_garden',
      'mindful_movement',
      'digital_sunset'
    ];
    
    const activity = activities[Math.floor(Math.random() * activities.length)];
    
    switch (activity) {
      case 'flower_breath':
        this.showFlowerBreathBreakModal();
        break;
      case 'nature_sounds':
        this.showNatureSoundsBreak();
        break;
      case 'gratitude_garden':
        this.showGratitudeGardenBreak();
        break;
      case 'mindful_movement':
        this.showMindfulMovementBreak();
        break;
      case 'digital_sunset':
        this.showDigitalSunsetBreak();
        break;
      default:
        this.showFlowerBreathBreakModal();
    }
  }

  showFlowerBreathBreakModal() {
    const modal = document.createElement('div');
    modal.id = 'dd-fullscreen-break-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
      <div style="background:rgba(0,0,0,0.3);color:#fff;padding:24px 32px;border-radius:18px;font-size:1.5rem;font-weight:600;margin-bottom:24px;text-align:center;">
        🌸 Breathing Flower Garden<br>
        <span style="font-size:1.1rem;font-weight:400;">Watch flowers bloom with your breath — 5 mindful rounds</span>
      </div>
      <div id="flower-garden" style="margin-bottom:24px; position: relative;">
        <svg id="flower-breath-svg" viewBox="0 0 200 200" width="160" height="160">
          <defs>
            <radialGradient id="petalGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:0.8" />
              <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:0.6" />
            </radialGradient>
          </defs>
          <g id="petals" transform="translate(100,100)">
            <ellipse cx="0" cy="-40" rx="15" ry="35" fill="url(#petalGrad)" transform="rotate(0)"/>
            <ellipse cx="0" cy="-40" rx="15" ry="35" fill="url(#petalGrad)" transform="rotate(45)"/>
            <ellipse cx="0" cy="-40" rx="15" ry="35" fill="url(#petalGrad)" transform="rotate(90)"/>
            <ellipse cx="0" cy="-40" rx="15" ry="35" fill="url(#petalGrad)" transform="rotate(135)"/>
            <ellipse cx="0" cy="-40" rx="15" ry="35" fill="url(#petalGrad)" transform="rotate(180)"/>
            <ellipse cx="0" cy="-40" rx="15" ry="35" fill="url(#petalGrad)" transform="rotate(225)"/>
            <ellipse cx="0" cy="-40" rx="15" ry="35" fill="url(#petalGrad)" transform="rotate(270)"/>
            <ellipse cx="0" cy="-40" rx="15" ry="35" fill="url(#petalGrad)" transform="rotate(315)"/>
          </g>
          <circle cx="100" cy="100" r="20" fill="#f59e42"/>
        </svg>
      </div>
      <div id="flower-breath-instruction" style="font-size:1.2rem;font-weight:600;margin-bottom:8px;color:#fbbf24;">Breathe in...</div>
      <div id="flower-breath-counter" style="font-size:1rem;color:#10b981;margin-bottom:12px;font-weight:600;">Round 1 of 5</div>
      <button id="dd-break-close-btn" style="display:none;margin-top:24px;padding:12px 32px;font-size:1.2rem;border-radius:12px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.3);">Return to Cooking</button>
    `;
    document.body.appendChild(modal);

    this.setupBreakModalControls(modal);

    const svg = modal.querySelector('#flower-breath-svg');
    const instruction = modal.querySelector('#flower-breath-instruction');
    const counter = modal.querySelector('#flower-breath-counter');
    const closeBtn = modal.querySelector('#dd-break-close-btn');
    let round = 0;

    function animateFlowerBreath() {
      instruction.textContent = 'Breathe in...';
      svg.style.transition = 'transform 3s cubic-bezier(.4,0,.2,1)';
      svg.style.transform = 'scale(1.2)';
      
      setTimeout(() => {
        instruction.textContent = 'Hold...';
        setTimeout(() => {
          instruction.textContent = 'Breathe out...';
          svg.style.transition = 'transform 3s cubic-bezier(.4,0,.2,1)';
          svg.style.transform = 'scale(0.9)';
          
          setTimeout(() => {
            round++;
            counter.textContent = `Round ${Math.min(round + 1, 5)} of 5`;
            
            if (round < 5) {
              setTimeout(() => {
                instruction.textContent = 'Breathe in...';
                svg.style.transition = 'transform 3s cubic-bezier(.4,0,.2,1)';
                svg.style.transform = 'scale(1)';
                setTimeout(animateFlowerBreath, 1000);
              }, 1000);
            } else {
              instruction.textContent = 'Beautiful breathing! 🌸';
              svg.style.transform = 'scale(1)';
              closeBtn.style.display = 'block';
            }
          }, 3000);
        }, 2000);
      }, 3000);
    }
    
    animateFlowerBreath();
    this.setupBreakModalClose(modal, closeBtn);
  }

  showNatureSoundsBreak() {
    const modal = document.createElement('div');
    modal.id = 'dd-fullscreen-break-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
      <div style="background:rgba(0,0,0,0.3);color:#fff;padding:24px 32px;border-radius:18px;font-size:1.5rem;font-weight:600;margin-bottom:32px;text-align:center;">
        🌊 Nature Sounds Meditation<br>
        <span style="font-size:1.1rem;font-weight:400;">Listen to calming nature sounds for 2 minutes</span>
      </div>
      <div id="sound-visualizer" style="margin-bottom:24px;">
        <div class="sound-wave" style="display:flex;gap:4px;align-items:end;height:60px;">
          ${Array.from({length: 12}).map((_, i) => `
            <div class="wave-bar" style="width:8px;background:#10b981;border-radius:4px;height:${20 + Math.random() * 40}px;animation:wave 2s ease-in-out infinite;animation-delay:${i * 0.1}s;"></div>
          `).join('')}
        </div>
      </div>
      <div id="nature-timer" style="font-size:1.2rem;font-weight:600;margin-bottom:16px;color:#fbbf24;">2:00</div>
      <div style="color:#d1fae5;text-align:center;max-width:300px;line-height:1.6;">
        Close your eyes and imagine yourself by a peaceful stream in a forest. Feel the gentle breeze and hear the water flowing over smooth stones.
      </div>
      <button id="dd-break-close-btn" style="display:none;margin-top:24px;padding:12px 32px;font-size:1.2rem;border-radius:12px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;">Return to Cooking</button>
    `;
    document.body.appendChild(modal);

    // Add wave animation CSS
    const style = document.createElement('style');
    style.textContent = `
      @keyframes wave {
        0%, 100% { transform: scaleY(1); }
        50% { transform: scaleY(1.5); }
      }
    `;
    document.head.appendChild(style);

    this.setupBreakModalControls(modal);

    const timerEl = modal.querySelector('#nature-timer');
    const closeBtn = modal.querySelector('#dd-break-close-btn');
    let seconds = 120;

    const timer = setInterval(() => {
      seconds--;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      
      if (seconds === 0) {
        clearInterval(timer);
        timerEl.textContent = 'Meditation complete! 🧘‍♀️';
        closeBtn.style.display = 'block';
        style.remove();
      }
    }, 1000);

    this.setupBreakModalClose(modal, closeBtn, () => {
      clearInterval(timer);
      style.remove();
    });
  }

  showGratitudeGardenBreak() {
    const modal = document.createElement('div');
    modal.id = 'dd-fullscreen-break-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: linear-gradient(135deg, #7c2d12 0%, #a16207 50%, #ca8a04 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
      <div style="background:rgba(0,0,0,0.3);color:#fff;padding:24px 32px;border-radius:18px;font-size:1.5rem;font-weight:600;margin-bottom:24px;text-align:center;">
        🌻 Gratitude Garden<br>
        <span style="font-size:1.1rem;font-weight:400;">Plant flowers of gratitude — name 5 things you're thankful for</span>
      </div>
      <div id="gratitude-garden" style="margin-bottom:24px;min-height:100px;display:flex;gap:12px;align-items:end;">
        <!-- Flowers will be planted here -->
      </div>
      <div style="background:rgba(255,255,255,0.1);padding:16px;border-radius:12px;margin-bottom:16px;">
        <input type="text" id="gratitude-input" placeholder="I'm grateful for..." style="width:300px;padding:12px;border:none;border-radius:8px;font-size:1rem;background:rgba(255,255,255,0.9);" maxlength="50">
        <button id="plant-flower" style="margin-left:8px;padding:12px 16px;border:none;border-radius:8px;background:#10b981;color:white;font-weight:600;cursor:pointer;">Plant 🌸</button>
      </div>
      <div id="gratitude-counter" style="color:#fbbf24;font-weight:600;">0/5 flowers planted</div>
      <button id="dd-break-close-btn" style="display:none;margin-top:24px;padding:12px 32px;font-size:1.2rem;border-radius:12px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;">Return to Cooking</button>
    `;
    document.body.appendChild(modal);

    this.setupBreakModalControls(modal);

    const garden = modal.querySelector('#gratitude-garden');
    const input = modal.querySelector('#gratitude-input');
    const plantBtn = modal.querySelector('#plant-flower');
    const counter = modal.querySelector('#gratitude-counter');
    const closeBtn = modal.querySelector('#dd-break-close-btn');
    let planted = 0;

    const flowers = ['🌸', '🌺', '🌻', '🌷', '🌹'];

    function plantFlower() {
      const gratitude = input.value.trim();
      if (!gratitude || planted >= 5) return;

      const flower = document.createElement('div');
      flower.style.cssText = `
        font-size: 2.5rem; animation: grow 0.5s ease-out;
        position: relative; cursor: pointer;
      `;
      flower.textContent = flowers[planted];
      flower.title = gratitude;

      // Add grow animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes grow {
          from { transform: scale(0) rotate(180deg); opacity: 0; }
          to { transform: scale(1) rotate(0deg); opacity: 1; }
        }
      `;
      document.head.appendChild(style);

      garden.appendChild(flower);
      planted++;
      counter.textContent = `${planted}/5 flowers planted`;
      input.value = '';

      if (planted >= 5) {
        counter.textContent = '🎉 Beautiful garden of gratitude!';
        input.disabled = true;
        plantBtn.disabled = true;
        plantBtn.style.background = '#d1d5db';
        closeBtn.style.display = 'block';
        
        setTimeout(() => style.remove(), 1000);
      }
    }

    plantBtn.addEventListener('click', plantFlower);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') plantFlower();
    });

    this.setupBreakModalClose(modal, closeBtn);
  }

  showMindfulMovementBreak() {
    const modal = document.createElement('div');
    modal.id = 'dd-fullscreen-break-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a855f7 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
      <div style="background:rgba(0,0,0,0.3);color:#fff;padding:24px 32px;border-radius:18px;font-size:1.5rem;font-weight:600;margin-bottom:24px;text-align:center;">
        🧘‍♀️ Mindful Movement<br>
        <span style="font-size:1.1rem;font-weight:400;">Follow the gentle movements — 6 exercises</span>
      </div>
      <div id="movement-display" style="margin-bottom:24px;text-align:center;">
        <div id="movement-icon" style="font-size:4rem;margin-bottom:16px;">🙆‍♀️</div>
        <div id="movement-name" style="font-size:1.3rem;font-weight:600;color:#fbbf24;margin-bottom:8px;">Arm Circles</div>
        <div id="movement-instruction" style="color:#e9d5ff;max-width:300px;line-height:1.5;">Slowly raise your arms and make gentle circles. Feel the stretch in your shoulders.</div>
      </div>
      <div id="movement-timer" style="font-size:1.2rem;font-weight:600;margin-bottom:16px;color:#10b981;">30s</div>
      <div id="movement-progress" style="width:200px;height:6px;background:rgba(255,255,255,0.2);border-radius:3px;margin-bottom:16px;">
        <div id="progress-bar" style="width:0%;height:100%;background:#10b981;border-radius:3px;transition:width 1s linear;"></div>
      </div>
      <button id="dd-break-close-btn" style="display:none;margin-top:24px;padding:12px 32px;font-size:1.2rem;border-radius:12px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;">Return to Cooking</button>
    `;
    document.body.appendChild(modal);

    this.setupBreakModalControls(modal);

    const movements = [
      { icon: '🙆‍♀️', name: 'Arm Circles', instruction: 'Slowly raise your arms and make gentle circles. Feel the stretch in your shoulders.' },
      { icon: '🤸‍♀️', name: 'Neck Rolls', instruction: 'Gently roll your neck in slow circles. Release tension from your neck and shoulders.' },
      { icon: '🧘‍♀️', name: 'Shoulder Shrugs', instruction: 'Lift your shoulders up to your ears, hold, then release. Feel the tension melt away.' },
      { icon: '🤲', name: 'Wrist Circles', instruction: 'Make gentle circles with your wrists. Perfect for releasing typing tension.' },
      { icon: '🙋‍♀️', name: 'Side Stretch', instruction: 'Reach one arm over your head and lean gently to the side. Feel the stretch along your ribs.' },
      { icon: '🧘', name: 'Deep Breathing', instruction: 'Take slow, deep breaths. Feel your body relaxing with each exhale.' }
    ];

    const icon = modal.querySelector('#movement-icon');
    const name = modal.querySelector('#movement-name');
    const instruction = modal.querySelector('#movement-instruction');
    const timer = modal.querySelector('#movement-timer');
    const progressBar = modal.querySelector('#progress-bar');
    const closeBtn = modal.querySelector('#dd-break-close-btn');

    let currentMovement = 0;
    let seconds = 30;

    function startMovement() {
      if (currentMovement >= movements.length) {
        timer.textContent = 'Movement complete! 🌟';
        name.textContent = 'Well done!';
        instruction.textContent = 'You\'ve completed all mindful movements. Feel the difference in your body.';
        closeBtn.style.display = 'block';
        return;
      }

      const movement = movements[currentMovement];
      icon.textContent = movement.icon;
      name.textContent = movement.name;
      instruction.textContent = movement.instruction;
      seconds = 30;

      const interval = setInterval(() => {
        seconds--;
        timer.textContent = `${seconds}s`;
        progressBar.style.width = `${((30 - seconds) / 30) * 100}%`;

        if (seconds === 0) {
          clearInterval(interval);
          currentMovement++;
          progressBar.style.width = '0%';
          setTimeout(startMovement, 1000);
        }
      }, 1000);
    }

    startMovement();
    this.setupBreakModalClose(modal, closeBtn);
  }

  showDigitalSunsetBreak() {
    const modal = document.createElement('div');
    modal.id = 'dd-fullscreen-break-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: linear-gradient(135deg, #1e40af 0%, #7c3aed 30%, #f59e0b 70%, #f97316 100%);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      transition: background 0.5s ease;
    `;
    modal.innerHTML = `
      <div style="background:rgba(0,0,0,0.3);color:#fff;padding:24px 32px;border-radius:18px;font-size:1.5rem;font-weight:600;margin-bottom:24px;text-align:center;">
        🌅 Digital Sunset<br>
        <span style="font-size:1.1rem;font-weight:400;">Watch the sunset and reflect on your day — 90 seconds</span>
      </div>
      <div id="sunset-scene" style="margin-bottom:24px;position:relative;">
        <svg viewBox="0 0 300 200" width="300" height="200">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
              <stop offset="50%" style="stop-color:#f97316;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="300" height="200" fill="url(#skyGrad)"/>
          <circle id="sun" cx="150" cy="60" r="30" fill="#fbbf24" opacity="0.9"/>
          <path d="M0,150 Q150,120 300,150 L300,200 L0,200 Z" fill="#065f46"/>
          <ellipse cx="150" cy="180" rx="40" ry="8" fill="#047857" opacity="0.6"/>
        </svg>
      </div>
      <div id="sunset-reflection" style="color:#fef3c7;text-align:center;max-width:350px;line-height:1.6;margin-bottom:16px;">
        As the day ends, take a moment to appreciate what you've accomplished. What brought you joy today?
      </div>
      <div id="sunset-timer" style="font-size:1.1rem;font-weight:600;color:#fbbf24;">1:30</div>
      <button id="dd-break-close-btn" style="display:none;margin-top:24px;padding:12px 32px;font-size:1.2rem;border-radius:12px;border:none;background:#10b981;color:#fff;font-weight:700;cursor:pointer;">Return to Cooking</button>
    `;
    document.body.appendChild(modal);

    this.setupBreakModalControls(modal);

    const sun = modal.querySelector('#sun');
    const reflection = modal.querySelector('#sunset-reflection');
    const timer = modal.querySelector('#sunset-timer');
    const closeBtn = modal.querySelector('#dd-break-close-btn');
    let seconds = 90;

    const reflections = [
      "As the day ends, take a moment to appreciate what you've accomplished. What brought you joy today?",
      "Notice how the colors change gradually, just like our moods throughout the day. What emotions did you experience?",
      "The sun sets to rise again tomorrow. What would you like to do differently tomorrow?",
      "Feel grateful for this moment of peace. What are you most thankful for right now?"
    ];

    let reflectionIndex = 0;

    const interval = setInterval(() => {
      seconds--;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      timer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;

      // Animate sun setting
      const progress = (90 - seconds) / 90;
      const sunY = 60 + (progress * 80);
      sun.setAttribute('cy', sunY);
      sun.setAttribute('opacity', Math.max(0.3, 1 - progress * 0.7));

      // Change reflection text
      if (seconds % 22 === 0 && reflectionIndex < reflections.length - 1) {
        reflectionIndex++;
        reflection.textContent = reflections[reflectionIndex];
      }

      if (seconds === 0) {
        clearInterval(interval);
        timer.textContent = 'Sunset complete 🌙';
        reflection.textContent = 'The day has ended peacefully. Carry this calm with you.';
        closeBtn.style.display = 'block';
      }
    }, 1000);

    this.setupBreakModalClose(modal, closeBtn, () => clearInterval(interval));
  }

  setupBreakModalControls(modal) {
    // Block navigation and reloads during break
    function blockReload(e) {
      if (
        e.key === 'F5' ||
        (e.ctrlKey && e.key.toLowerCase() === 'r') ||
        (e.metaKey && e.key.toLowerCase() === 'r')
      ) {
        e.preventDefault();
        e.stopPropagation();
        this.showBreakWarning();
      }
    }

    function blockContextMenu(e) {
      e.preventDefault();
      this.showBreakWarning();
    }

    function beforeUnloadHandler(e) {
      e.preventDefault();
      e.returnValue = 'Complete your mindful break first!';
      this.showBreakWarning();
      return e.returnValue;
    }

    modal.blockReload = blockReload.bind(this);
    modal.blockContextMenu = blockContextMenu.bind(this);
    modal.beforeUnloadHandler = beforeUnloadHandler.bind(this);

    window.addEventListener('keydown', modal.blockReload, true);
    window.addEventListener('beforeunload', modal.beforeUnloadHandler, true);
    window.addEventListener('contextmenu', modal.blockContextMenu, true);

    // Try to enter fullscreen for immersion
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen failed, continue anyway
      });
    }
  }

  setupBreakModalClose(modal, closeBtn, cleanup) {
    closeBtn.onclick = () => {
      // Remove event listeners
      window.removeEventListener('keydown', modal.blockReload, true);
      window.removeEventListener('beforeunload', modal.beforeUnloadHandler, true);
      window.removeEventListener('contextmenu', modal.blockContextMenu, true);
      
      // Exit fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      
      // Run any additional cleanup
      if (cleanup) cleanup();
      
      modal.remove();
    };
  }

  showBreakWarning() {
    if (!document.getElementById('dd-break-warning')) {
      const warning = document.createElement('div');
      warning.id = 'dd-break-warning';
      warning.style.cssText = `
        position:fixed;top:20px;left:50%;transform:translateX(-50%);
        background:#fbbf24;color:#222;padding:12px 28px;border-radius:12px;
        font-size:1.1rem;font-weight:700;z-index:2147483648;
        box-shadow:0 4px 16px rgba(0,0,0,0.2);
      `;
      warning.textContent = '⏳ Complete your mindful break first!';
      document.body.appendChild(warning);
      setTimeout(() => warning.remove(), 2000);
    }
  }

  dismissBurnAlert(modal) {
    modal.remove();
    document.body.style.overflow = '';
    this.burnAlertShown = false;
    this.isTracking = true;
  }

  updateDailyChallengeStatus() {
    // Enhanced daily challenge tracking
    chrome.storage.local.get(['todaysChallenge', 'todaysChallengeCompleted', 'todaysBehavior'], (result) => {
      const challenge = result.todaysChallenge;
      const completed = result.todaysChallengeCompleted;
      const behavior = result.todaysBehavior;
      if (!challenge || completed) return;

      const challenges = [
        {
          id: "no-reels",
          check: (behavior) => !(behavior.platforms && (behavior.platforms['tiktok.com'] || behavior.platforms['instagram.com'] || behavior.platforms['youtube.com']))
        },
        {
          id: "reading-session",
          check: (behavior) => (behavior.timeSpent || 0) >= 300
        },
        {
          id: "tab-limit",
          check: (behavior) => (behavior.tabSwitches || 0) < 10
        },
        {
          id: "take-break",
          check: (behavior, data) => (data.sessionsCompleted || 0) > 0
        },
        {
          id: "scroll-moderate",
          check: (behavior) => (behavior.scrollDistance || 0) < 3000
        }
      ];

      const challengeObj = challenges.find(c => c.id === challenge.id);
      if (!challengeObj) return;

      if (challengeObj.id === "take-break") {
        chrome.storage.local.get(['sessionsCompleted'], (data) => {
          if (challengeObj.check(behavior, data)) {
            chrome.storage.local.set({ todaysChallengeCompleted: true });
          }
        });
      } else {
        if (challengeObj.check(behavior)) {
          chrome.storage.local.set({ todaysChallengeCompleted: true });
        }
      }
    });
  }
}

// Initialize tracker when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DopamineDinerTracker();
  });
} else {
  new DopamineDinerTracker();
}