// Globale Variablen
let ducatCount = 0;
let history = [];
let primeDatabase = {}; // Speichert die geladene database.json
let searchablePartList = []; // Die "abgeflachte" Liste für die Suche

const DUCAT_PLAT_RATIO = 5;
const STORAGE_KEY_COUNT = 'wf_ducat_count';
const STORAGE_KEY_HISTORY = 'wf_ducat_history';

// DOM-Elemente
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
    // 1. Zähler aktualisieren
    ducatCountElement.textContent = ducatCount.toLocaleString('de-DE');

    // 2. Historie aktualisieren
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

// --- LOCAL STORAGE FUNKTIONEN (Unverändert) ---

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

// --- DATENBANK & SUCHE (NEU) ---

/**
 * Lädt die database.json und wandelt sie in eine durchsuchbare Liste um.
 */
async function loadDatabase() {
    try {
        const response = await fetch('database.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        primeDatabase = await response.json();
        flattenDatabase();
        console.log('Prime-Datenbank erfolgreich geladen.');
    } catch (error) {
        console.error('Fehler beim Laden der database.json:', error);
        alert('Fehler: Die Datei "database.json" konnte nicht geladen werden. Stellen Sie sicher, dass sie sich im selben Ordner wie die index.html befindet.');
    }
}

/**
 * Wandelt das verschachtelte JSON-Objekt in ein flaches Array (searchablePartList) um.
 */
function flattenDatabase() {
    searchablePartList = [];
    for (const itemName in primeDatabase) {
        for (const partName in primeDatabase[itemName]) {
            const ducats = primeDatabase[itemName][partName];
            
            // Behandelt Spezialfälle wie "Riven Sliver"
            const fullName = (partName === "") ? itemName : `${itemName} ${partName}`; 
            
            searchablePartList.push({
                name: fullName,
                ducats: ducats
            });
        }
    }
    // Sortiert die Liste alphabetisch für bessere Suchergebnisse
    searchablePartList.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Wird bei jeder Tasteneingabe im Suchfeld aufgerufen.
 */
function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    searchResultsContainer.innerHTML = ''; // Alte Ergebnisse löschen

    if (query.length < 3) {
        return; // Suche erst ab 3 Zeichen (wie von Ihnen vorgeschlagen)
    }

    const results = searchablePartList.filter(part => 
        part.name.toLowerCase().includes(query)
    );

    const limitedResults = results.slice(0, 5); // Auf 5 Ergebnisse begrenzen

    limitedResults.forEach(part => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'search-result-item';
        itemDiv.innerHTML = `
            <span>${part.name}</span>
            <span class="result-ducats">${part.ducats} Đ</span>
        `;
        // WICHTIG: Der OnClick-Handler ruft addPartFromSearch auf
        itemDiv.onclick = () => addPartFromSearch(part.name, part.ducats);
        searchResultsContainer.appendChild(itemDiv);
    });
}

/**
 * Wird aufgerufen, wenn ein Suchergebnis angeklickt wird.
 */
function addPartFromSearch(name, ducats) {
    handleTransaction(ducats, 'Einnahme', name);
    
    // Suchfeld und Ergebnisse leeren
    searchInput.value = '';
    searchResultsContainer.innerHTML = '';
}

// --- KERN-FUNKTIONEN (Unverändert) ---

/**
 * Verarbeitet Einnahmen oder Ausgaben von Dukaten und protokolliert sie.
 */
function handleTransaction(amount, type, description) {
    if (type === 'Einnahme') ducatCount += amount;
    else if (type === 'Ausgabe') ducatCount -= amount;

    history.unshift({
        type: type,
        amount: amount,
        description: description,
        timestamp: getCurrentTime()
    });
    if (history.length > 50) history.pop();

    updateDisplay();
    saveState();
}

/**
 * Zieht Dukaten für einen Kauf ab.
 */
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

/**
 * Setzt den Dukaten-Zähler auf 0.
 */
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

/**
 * Löscht die gesamte Historie.
 */
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
    loadState(); // Lade den gespeicherten Zählerstand
    loadDatabase(); // Lade die Prime-Teile-Datenbank
    document.querySelector('.rate-value').textContent = `${DUCAT_PLAT_RATIO}:1`;
});
