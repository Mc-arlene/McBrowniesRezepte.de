let cameraStream = null;
window.capturedCameraPhoto = null;

function startCamera() {
    window.capturedCameraPhoto = null;
    const video  = document.getElementById('cameraPreview');
    const canvas = document.getElementById('cameraCanvas');
    document.getElementById('openCameraBtn').style.display         = 'none';
    video.style.display  = 'block';
    canvas.style.display = 'none';
    document.getElementById('cameraControls').style.display        = 'flex';
    document.getElementById('cameraConfirmControls').style.display = 'none';
    document.getElementById('cameraPhotoConfirmed').style.display  = 'none';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('cameraControls').innerHTML = '<p style="color:#c00;font-family:sans-serif;font-size:0.85em;">Kamera wird von diesem Browser nicht unterstützt.</p>';
        return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function(stream) {
            cameraStream = stream;
            video.srcObject = stream;
        })
        .catch(function() {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(function(stream) { cameraStream = stream; video.srcObject = stream; })
                .catch(function(err) {
                    document.getElementById('cameraControls').innerHTML =
                        '<p style="color:#c00;font-family:sans-serif;font-size:0.85em;">Kamera konnte nicht geöffnet werden: ' + err.message + '</p>';
                });
        });
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(function(t) { t.stop(); });
        cameraStream = null;
    }
}

function updatePhotoSections(type) {
    document.getElementById('kameraSection').style.display       = type === 'kamera' ? 'block' : 'none';
    document.getElementById('photoUploadSection').style.display  = type === 'photo'  ? 'block' : 'none';
    document.getElementById('emojiPickerSection').style.display  = type === 'emoji'  ? 'block' : 'none';
    document.getElementById('aiSuggestionSection').style.display = type === 'ai'     ? 'block' : 'none';
    document.getElementById('noImageSection').style.display      = type === 'none'   ? 'block' : 'none';
    if (type !== 'kamera') {
        stopCamera();
    }
    if (type === 'kamera') {
        document.getElementById('openCameraBtn').style.display         = 'inline-block';
        document.getElementById('cameraPreview').style.display         = 'none';
        document.getElementById('cameraCanvas').style.display          = 'none';
        document.getElementById('cameraControls').style.display        = 'none';
        document.getElementById('cameraConfirmControls').style.display = 'none';
        document.getElementById('cameraPhotoConfirmed').style.display  = 'none';
    }
}

function setupPhotoTypeSelection() {
    stopCamera();
    updatePhotoSections('kamera');
    document.querySelector('input[name="photoType"][value="kamera"]').checked = true;
    document.getElementById('aiImagePreview').innerHTML = '';
    window.aiSuggestedImageUrl = null;
}

function initializeEmojiSelection() {
    window.selectedRecipeEmoji = null;
    document.getElementById('selectedEmojiPreview').textContent = '';
    document.querySelectorAll('.emoji-option').forEach(function(e) { e.classList.remove('selected'); });
}

// Open Add Recipe Modal
function openAddRecipeModal(category) {
    const modal = document.getElementById('recipeModal');
    const modalTitle = document.getElementById('modalRecipeName');
    
    // Set category-specific title
    const categoryNames = {
        'fruehstueck': 'Neues Frühstücksrezept',
        'mittag': 'Neues Mittagsrezept',
        'abend': 'Neues Abendessensrezept',
        'snacks': 'Neues Snack- oder Süßrezept'
    };
    
    modalTitle.textContent = categoryNames[category] || 'Neues Rezept';
    
    // Store category for later use
    modal.dataset.category = category;
    
    modal.style.display = 'block';
    document.getElementById('recipeForm').reset();
    
    // Reset photo type to default (photo)
    document.querySelector('input[name="photoType"][value="photo"]').checked = true;
    
    // Initialize emoji selection
    initializeEmojiSelection();
    
    // Set up photo type radio buttons
    setupPhotoTypeSelection();
}

