// --- Übersetzungs-Wörterbuch ---
const translationMap = {
    // Warframe Teile
    "Blueprint": "Blaupause",
    "Systems Blueprint": "Systeme Blaupause",
    "Neuroptics Blueprint": "Neuroptik Blaupause",
    "Chassis Blueprint": "Chassis Blaupause",
    "Systems": "Systeme",
    "Neuroptics": "Neuroptik",
    "Chassis": "Chassis",
    // Waffenteile (Nahkampf)
    "Blade": "Klinge",
    "Handle": "Griff",
    "Hilt": "Griff",
    "Guard": "Schutz",
    "Ornament": "Ornament",
    "Head": "Kopf",
    // Waffenteile (Schusswaffen)
    "Barrel": "Lauf",
    "Stock": "Schaft",
    "Receiver": "Gehäuse",
    "Link": "Verbindung",
    // Waffenteile (Bogen)
    "String": "Sehne",
    "Upper Limb": "Oberteil",
    "Lower Limb": "Untereteil",
    "Grip": "Griff",
    // Sentinel/Begleiter
    "Carapace": "Panzer",
    "Cerebrum": "Zerebrum",
    // Spezial
    "Pouch": "Tasche",
    "Stars": "Sterne",
    "Boot": "Stiefel",
    "Gauntlet": "Handschuh",
    "Buckle": "Schnalle",
    "Kubrow Collar Blueprint": "Kubrow-Halsband Blaupause",
    "Band": "Band",
    "Disc": "Disk"
};

/**
 * Übersetzt einen einzelnen Teil-Namen.
 */
function translatePartName(partName) {
    if (translationMap[partName]) {
        return translationMap[partName];
    }
    return partName;
}

// --- Globale Variablen ---
let ducatCount = 0;
let history = [];
let primeDatabase = {};
let searchablePartList = []; 

const DUCAT_PLAT_RATIO = 5;
const STORAGE_KEY_COUNT = 'wf_ducat_count';
const STORAGE_KEY_HISTORY = 'wf_ducat_history';

// --- DOM-Elemente ---
const ducatCountElement = document.getElementById('ducatCount');
const historyListElement = document.getElementById('historyList');
const historyEmptyMessage = document.getElementById('historyEmpty');
const searchInput = document.getElementById('partSearchInput');
const searchResultsContainer = document.getElementById('searchResults');

