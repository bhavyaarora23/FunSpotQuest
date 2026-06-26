content = open('frontend/admin.html').read()

# Add IDs to story modal inputs
content = content.replace(
    '<div class="form-group"><label class="form-label">Title</label><input class="form-input" placeholder="Story title...">',
    '<div class="form-group"><label class="form-label">Title</label><input id="story-title" class="form-input" placeholder="Story title...">'
)
content = content.replace(
    '<select class="form-select"><option>Adventure</option><option>Space</option><option>Animals</option><option>Mystery</option><option>Science</option><option>Moral</option></select>',
    '<select id="story-category" class="form-select"><option>Adventure</option><option>Space</option><option>Animals</option><option>Mystery</option><option>Science</option><option>Moral</option></select>'
)
content = content.replace(
    '<div class="form-group"><label class="form-label">Cover Emoji</label><input class="form-input" placeholder="📖" value="📖">',
    '<div class="form-group"><label class="form-label">Cover Emoji</label><input id="story-emoji" class="form-input" placeholder="📖" value="📖">'
)
content = content.replace(
    '<div class="form-group"><label class="form-label">Content</label><textarea class="form-textarea" rows="5" placeholder="Write the story here..."></textarea>',
    '<div class="form-group"><label class="form-label">Excerpt</label><textarea id="story-excerpt" class="form-textarea" rows="5" placeholder="Write a short excerpt..."></textarea>'
)
content = content.replace(
    '<div class="toggle-wrap"><div class="toggle" onclick="this.classList.toggle(\'on\')"></div><span class="toggle-label">Premium only</span></div>',
    '<div class="toggle-wrap"><div id="story-premium-toggle" class="toggle" onclick="this.classList.toggle(\'on\')"></div><span class="toggle-label">Premium only</span></div>'
)
content = content.replace(
    "onclick=\"closeModal('story-modal');aToast('Story saved!','success')\"",
    'onclick="saveStory()"'
)

save_fn = """
async function saveStory(){
  var title = document.getElementById('story-title').value.trim();
  var category = document.getElementById('story-category').value;
  var emoji = document.getElementById('story-emoji').value.trim() || '📖';
  var excerpt = document.getElementById('story-excerpt').value.trim();
  var isPremium = document.getElementById('story-premium-toggle').classList.contains('on');

  if(!title){ aToast('Please enter a title','error'); return; }
  if(!excerpt){ aToast('Please enter an excerpt','error'); return; }

  var res = await adminApiCall('/admin/stories', {
    method: 'POST',
    body: JSON.stringify({
      title: title,
      category: category,
      emoji: emoji,
      excerpt: excerpt,
      type: isPremium ? 'premium' : 'free'
    })
  });

  if(res.ok){
    STORIES_DATA.push(res.story);
    renderStories();
    closeModal('story-modal');
    aToast('Story added successfully!', 'success');
    document.getElementById('story-title').value = '';
    document.getElementById('story-excerpt').value = '';
    document.getElementById('story-premium-toggle').classList.remove('on');
  } else {
    aToast(res.error || 'Failed to save story', 'error');
  }
}
"""

content = content.replace('async function setTodayStory', save_fn + '\nasync function setTodayStory')
open('frontend/admin.html', 'w').write(content)
print('Done! Changes applied successfully.')