// Close Recipe Modal
function closeRecipeModal() {
    stopCamera();
    const modal = document.getElementById('recipeModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('recipeModal');
    const viewModal = document.getElementById('recipeViewModal');
    if (event.target == modal) modal.style.display = 'none';
    if (event.target == viewModal) viewModal.style.display = 'none';
}

function openRecipeModal(recipeName) {
    const saved = JSON.parse(localStorage.getItem('recipes')) || {};
    const recipe = saved[recipeName];

    document.getElementById('recipeViewTitle').textContent = recipeName;

    const imageEl = document.getElementById('recipeViewImage');
    if (recipe && recipe.imageData) {
        if (recipe.imageType === 'photo' || recipe.imageType === 'kamera') {
            imageEl.innerHTML = '<img src="' + recipe.imageData + '" alt="' + recipeName + '">';
        } else {
            imageEl.textContent = recipe.imageData;
        }
    } else {
        const cardImage = Array.from(document.querySelectorAll('.recipe-card'))
            .find(function(c) { return (c.querySelector('h3') || {}).textContent === recipeName; });
        const emoji = cardImage ? (cardImage.querySelector('.recipe-card-image') || {}).textContent : '🍽️';
        imageEl.textContent = (emoji || '🍽️').trim();
    }

    const body = document.getElementById('recipeViewBody');
    if (!recipe) {
        body.innerHTML = '<p class="no-recipe-info">Noch keine Details für dieses Rezept hinterlegt.</p>';
    } else {
        let html = '';

        if (recipe.preparationTime) {
            html += '<div class="recipe-view-meta">⏱ ' + recipe.preparationTime + '</div>';
        }

        if (recipe.ingredients) {
            html += '<div class="recipe-view-section"><h3>Zutaten</h3><ul class="ingredients-list">';
            recipe.ingredients.split('\n').filter(Boolean).forEach(function(line) {
                html += '<li>' + line + '</li>';
            });
            html += '</ul></div>';
        }

        if (recipe.zubereitung) {
            html += '<div class="recipe-view-section"><h3>Zubereitung</h3><ol class="prep-steps">';
            recipe.zubereitung.split('\n').filter(Boolean).forEach(function(step) {
                html += '<li>' + step.replace(/^\d+\.\s*/, '') + '</li>';
            });
            html += '</ol></div>';
        } else {
            html += '<div class="recipe-view-section"><h3>Zubereitung</h3><p class="no-recipe-info">Noch keine Zubereitung erfasst.</p></div>';
        }

        if (recipe.nutrition) {
            html += '<div class="recipe-view-section"><h3>Nährwerte</h3><p class="nutrition-text">';
            html += recipe.nutrition.split('\n').filter(Boolean).join('<br>');
            html += '</p></div>';
        }

        body.innerHTML = html;
    }

    // Löschen-Button nur für eigene (gespeicherte) Rezepte zeigen
    const deleteArea    = document.getElementById('recipeDeleteArea');
    const deleteConfirm = document.getElementById('recipeDeleteConfirm');
    deleteConfirm.style.display = 'none';
    if (recipe) {
        deleteArea.style.display = 'block';
    } else {
        deleteArea.style.display = 'none';
    }

    document.getElementById('recipeViewModal').style.display = 'block';
}

function closeRecipeViewModal() {
    document.getElementById('recipeDeleteConfirm').style.display = 'none';
    document.getElementById('recipeDeleteArea').style.display    = 'none';
    document.getElementById('recipeViewModal').style.display     = 'none';
}

// Handle form submission
document.getElementById('recipeForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const recipeName      = document.getElementById('recipeName').value;
    const ingredients     = document.getElementById('ingredients').value;
    const nutrition       = document.getElementById('nutrition').value;
    const zubereitung     = document.getElementById('zubereitung').value;
    const preparationTime = document.getElementById('preparationTime').value;
    const category        = document.getElementById('recipeModal').dataset.category;
    const photoType       = document.querySelector('input[name="photoType"]:checked').value;

    function saveRecipe(imageData) {
        const recipeData = {
            name: recipeName,
            imageType: photoType,
            imageData: imageData,
            ingredients: ingredients,
            nutrition: nutrition,
            zubereitung: zubereitung,
            preparationTime: preparationTime + ' Minuten',
            category: category
        };
        let savedRecipes = JSON.parse(localStorage.getItem('recipes')) || {};
        savedRecipes[recipeName] = recipeData;
        localStorage.setItem('recipes', JSON.stringify(savedRecipes));
        alert('Rezept "' + recipeName + '" erfolgreich gespeichert!');
        closeRecipeModal();
    }

    if (photoType === 'kamera') {
        stopCamera();
        saveRecipe(window.capturedCameraPhoto || null);
    } else if (photoType === 'photo') {
        const file = document.getElementById('recipePhoto').files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(ev) { saveRecipe(ev.target.result); };
            reader.readAsDataURL(file);
        } else {
            saveRecipe(null);
        }
    } else if (photoType === 'emoji') {
        saveRecipe(window.selectedRecipeEmoji || '🍽️');
    } else if (photoType === 'ai') {
        saveRecipe(window.aiSuggestedImageUrl || null);
    } else {
        saveRecipe(null);
    }
});