// --- HILFSFUNKTIONEN (Zeit, Anzeige) ---
function getCurrentTime() {
    return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function updateDisplay() {
    ducatCountElement.textContent = ducatCount.toLocaleString('de-DE');
    historyListElement.innerHTML = '';
    if (history.length === 0) {
        historyEmptyMessage.style.display = 'block';
    } else {
        historyEmptyMessage.style.display = 'none';
        history.forEach(entry => {
            const listItem = document.createElement('li');
            const cssClass = entry.type.toLowerCase();
            const detailHTML = `
                <div class="history-details">
                    <span class="history-description">${entry.description}</span>
                    <span class="history-time">${entry.timestamp}</span>
                </div>
            `;
            let amountText = '';
            if (entry.type === 'Einnahme') amountText = `+${entry.amount} Đ`;
            else if (entry.type === 'Ausgabe') amountText = `-${entry.amount} Đ`;
            else amountText = '—';
            const amountHTML = `<span class="history-amount ${cssClass}">${amountText}</span>`;
            listItem.innerHTML = detailHTML + amountHTML;
            historyListElement.appendChild(listItem);
        });
    }
}

// --- LOCAL STORAGE FUNKTIONEN ---
function loadState() {
    const savedCount = localStorage.getItem(STORAGE_KEY_COUNT);
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedCount !== null) ducatCount = parseInt(savedCount) || 0;
    if (savedHistory !== null) {
        try { history = JSON.parse(savedHistory); } catch (e) { history = []; }
    }
    updateDisplay();
}
function saveState() {
    localStorage.setItem(STORAGE_KEY_COUNT, ducatCount);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

// --- DATENBANK & SUCHE ---
async function loadDatabase() {
    try {
        const response = await fetch('database.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        primeDatabase = await response.json();
        flattenDatabase();
        console.log('Prime-Datenbank erfolgreich geladen und übersetzt.');
    } catch (error) {
        console.error('Fehler beim Laden der database.json:', error);
        alert('Fehler: Die Datei "database.json" konnte nicht geladen werden.');
    }
}

function flattenDatabase() {
    searchablePartList = [];
    for (const itemName in primeDatabase) {
        for (const partName in primeDatabase[itemName]) {
            const ducats = primeDatabase[itemName][partName];
            const translatedPartName = translatePartName(partName);
            const displayName = (partName === "") ? itemName : `${itemName} ${translatedPartName}`; 
            const originalName = (partName === "") ? itemName : `${itemName} ${partName}`; 

            searchablePartList.push({
                displayName: displayName,   
                searchName: originalName,   
                ducats: ducats
            });
        }
    }
    searchablePartList.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    searchResultsContainer.innerHTML = ''; 
    if (query.length < 3) return;

    const results = searchablePartList.filter(part => 
        part.displayName.toLowerCase().includes(query) || 
        part.searchName.toLowerCase().includes(query)    
    );

    const limitedResults = results.slice(0, 5);
    limitedResults.forEach(part => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'search-result-item';
        itemDiv.innerHTML = `
            <span>${part.displayName}</span>
            <span class="result-ducats">${part.ducats} Đ</span>
        `;
        itemDiv.onclick = () => addPartFromSearch(part.displayName, part.ducats);
        searchResultsContainer.appendChild(itemDiv);
    });
}

function addPartFromSearch(displayName, ducats) {
    handleTransaction(ducats, 'Einnahme', displayName);
    searchInput.value = '';
    searchResultsContainer.innerHTML = '';
}

// --- KERN-FUNKTIONEN ---
function handleTransaction(amount, type, description) {
    if (type === 'Einnahme') ducatCount += amount;
    else if (type === 'Ausgabe') ducatCount -= amount;

    history.unshift({
        type: type,
        amount: amount,
        description: description,
        timestamp: getCurrentTime()
    });
    if (history.length > 50) history.pop(); // Historie auf 50 begrenzt
    updateDisplay();
    saveState();
}

function spendDucats() {
    const amountInput = document.getElementById('spendAmount');
    const itemInput = document.getElementById('spendItemName');
    const amount = parseInt(amountInput.value);
    const itemName = itemInput.value.trim() || 'Baro Kauf';

    if (isNaN(amount) || amount <= 0) return alert('Bitte geben Sie einen gültigen Betrag ein.');
    if (amount > ducatCount) return alert('Nicht genügend Dukaten vorhanden!');
    if (!confirm(`Sicher, ${amount} Dukaten für "${itemName}" ausgeben?`)) return;

    handleTransaction(amount, 'Ausgabe', itemName);
    amountInput.value = '';
    itemInput.value = '';
}

function resetDucats() {
    if (ducatCount === 0) return;
    if (confirm(`Zähler von ${ducatCount} Đ auf 0 zurücksetzen?`)) {
        const oldAmount = ducatCount;
        ducatCount = 0;
        history.unshift({
            type: 'Reset',
            amount: oldAmount,
            description: `Zähler auf 0 gesetzt (vorher: ${oldAmount} Đ)`,
            timestamp: getCurrentTime()
        });
        updateDisplay();
        saveState();
    }
}

function clearHistory() {
    if (history.length === 0) return;
    if (confirm("Möchten Sie die gesamte Historie löschen?")) {
        history = [];
        saveState();
        updateDisplay();
    }
}

// --- APP START ---
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    loadDatabase(); 
    document.querySelector('.rate-value').textContent = `${DUCAT_PLAT_RATIO}:1`;
});

