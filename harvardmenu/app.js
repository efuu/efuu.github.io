const RAW_API_BASE = 'https://api.cs50.io/dining';
function getApiUrl(endpoint) {
    return 'https://corsproxy.io/?' + encodeURIComponent(RAW_API_BASE + endpoint);
}
const ANNENBERG_ID = 30;

// State
let allCategories = {}; // { id: name }
let allRecipes = {};    // { id: name }
let currentMeal = 1;    // 1 = Lunch, 2 = Dinner
let currentDate = new Date();

const elements = {
    dateDisplay: document.getElementById('date-display'),
    tabs: document.querySelectorAll('.tab-button'),
    menuContainer: document.getElementById('menu-container'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    retryBtn: document.getElementById('retry-btn'),
    pwaPrompt: document.getElementById('pwa-prompt'),
    closePrompt: document.getElementById('close-prompt')
};

// Auto-determine meal by time. If it's past 2:30 PM, show dinner.
function initMealSelection() {
    const hour = new Date().getHours();
    if (hour >= 14) {
        currentMeal = 2; // Dinner
        elements.tabs[0].classList.remove('active');
        elements.tabs[1].classList.add('active');
    }
}

// Formatting date
function updateDateDisplay() {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const today = new Date();
    
    // Calculate difference in days
    const diffTime = currentDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));
    
    let prefix = "";
    if (diffDays === 0) {
        prefix = "Today, ";
    } else if (diffDays === 1) {
        prefix = "Tomorrow, ";
    } else if (diffDays === -1) {
        prefix = "Yesterday, ";
    }
    elements.dateDisplay.textContent = prefix + currentDate.toLocaleDateString('en-US', options);
}

// Fetch categories and recipes so we can resolve IDs to names
async function fetchDictionaries() {
    // Check localStorage cache first
    const cachedCategories = localStorage.getItem('huds_categories');
    const cachedRecipes = localStorage.getItem('huds_recipes');
    const cacheTime = localStorage.getItem('huds_cache_time');

    // Cache valid for 7 days
    const isCacheValid = cacheTime && (Date.now() - parseInt(cacheTime) < 7 * 24 * 60 * 60 * 1000);

    if (isCacheValid && cachedCategories && cachedRecipes) {
        allCategories = JSON.parse(cachedCategories);
        allRecipes = JSON.parse(cachedRecipes);
        return;
    }

    // Fetch from API
    const [catRes, recRes] = await Promise.all([
        fetch(getApiUrl('/categories')),
        fetch(getApiUrl('/recipes'))
    ]);

    if (!catRes.ok || !recRes.ok) throw new Error('Failed to fetch dictionaries');

    const categories = await catRes.json();
    const recipes = await recRes.json();

    // Convert arrays to objects mapping ID -> Name
    categories.forEach(c => allCategories[c.id] = c.name);
    recipes.forEach(r => allRecipes[r.id] = r.name);

    // Save to cache
    localStorage.setItem('huds_categories', JSON.stringify(allCategories));
    localStorage.setItem('huds_recipes', JSON.stringify(allRecipes));
    localStorage.setItem('huds_cache_time', Date.now().toString());
}

async function fetchMenu(mealId) {
    elements.loading.classList.remove('hidden');
    elements.error.classList.add('hidden');
    elements.menuContainer.classList.add('hidden');
    elements.menuContainer.innerHTML = '';

    try {
        await fetchDictionaries();

        // Format date to YYYY-MM-DD
        const offset = currentDate.getTimezoneOffset();
        const localDate = new Date(currentDate.getTime() - (offset * 60 * 1000));
        const dateStr = localDate.toISOString().split('T')[0];

        const url = getApiUrl(`/menus?location=${ANNENBERG_ID}&meal=${mealId}&date=${dateStr}`);
        const res = await fetch(url);
        
        if (!res.ok) throw new Error('Failed to fetch menus');
        
        const data = await res.json();
        
        if (data.length === 0) {
            elements.menuContainer.innerHTML = `<p style="text-align:center; padding: 40px 20px; color: var(--text-secondary);">No menu available for this meal yet.</p>`;
        } else {
            renderMenu(data);
        }
        
        elements.menuContainer.classList.remove('hidden');
    } catch (err) {
        console.error("Error fetching menu:", err);
        elements.error.classList.remove('hidden');
    } finally {
        elements.loading.classList.add('hidden');
    }
}

function renderMenu(menuItems) {
    // Group items by category name
    const grouped = {};
    
    menuItems.forEach(item => {
        const catName = allCategories[item.category] || `Category ${item.category}`;
        const resName = allRecipes[item.recipe] || `Recipe ${item.recipe}`;
        
        if (!grouped[catName]) {
            grouped[catName] = [];
        }
        grouped[catName].push({ name: resName, id: item.recipe });
    });

    // Filter to only include Entrees, Starch/Potatoes, Desserts, and Brain Break
    const allowedKeywords = ['entree', 'starch', 'potato', 'dessert', 'brain break'];
    
    // Sort logic
    const categoryKeys = Object.keys(grouped).filter(cat => {
        const lowerCat = cat.toLowerCase();
        return allowedKeywords.some(keyword => lowerCat.includes(keyword));
    }).sort((a, b) => {
        // Enforce a specific display order if possible
        const order = ['entree', 'starch', 'potato', 'dessert', 'brain break'];
        const getRank = (str) => {
            const s = str.toLowerCase();
            return order.findIndex(k => s.includes(k));
        };
        return getRank(a) - getRank(b);
    });

    // Render HTML
    categoryKeys.forEach(cat => {
        const section = document.createElement('div');
        section.className = 'category-section';
        
        const title = document.createElement('h2');
        title.className = 'category-title';
        title.textContent = cat;
        section.appendChild(title);
        
        grouped[cat].forEach(recipe => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'menu-item';
            
            const p = document.createElement('p');
            p.className = 'menu-item-name';
            p.textContent = recipe.name.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()); // Title case
            
            itemDiv.appendChild(p);
            section.appendChild(itemDiv);
        });
        
        elements.menuContainer.appendChild(section);
    });
}

// Event Listeners
elements.tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
        if (e.target.classList.contains('active')) return;
        
        elements.tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        currentMeal = parseInt(e.target.getAttribute('data-meal'));
        fetchMenu(currentMeal);
    });
});

elements.retryBtn.addEventListener('click', () => {
    fetchMenu(currentMeal);
});

document.getElementById('prev-day').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDateDisplay();
    fetchMenu(currentMeal);
});

document.getElementById('next-day').addEventListener('click', () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDateDisplay();
    fetchMenu(currentMeal);
});

// PWA Install Prompt Logic (only relevant on Safari iOS mostly)
function checkPWA() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Don't show if already installed
    if (isStandalone) return;
    
    // Show prompt if on iOS and not installed
    if (isIOS) {
        elements.pwaPrompt.classList.remove('hidden');
    }
}

elements.closePrompt.addEventListener('click', () => {
    elements.pwaPrompt.classList.add('hidden');
});

// Init
initMealSelection();
updateDateDisplay();
fetchMenu(currentMeal);
setTimeout(checkPWA, 2000); // Check for PWA after 2 seconds