// Add click handlers to all "Zum Rezept" buttons
document.addEventListener('DOMContentLoaded', function() {
    const enterSiteBtn = document.getElementById('enterSiteBtn');
    if (enterSiteBtn) {
        enterSiteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('landingPage').style.display = 'none';
            document.getElementById('siteContent').style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const startLink = document.querySelector('a[href="#landing"]');
    if (startLink) {
        startLink.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('landingPage').style.display = 'block';
            document.getElementById('siteContent').style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(function(button) {
        if (button.textContent.trim() === 'Zum Rezept') {
            button.onclick = function(e) {
                e.preventDefault();
                const recipeName = this.parentElement.querySelector('h3').textContent;
                openRecipeModal(recipeName);
            };
            button.style.cursor = 'pointer';
        }
    });

    // Emoji-Grid beim Laden einmalig aufbauen
    const foodEmojis = ['🍕','🍝','🍜','🍲','🍛','🍣','🍱','🥘','🍗','🍖','🥩','🥗','🥙','🌮','🌯','🥪','🍔','🍟','🌭','🥞','🧇','🥓','🍳','🧆','🍞','🥐','🥖','🧀','🥦','🥕','🌽','🥔','🍠','🍰','🎂','🧁','🍩','🍪','🍫','🍦','🍨','🥤','☕','🍵','🫕','🫔','🍱','🥣','🧇','🫙'];
    const emojiGrid = document.getElementById('emojiGrid');
    foodEmojis.forEach(function(emoji) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'emoji-option';
        btn.textContent = emoji;
        btn.addEventListener('click', function() {
            document.querySelectorAll('.emoji-option').forEach(function(e) { e.classList.remove('selected'); });
            btn.classList.add('selected');
            window.selectedRecipeEmoji = emoji;
            document.getElementById('selectedEmojiPreview').textContent = emoji;
        });
        emojiGrid.appendChild(btn);
    });

    // Kamera-Buttons
    document.getElementById('openCameraBtn').addEventListener('click', function() {
        startCamera();
    });

    document.getElementById('captureBtn').addEventListener('click', function() {
        const video  = document.getElementById('cameraPreview');
        const canvas = document.getElementById('cameraCanvas');
        canvas.width  = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        window.capturedCameraPhoto = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();
        video.style.display  = 'none';
        canvas.style.display = 'block';
        document.getElementById('cameraControls').style.display        = 'none';
        document.getElementById('cameraConfirmControls').style.display = 'flex';
    });

    document.getElementById('retakeBtn').addEventListener('click', function() {
        window.capturedCameraPhoto = null;
        startCamera();
    });

    document.getElementById('confirmPhotoBtn').addEventListener('click', function() {
        document.getElementById('cameraConfirmControls').style.display = 'none';
        document.getElementById('cameraCanvas').style.display          = 'none';
        document.getElementById('cameraPhotoConfirmed').style.display  = 'block';
    });

    // Radio-Buttons für Bildauswahl
    document.querySelectorAll('input[name="photoType"]').forEach(function(radio) {
        radio.addEventListener('change', function() { updatePhotoSections(this.value); });
    });

    // KI-Vorschlag Button: schlägt passende Emojis zum Rezeptnamen vor
    document.getElementById('aiSuggestBtn').addEventListener('click', function() {
        const name    = document.getElementById('recipeName').value.trim().toLowerCase();
        const preview = document.getElementById('aiImagePreview');
        const suggestions = getEmojiSuggestions(name);

        preview.innerHTML = '<p class="ai-loading" style="margin-bottom:6px;">Tippe einen Vorschlag an:</p>';
        const row = document.createElement('div');
        row.className = 'ai-suggestions';

        suggestions.forEach(function(emoji) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ai-suggestion-btn';
            btn.textContent = emoji;
            btn.addEventListener('click', function() {
                // Automatisch auf "Emoji wählen" wechseln und Emoji setzen
                document.querySelector('input[name="photoType"][value="emoji"]').checked = true;
                updatePhotoSections('emoji');
                window.selectedRecipeEmoji = emoji;
                document.getElementById('selectedEmojiPreview').textContent = emoji;
                document.querySelectorAll('.emoji-option').forEach(function(e) {
                    e.classList.toggle('selected', e.textContent === emoji);
                });
            });
            row.appendChild(btn);
        });

        preview.appendChild(row);
    });

    // Rezept löschen – Ablauf im Detail-Modal
    document.getElementById('recipeDeleteBtn').addEventListener('click', function() {
        document.getElementById('recipeDeleteArea').style.display    = 'none';
        document.getElementById('recipeDeleteConfirm').style.display = 'block';
    });

    document.getElementById('confirmDeleteNo').addEventListener('click', function() {
        document.getElementById('recipeDeleteConfirm').style.display = 'none';
        document.getElementById('recipeDeleteArea').style.display    = 'block';
    });

    document.getElementById('confirmDeleteYes').addEventListener('click', function() {
        const recipeName = document.getElementById('recipeViewTitle').textContent;
        deleteRecipe(recipeName);
        closeRecipeViewModal();
    });

    // Suchfunktion
    const searchInput = document.getElementById('recipeSearch');
    const clearBtn    = document.getElementById('clearSearch');

    searchInput.addEventListener('input', function() {
        const q = this.value.trim().toLowerCase();
        clearBtn.style.display = q ? 'block' : 'none';
        filterRecipes(q);
    });

    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        filterRecipes('');
    });

    // Gespeicherte Rezepte als Karten einblenden
    loadSavedRecipes();

    // Load saved comments and reactions
    loadCommentsAndReactions();

    // Add reaction button handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('reaction-btn') || e.target.closest('.reaction-btn')) {
            const button = e.target.classList.contains('reaction-btn') ? e.target : e.target.closest('.reaction-btn');
            const recipe = button.dataset.recipe;
            const emoji = button.dataset.emoji;
            
            toggleReaction(recipe, emoji, button);
        }
    });

    // Add comment submit handlers
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('comment-submit-btn')) {
            const recipe = e.target.dataset.recipe;
            const textarea = document.querySelector(`.comment-input[data-recipe="${recipe}"]`);
            const commentText = textarea.value.trim();
            
            if (commentText) {
                addComment(recipe, commentText);
                textarea.value = '';
            }
        }
    });
});

