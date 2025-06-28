// Service worker for Dopamine Diner
let sessionData = {};
let burnAlertActive = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    totalScrollDistance: 0,
    sessionsCompleted: 0,
    burnAlertsTriggered: 0,
    kitchenLevel: 1,
    unlockedUpgrades: ['basic-kitchen'],
    dailyDishes: []
  });
});

// Handle tab switching detection
chrome.tabs.onActivated.addListener((activeInfo) => {
  const now = Date.now();
  if (sessionData.lastTabSwitch && now - sessionData.lastTabSwitch < 5000) {
    sessionData.tabSwitchCount = (sessionData.tabSwitchCount || 0) + 1;
  } else {
    sessionData.tabSwitchCount = 0;
  }
  sessionData.lastTabSwitch = now;
  
  // Check for seasoning overload (rapid tab switching)
  if (sessionData.tabSwitchCount > 5) {
    chrome.tabs.sendMessage(activeInfo.tabId, {
      type: 'TRIGGER_BURN_ALERT',
      reason: 'seasoning_overload',
      message: 'Too much seasoning! Your dish is getting overwhelming.'
    });
  }
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'UPDATE_BEHAVIOR_DATA':
      updateBehaviorData(request.data);
      break;
    case 'COMPLETE_MINDFUL_TASK':
      completeMindfulTask(request.taskType);
      break;
    case 'GET_SESSION_DATA':
      sendResponse(sessionData);
      break;
  }
});

function updateBehaviorData(data) {
  // Store behavior data and check thresholds
  chrome.storage.local.get([
    'totalScrollDistance',
    'burnAlertsTriggered',
    'dailyDishes',
    'dopamineIndexHistory',
    'customScrollCap',
    'customTimeCap'
  ], (result) => {
    const newScrollDistance = (result.totalScrollDistance || 0) + data.scrollDistance;
    chrome.storage.local.set({
      totalScrollDistance: newScrollDistance
    });

    // Optionally update dopamine index history for heatmap (if provided)
    if (typeof data.dopamineIndex === 'number') {
      let history = Array.isArray(result.dopamineIndexHistory) ? result.dopamineIndexHistory : [];
      const today = new Date().toISOString().slice(0, 10);
      if (!history.length || history[history.length - 1].date !== today) {
        history.push({ date: today, score: data.dopamineIndex });
        if (history.length > 30) history = history.slice(-30);
        chrome.storage.local.set({ dopamineIndexHistory: history });
      }
    }

    // Optionally update dailyDishes if provided
    if (data.dailyDish) {
      let dailyDishes = Array.isArray(result.dailyDishes) ? result.dailyDishes : [];
      if (!dailyDishes.length || dailyDishes[dailyDishes.length - 1].date !== data.dailyDish.date) {
        dailyDishes.push(data.dailyDish);
        if (dailyDishes.length > 7) dailyDishes = dailyDishes.slice(-7);
        chrome.storage.local.set({ dailyDishes });
      }
    }

    // Check for burn alert thresholds
    const scrollCap = typeof result.customScrollCap === 'number' ? result.customScrollCap : 10000;
    const timeCap = typeof result.customTimeCap === 'number' ? result.customTimeCap : 3600;
    if (
      (data.scrollSpeed > 2000 && data.timeSpent > 30) ||
      (data.scrollDistance >= scrollCap) ||
      (data.timeSpent >= timeCap)
    ) {
      // Only trigger burn alert if tabId is valid and the tab is active
      if (typeof data.tabId === 'number') {
        triggerBurnAlert(data.tabId, 'doomscrolling');
      } else if (typeof data.url === 'string') {
        chrome.tabs.query({url: data.url}, (tabs) => {
          if (tabs && tabs.length > 0) {
            triggerBurnAlert(tabs[0].id, 'doomscrolling');
          }
        });
      }
    }
  });
}

function triggerBurnAlert(tabId, type) {
  if (burnAlertActive) return;
  if (typeof tabId !== 'number') return; // Prevent invalid tabId errors

  burnAlertActive = true;
  chrome.tabs.sendMessage(tabId, {
    type: 'TRIGGER_BURN_ALERT',
    reason: type,
    message: getBurnAlertMessage(type)
  }, () => {
    // Ignore errors if tab is closed or not available
    burnAlertActive = false;
  });

  // Reset after 30 seconds
  setTimeout(() => {
    burnAlertActive = false;
  }, 30000);
}

function getBurnAlertMessage(type) {
  const messages = {
    doomscrolling: "Your dish is burning! Too much grease from endless scrolling.",
    seasoning_overload: "Whoa there, chef! You're over-seasoning with all that tab switching.",
    sugar_rush: "Sweet overload detected! Time to balance your digital diet."
  };
  return messages[type] || "Your dish needs attention!";
}

function completeMindfulTask(taskType) {
  chrome.storage.local.get(['sessionsCompleted', 'kitchenLevel'], (result) => {
    const newSessions = (result.sessionsCompleted || 0) + 1;
    const newLevel = Math.floor(newSessions / 5) + 1;
    
    chrome.storage.local.set({
      sessionsCompleted: newSessions,
      kitchenLevel: Math.max(result.kitchenLevel || 1, newLevel)
    });
  });
}

// No changes needed for daily challenge reset logic here.