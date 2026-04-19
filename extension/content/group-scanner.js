// Scan 10 bài mới nhất trong nhóm, match từ khóa

export async function startScan(keywords) {
  // Lấy tất cả bài post trong feed
  const posts = document.querySelectorAll('[data-pagelet="GroupFeed"] [role="article"]');
  const latestPosts = Array.from(posts).slice(0, 10);
  
  const matches = [];
  
  for (const post of latestPosts) {
    const postText = post.innerText.toLowerCase();
    const matchedKeywords = keywords.filter(kw => postText.includes(kw.toLowerCase()));
    
    if (matchedKeywords.length > 0) {
      // Lấy link bài post
      const postLink = post.querySelector('a[href*="/permalink/"], a[href*="?story_fbid"]');
      
      matches.push({
        url: postLink?.href || window.location.href,
        text: postText.slice(0, 200),
        keywords: matchedKeywords,
        groupName: document.title,
        foundAt: new Date().toISOString()
      });
    }
  }
  
  if (matches.length > 0) {
    // Báo cáo về backend
    try {
        await fetch('https://social-9cpy.onrender.com/api/v1/logs/keyword-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matches })
        });
    } catch(e) {
        console.error('Failed to report keyword match', e);
    }
  }
  
  return matches;
}

// Attach to window so event dispatcher can access it if not using direct ES module imports
window.GroupScanner = { startScan };