// Erstellt ein einzelnes Kommentar-Element mit Löschen-Button
function createCommentElement(recipe, comment, index) {
    const div = document.createElement('div');
    div.className = 'comment';
    div.innerHTML = `
        <button class="comment-delete-btn" title="Kommentar löschen">✕</button>
        <div class="comment-author">Anonymer User</div>
        <div class="comment-text">${comment.text}</div>
        <div class="comment-date">${comment.date}</div>
    `;
    div.querySelector('.comment-delete-btn').addEventListener('click', function() {
        deleteComment(recipe, index);
    });
    return div;
}

// Rendert alle Kommentare eines Rezepts neu
function renderComments(recipe) {
    const commentData = JSON.parse(localStorage.getItem('recipeComments')) || {};
    const commentsSection = document.querySelector(`.comments-section[data-recipe="${recipe}"]`);
    if (!commentsSection) return;
    commentsSection.innerHTML = '';
    (commentData[recipe] || []).forEach(function(comment, index) {
        commentsSection.appendChild(createCommentElement(recipe, comment, index));
    });
}

// Löscht einen Kommentar und rendert die Liste neu
function deleteComment(recipe, index) {
    const commentData = JSON.parse(localStorage.getItem('recipeComments')) || {};
    if (commentData[recipe]) {
        commentData[recipe].splice(index, 1);
        localStorage.setItem('recipeComments', JSON.stringify(commentData));
        renderComments(recipe);
    }
}

