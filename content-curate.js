// Dopamine Diner: Curate Feed After 20 Minutes

(function () {
  // --- CONFIG ---
  const FEED_SELECTORS = [
    // Instagram
    'main section > div > div', // IG feed container
    // YouTube
    '#contents', // YT home feed
    // Add more selectors as needed
  ];
  const POST_SELECTORS = [
    // Instagram
    'article',
    // YouTube
    'ytd-rich-item-renderer,ytd-video-renderer',
    // Add more as needed
  ];
  const SITES = [
    'instagram.com',
    'youtube.com'
  ];
  const TIME_LIMIT_MS = 1 * 60 * 1000; // 20 minutes

  // --- UTILS ---
  function isTargetSite() {
    return SITES.some(site => window.location.hostname.includes(site));
  }

  function getFeedContainer() {
    for (const sel of FEED_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getFeedPosts() {
    for (const sel of POST_SELECTORS) {
      const posts = Array.from(document.querySelectorAll(sel));
      if (posts.length > 5) return posts;
    }
    return [];
  }

  function extractPostHTML(posts, site) {
    // For IG: clone outerHTML of articles, for YT: clone video renderers
    return posts.slice(0, 5).map(post => {
      // Remove video autoplay for YT
      if (site.includes('youtube.com')) {
        post = post.cloneNode(true);
        post.querySelectorAll('video').forEach(v => v.remove());
        post.querySelectorAll('ytd-thumbnail-overlay-time-status-renderer').forEach(e => e.remove());
        return post.outerHTML;
      }
      // For IG, just clone
      return post.outerHTML;
    });
  }

  function styleBlock() {
    return `
      <style id="dd-curate-style">
        .dd-curate-block {
          background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
          border-radius: 18px;
          box-shadow: 0 8px 32px 0 rgba(0,0,0,0.12);
          padding: 32px 18px 24px 18px;
          margin: 32px auto;
          max-width: 600px;
          text-align: center;
          font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        }
        .dd-curate-title {
          font-size: 1.6rem;
          font-weight: 700;
          color: #92400e;
          margin-bottom: 18px;
        }
        .dd-curate-posts {
          display: flex;
          flex-direction: column;
          gap: 18px;
          margin-bottom: 24px;
        }
        .dd-curate-reflect {
          font-size: 1.1rem;
          color: #a16207;
          margin-bottom: 18px;
          font-weight: 600;
        }
        .dd-curate-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 12px 32px;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          margin-top: 8px;
          transition: background 0.2s;
        }
        .dd-curate-btn:hover {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        }
      </style>
    `;
  }

  // --- MAIN LOGIC ---
  if (!isTargetSite()) return;

  // Track time on site (per tab)
  let start = Date.now();
  if (sessionStorage.getItem('dd-curate-start')) {
    start = Number(sessionStorage.getItem('dd-curate-start'));
  } else {
    sessionStorage.setItem('dd-curate-start', start);
  }

  function curateFeedIfNeeded() {
    if (Date.now() - start < TIME_LIMIT_MS) return;
    if (document.getElementById('dd-curate-block')) return; // Already shown

    const feed = getFeedContainer();
    if (!feed) return;

    const posts = getFeedPosts();
    if (posts.length < 1) return;

    // Extract HTML for 5 posts
    const curatedPosts = extractPostHTML(posts, window.location.hostname);

    // Clear feed and inject our block
    feed.innerHTML = '';
    const block = document.createElement('div');
    block.className = 'dd-curate-block';
    block.id = 'dd-curate-block';
    block.innerHTML = `
      <div class="dd-curate-title">Your Curated Feed 🍽️</div>
      <div class="dd-curate-posts">${curatedPosts.join('')}</div>
      <div class="dd-curate-reflect">What were you hoping to find here today?</div>
      <textarea style="width:90%;min-height:60px;border-radius:8px;border:1.5px solid #fed7aa;padding:10px;font-size:1rem;margin-bottom:12px;"></textarea>
      <br>
      <button class="dd-curate-btn">Resume Browsing</button>
    `;
    document.head.insertAdjacentHTML('beforeend', styleBlock());
    feed.appendChild(block);

    // Resume button restores original feed (reloads page)
    block.querySelector('.dd-curate-btn').onclick = () => {
      sessionStorage.removeItem('dd-curate-start');
      location.reload();
    };
  }

  // Poll every 10s after 15min, else every 1min
  function scheduleCheck() {
    const elapsed = Date.now() - start;
    if (elapsed < TIME_LIMIT_MS - 5 * 60 * 1000) {
      setTimeout(scheduleCheck, 60000);
    } else {
      setTimeout(() => {
        curateFeedIfNeeded();
        scheduleCheck();
      }, 10000);
    }
  }
  scheduleCheck();
})();
