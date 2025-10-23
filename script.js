// Globale Variablen
let ducatCount = 0;
let history = [];
const DUCAT_PLAT_RATIO = 5; // 5 Dukaten = 1 Platin (Zielwert)
const STORAGE_KEY_COUNT = 'wf_ducat_count';
const STORAGE_KEY_HISTORY = 'wf_ducat_history';

// DOM-Elemente
const ducatCountElement = document.getElementById('ducatCount');
const historyListElement = document.getElementById('historyList');
const historyEmptyMessage = document.getElementById('historyEmpty');

// --- HILFSFUNKTIONEN ---

/**
 * Ruft die aktuelle Zeit im lesbaren Format ab.
 * @returns {string} Zeitstempel (HH:MM:SS)
 */
function getCurrentTime() {
    return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Aktualisiert die Anzeige des Zählers und der Historie.
 */
function updateDisplay() {
    // 1. Zähler aktualisieren und formatieren
    ducatCountElement.textContent = ducatCount.toLocaleString('de-DE');

    // 2. Historie aktualisieren
    historyListElement.innerHTML = ''; // Liste leeren

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
            if (entry.type === 'Einnahme') {
                amountText = `+${entry.amount} Đ`;
            } else if (entry.type === 'Ausgabe') {
                amountText = `-${entry.amount} Đ`;
            } else {
                amountText = '—'; // Reset
            }

            const amountHTML = `<span class="history-amount ${cssClass}">${amountText}</span>`;

            listItem.innerHTML = detailHTML + amountHTML;
            listItem.className = cssClass;
            historyListElement.appendChild(listItem);
        });
    }
}

// --- LOCAL STORAGE FUNKTIONEN ---

/**
 * Lädt Dukaten-Stand und Historie aus dem Local Storage.
 */
function loadState() {
    const savedCount = localStorage.getItem(STORAGE_KEY_COUNT);
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);

    if (savedCount !== null) {
        ducatCount = parseInt(savedCount) || 0;
    }
    if (savedHistory !== null) {
        try {
            history = JSON.parse(savedHistory);
        } catch (e) {
            console.error("Fehler beim Parsen der Historie:", e);
            history = [];
        }
    }
    updateDisplay();
}

/**
 * Speichert Dukaten-Stand und Historie im Local Storage.
 */
function saveState() {
    localStorage.setItem(STORAGE_KEY_COUNT, ducatCount);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
}

// --- KERN-FUNKTIONEN ---

/**
 * Verarbeitet Einnahmen oder Ausgaben von Dukaten und protokolliert sie.
 * @param {number} amount - Die Menge der Dukaten.
 * @param {'Einnahme'|'Ausgabe'|'Reset'} type - Der Typ der Transaktion.
 * @param {string} description - Beschreibung der Transaktion.
 */
function handleTransaction(amount, type, description) {
    if (type === 'Einnahme') {
        ducatCount += amount;
    } else if (type === 'Ausgabe') {
        ducatCount -= amount;
    }

    history.unshift({
        type: type,
        amount: amount,
        description: description,
        timestamp: getCurrentTime()
    });

    // Begrenzung der Historie, um Performance zu gewährleisten (z.B. auf 50 Einträge)
    if (history.length > 50) {
        history.pop();
    }

    updateDisplay();
    saveState();
}

/**
 * Fügt Dukaten über den benutzerdefinierten Input hinzu.
 */
function addCustomDucats() {
    const input = document.getElementById('customAmount');
    const amount = parseInt(input.value);

    if (isNaN(amount) || amount <= 0) {
        alert('Bitte geben Sie eine gültige Menge (> 0) ein.');
        return;
    }

    handleTransaction(amount, 'Einnahme', 'Benutzerdefinierte Eingabe');
    input.value = ''; 
}

/**
 * Zieht Dukaten für einen Kauf ab.
 */
function spendDucats() {
    const amountInput = document.getElementById('spendAmount');
    const itemInput = document.getElementById('spendItemName');
    const amount = parseInt(amountInput.value);
    const itemName = itemInput.value.trim() || 'Baro Kauf';

    if (isNaN(amount) || amount <= 0) {
        alert('Bitte geben Sie einen gültigen Dukaten-Betrag (> 0) ein.');
        return;
    }

    if (amount > ducatCount) {
        alert(`Nicht genügend Dukaten vorhanden! Benötigt: ${amount} | Vorhanden: ${ducatCount}`);
        return;
    }
    
    // Benutzereingabe bestätigen
    if (!confirm(`Sicher, dass Sie ${amount} Dukaten für "${itemName}" ausgeben möchten?`)) {
        return;
    }

    handleTransaction(amount, 'Ausgabe', itemName);
    amountInput.value = '';
    itemInput.value = '';
}

/**
 * Setzt den Dukaten-Zähler auf 0.
 */
function resetDucats() {
    if (ducatCount === 0) return;

    if (confirm(`Möchten Sie den Zählerstand von ${ducatCount} Dukaten auf 0 zurücksetzen?`)) {
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

    if (confirm("Sind Sie sicher, dass Sie die gesamte Transaktions-Historie löschen möchten?")) {
        history = [];
        saveState();
        updateDisplay();
    }
}

// Start der Anwendung
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    // Zeigt die Rate an (ist statisch, muss nur einmal gesetzt werden)
    document.querySelector('.rate-value').textContent = `${DUCAT_PLAT_RATIO}:1`;
});