// Load comments and reactions from localStorage
function loadCommentsAndReactions() {
    const savedData = JSON.parse(localStorage.getItem('recipeComments')) || {};
    const reactionData = JSON.parse(localStorage.getItem('recipeReactions_v2')) || {};

    // Load comments
    for (const recipe in savedData) {
        renderComments(recipe);
    }

    const userReactions = JSON.parse(localStorage.getItem('userReactions_v2')) || {};

    // Load reactions
    for (const recipe in reactionData) {
        for (const emoji in reactionData[recipe]) {
            const count = reactionData[recipe][emoji];
            const button = document.querySelector(`.reaction-btn[data-recipe="${recipe}"][data-emoji="${emoji}"]`);
            if (button) {
                button.querySelector('.reaction-count').textContent = count;
                if (userReactions[recipe] && userReactions[recipe][emoji]) {
                    button.classList.add('active');
                }
            }
        }
    }
}

// Toggle reaction: erstes Klicken = hinzufügen, zweites Klicken = rückgängig machen
function toggleReaction(recipe, emoji, button) {
    const reactionData = JSON.parse(localStorage.getItem('recipeReactions_v2')) || {};
    const userReactions = JSON.parse(localStorage.getItem('userReactions_v2')) || {};

    if (!reactionData[recipe]) reactionData[recipe] = {};
    if (!reactionData[recipe][emoji]) reactionData[recipe][emoji] = 0;
    if (!userReactions[recipe]) userReactions[recipe] = {};

    if (userReactions[recipe][emoji]) {
        // Reaktion rückgängig machen
        reactionData[recipe][emoji] = Math.max(0, reactionData[recipe][emoji] - 1);
        userReactions[recipe][emoji] = false;
        button.classList.remove('active');
    } else {
        // Reaktion hinzufügen
        reactionData[recipe][emoji]++;
        userReactions[recipe][emoji] = true;
        button.classList.add('active');
    }

    localStorage.setItem('recipeReactions_v2', JSON.stringify(reactionData));
    localStorage.setItem('userReactions_v2', JSON.stringify(userReactions));

    button.querySelector('.reaction-count').textContent = reactionData[recipe][emoji];
}

// Add a comment
function addComment(recipe, text) {
    const commentData = JSON.parse(localStorage.getItem('recipeComments')) || {};
    if (!commentData[recipe]) commentData[recipe] = [];
    commentData[recipe].push({
        text: text,
        date: new Date().toLocaleString('de-DE')
    });
    localStorage.setItem('recipeComments', JSON.stringify(commentData));
    renderComments(recipe);
}

// Rezepte nach Suchbegriff filtern
function filterRecipes(query) {
    const sections = document.querySelectorAll('.meal-section');
    let totalVisible = 0;

    sections.forEach(function(section) {
        const cards = section.querySelectorAll('.recipe-card:not(.add-recipe-card)');
        let sectionVisible = 0;

        cards.forEach(function(card) {
            const title = (card.querySelector('h3') || {}).textContent || '';
            const desc  = (card.querySelector('p')  || {}).textContent || '';
            const matches = !query ||
                title.toLowerCase().includes(query) ||
                desc.toLowerCase().includes(query) ||
                searchInSavedIngredients(title.trim(), query);

            card.style.display = matches ? '' : 'none';
            if (matches) sectionVisible++;
        });

        totalVisible += sectionVisible;
        const addCard = section.querySelector('.add-recipe-card');
        if (addCard) addCard.style.display = (query && sectionVisible === 0) ? 'none' : '';
        section.style.display = (query && sectionVisible === 0) ? 'none' : '';
    });

    let noResults = document.getElementById('noSearchResults');
    if (!noResults) {
        noResults = document.createElement('div');
        noResults.id = 'noSearchResults';
        noResults.className = 'no-search-results';
        noResults.textContent = 'Kein Rezept gefunden.';
        document.querySelector('#siteContent .container').appendChild(noResults);
    }
    noResults.style.display = (query && totalVisible === 0) ? 'block' : 'none';
}

function getEmojiSuggestions(name) {
    const map = [
        { keys: ['pizza'],                                          e: '🍕' },
        { keys: ['pasta','spaghetti','nudel','carbonara','bolognese','penne'], e: '🍝' },
        { keys: ['suppe','eintopf','brühe'],                        e: '🍲' },
        { keys: ['salat'],                                          e: '🥗' },
        { keys: ['burger','hamburger'],                             e: '🍔' },
        { keys: ['pommes','fries'],                                 e: '🍟' },
        { keys: ['hähnchen','huhn','chicken','hühnchen'],           e: '🍗' },
        { keys: ['steak','rind','beef','schnitzel','fleisch'],      e: '🥩' },
        { keys: ['fisch','lachs','thunfisch','forelle'],            e: '🐟' },
        { keys: ['sushi','maki'],                                   e: '🍣' },
        { keys: ['taco'],                                           e: '🌮' },
        { keys: ['wrap','burrito'],                                 e: '🌯' },
        { keys: ['sandwich','toast'],                               e: '🥪' },
        { keys: ['ei','omelette','rührei','spiegelei'],             e: '🍳' },
        { keys: ['pfannkuchen','pancake','crepe','crêpe','waffel'], e: '🥞' },
        { keys: ['wurst','hot dog','bratwurst'],                    e: '🌭' },
        { keys: ['käse'],                                           e: '🧀' },
        { keys: ['brot','brötchen','baguette'],                     e: '🍞' },
        { keys: ['croissant'],                                      e: '🥐' },
        { keys: ['müsli','hafer','porridge'],                       e: '🥣' },
        { keys: ['reis'],                                           e: '🍚' },
        { keys: ['curry'],                                          e: '🍛' },
        { keys: ['ramen'],                                          e: '🍜' },
        { keys: ['kuchen','torte','cake','käsekuchen'],             e: '🍰' },
        { keys: ['geburtstag'],                                     e: '🎂' },
        { keys: ['muffin','cupcake'],                               e: '🧁' },
        { keys: ['donut','krapfen','berliner'],                     e: '🍩' },
        { keys: ['keks','plätzchen','cookie','brownie'],            e: '🍪' },
        { keys: ['schokolade','schoko'],                            e: '🍫' },
        { keys: ['eis','glace'],                                    e: '🍦' },
        { keys: ['smoothie','shake','milchshake'],                  e: '🥤' },
        { keys: ['kaffee','cappuccino','espresso','latte'],         e: '☕' },
        { keys: ['tee'],                                            e: '🍵' },
        { keys: ['brokkoli','broccoli','gemüse'],                   e: '🥦' },
        { keys: ['karotte','möhre'],                                e: '🥕' },
        { keys: ['kartoffel'],                                      e: '🥔' },
        { keys: ['avocado'],                                        e: '🥑' },
        { keys: ['apfel'],                                          e: '🍎' },
        { keys: ['erdbeere'],                                       e: '🍓' },
        { keys: ['banane'],                                         e: '🍌' },
        { keys: ['zitrone'],                                        e: '🍋' },
        { keys: ['tomate'],                                         e: '🍅' },
        { keys: ['mais'],                                           e: '🌽' },
        { keys: ['knoblauch'],                                      e: '🧄' },
        { keys: ['zwiebel'],                                        e: '🧅' },
    ];
    const matches = [];
    map.forEach(function(entry) {
        if (entry.keys.some(function(k) { return name.includes(k); })) {
            matches.push(entry.e);
        }
    });
    return matches.length > 0 ? matches.slice(0, 6) : ['🍽️', '🥘', '🫕', '🍱', '🧆', '🥙'];
}

function createRecipeCard(recipeData) {
    const name   = recipeData.name;
    const emojis = ['👍', '❤️', '😊', '😢', '😡'];

    const card = document.createElement('div');
    card.className = 'recipe-card';

    // Bild
    const imageDiv = document.createElement('div');
    imageDiv.className = 'recipe-card-image';
    if ((recipeData.imageType === 'photo' || recipeData.imageType === 'kamera') && recipeData.imageData) {
        const img = document.createElement('img');
        img.src = recipeData.imageData;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
        imageDiv.style.padding = '0';
        imageDiv.appendChild(img);
    } else if (recipeData.imageData) {
        imageDiv.textContent = recipeData.imageData;
    } else {
        imageDiv.textContent = '🍽️';
    }

    // Inhalt
    const contentDiv = document.createElement('div');
    contentDiv.className = 'recipe-card-content';

    const h3 = document.createElement('h3');
    h3.textContent = name;

    const p = document.createElement('p');
    if (recipeData.ingredients) {
        const lines = recipeData.ingredients.split('\n').filter(Boolean);
        p.textContent = lines.slice(0, 2).join(', ') + (lines.length > 2 ? ' …' : '');
    } else {
        p.textContent = recipeData.preparationTime || '';
    }

    const btn = document.createElement('a');
    btn.href = '#';
    btn.className = 'btn';
    btn.textContent = 'Zum Rezept';
    btn.onclick = function(e) { e.preventDefault(); openRecipeModal(name); };

    contentDiv.appendChild(h3);
    contentDiv.appendChild(p);
    contentDiv.appendChild(btn);

    // Kommentare & Reaktionen
    const commentsDiv = document.createElement('div');
    commentsDiv.className = 'recipe-comments';

    const reactionsDiv = document.createElement('div');
    reactionsDiv.className = 'reactions';
    emojis.forEach(function(emoji) {
        const rb = document.createElement('button');
        rb.className = 'reaction-btn';
        rb.dataset.recipe = name;
        rb.dataset.emoji  = emoji;
        rb.innerHTML = emoji + ' <span class="reaction-count">0</span>';
        reactionsDiv.appendChild(rb);
    });

    const commentsSection = document.createElement('div');
    commentsSection.className = 'comments-section';
    commentsSection.dataset.recipe = name;

    const addCommentDiv = document.createElement('div');
    addCommentDiv.className = 'add-comment';
    addCommentDiv.innerHTML =
        '<textarea class="comment-input" placeholder="Teilen Sie Ihre Meinung zu diesem Rezept..." data-recipe="' + name + '"></textarea>' +
        '<button class="comment-submit-btn" data-recipe="' + name + '">Kommentar senden</button>';

    commentsDiv.appendChild(reactionsDiv);
    commentsDiv.appendChild(commentsSection);
    commentsDiv.appendChild(addCommentDiv);

    card.appendChild(imageDiv);
    card.appendChild(contentDiv);
    card.appendChild(commentsDiv);

    return card;
}

function renderSavedRecipeCard(recipeData) {
    const section = document.getElementById(recipeData.category);
    if (!section) return;
    const recipesGrid = section.querySelector('.recipes');
    const addCard     = recipesGrid.querySelector('.add-recipe-card');
    const card        = createRecipeCard(recipeData);
    recipesGrid.insertBefore(card, addCard);
}

function loadSavedRecipes() {
    const saved = JSON.parse(localStorage.getItem('recipes')) || {};
    Object.values(saved).forEach(function(recipe) {
        renderSavedRecipeCard(recipe);
    });
}

function deleteRecipe(recipeName) {
    const saved = JSON.parse(localStorage.getItem('recipes')) || {};
    delete saved[recipeName];
    localStorage.setItem('recipes', JSON.stringify(saved));

    document.querySelectorAll('.recipe-card:not(.add-recipe-card)').forEach(function(card) {
        const h3 = card.querySelector('h3');
        if (h3 && h3.textContent.trim() === recipeName) {
            card.remove();
        }
    });
}

function searchInSavedIngredients(recipeName, query) {
    const saved = JSON.parse(localStorage.getItem('recipes')) || {};
    const recipe = saved[recipeName];
    return recipe && recipe.ingredients && recipe.ingredients.toLowerCase().includes(query);
}

