document.addEventListener('DOMContentLoaded', () => {
    const entriesContainer = document.getElementById('entries-container');
    const addEntryTopBtn = document.getElementById('add-entry-top-btn');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const prevAllMonthBtn = document.getElementById('prev-all-month-btn');
    const nextAllMonthBtn = document.getElementById('next-all-month-btn');
    const printReceiptsBtn = document.getElementById('print-receipts-btn');
    const receiptCount = document.getElementById('receipt-count');
    const entryTemplate = document.getElementById('entry-template');
    const { jsPDF } = window.jspdf;

    let entriesData = [];
    const MAX_ENTRIES = 30;

    function getSpanishMonth(monthIndex) {
        const months = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        return months[monthIndex];
    }

    // Helper for abbreviated Spanish month names
    function getSpanishShortMonth(monthIndex) {
        const shortMonths = [
            "Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
        ];
        return shortMonths[monthIndex];
    }

    function formatDateForDisplay(dateString) {
        if (!dateString) return ''; // Return empty string if no date
        const parts = dateString.split('-'); // YYYY-MM-DD
        if (parts.length !== 3) return ''; // Basic validation

        const year = parts[0];
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parts[2];

        // Create a date object to validate day/month and to easily get parts
        const dateObj = new Date(year, month, day);

        const formattedDay = day.toString().padStart(2, '0'); // Ensure two digits for day
        const formattedShortMonth = getSpanishShortMonth(dateObj.getMonth());

        return `${formattedDay}-${formattedShortMonth}-${year}`;
    }

    function formatDate(dateString) {
        if (!dateString) return 'Fecha no especificada';
        // Ensure date is treated as local by splitting and creating new Date
        const parts = dateString.split('-'); // Expects YYYY-MM-DD
        const date = new Date(parts[0], parts[1] - 1, parts[2]); // Month is 0-indexed

        const day = date.getDate().toString().padStart(2, '0');
        const month = getSpanishMonth(date.getMonth());
        const year = date.getFullYear();

        return `${day} de ${month} de ${year}`;
    }

    function parseInputDate(dateString) {
        if (!dateString) return null;
        const parts = dateString.split('-');
        if (parts.length !== 3) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function calculateReceiptEndDate(fromDate) {
        const nextMonthYear = fromDate.getFullYear() + Math.floor((fromDate.getMonth() + 1) / 12);
        const nextMonth = (fromDate.getMonth() + 1) % 12;
        const daysInNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
        const nextPeriodStart = new Date(nextMonthYear, nextMonth, Math.min(fromDate.getDate(), daysInNextMonth));
        nextPeriodStart.setDate(nextPeriodStart.getDate() - 1);
        return nextPeriodStart;
    }

    function syncReceiptPeriod(entryId) {
        const entryIndex = entriesData.findIndex(e => e.id === entryId);
        if (entryIndex === -1) return;

        const entryData = entriesData[entryIndex];
        const entryDiv = document.getElementById(entryId);
        if (!entryDiv) return;

        const periodoFromInput = entryDiv.querySelector('.entry-periodo-from');
        const fromDate = parseInputDate(periodoFromInput.value);
        if (!fromDate) return;

        const periodoTo = formatDateForInput(calculateReceiptEndDate(fromDate));
        const fromDisplaySpan = entryDiv.querySelector('.from-display-span');
        const toDisplaySpan = entryDiv.querySelector('.to-display-span');

        entryData.periodoFrom = periodoFromInput.value;
        entryData.periodoTo = periodoTo;

        if (fromDisplaySpan) fromDisplaySpan.textContent = formatDateForDisplay(entryData.periodoFrom);
        if (toDisplaySpan) toDisplaySpan.textContent = formatDateForDisplay(entryData.periodoTo);
    }

    function getEntryWarnings(entryData) {
        const warnings = [];

        if (!entryData.inquilino || !entryData.inquilino.trim()) {
            warnings.push('Falta inquilino');
        }

        if (!entryData.monto || Number(entryData.monto) <= 0) {
            warnings.push('Falta monto');
        }

        if (!entryData.periodoFrom) {
            warnings.push('Falta fecha de recibo');
        }

        return warnings;
    }

    function updateEntryWarnings(entryId) {
        const entryData = entriesData.find(e => e.id === entryId);
        const entryDiv = document.getElementById(entryId);
        if (!entryData || !entryDiv) return;

        const warningDiv = entryDiv.querySelector('.entry-warning');
        if (!warningDiv) return;

        const warnings = getEntryWarnings(entryData);
        warningDiv.textContent = warnings.join(' · ');
        warningDiv.style.display = warnings.length ? 'block' : 'none';
        entryDiv.classList.toggle('entry-has-warning', warnings.length > 0);
    }

    function updateAllEntryWarnings() {
        entriesData.forEach(entryData => updateEntryWarnings(entryData.id));
    }

    // VISUAL REFRESH: header count. Remove this function and its calls to revert.
    function updateReceiptCount() {
        const total = entriesData.length;
        const ready = entriesData.filter(entryData => getEntryWarnings(entryData).length === 0 && entryData.periodoTo).length;
        const incomplete = total - ready;

        if (total === 0) {
            receiptCount.textContent = '0 recibos';
        } else if (incomplete === 0) {
            receiptCount.textContent = `${ready} recibo${ready === 1 ? '' : 's'} listo${ready === 1 ? '' : 's'}`;
        } else {
            receiptCount.textContent = `${ready} listo${ready === 1 ? '' : 's'} · ${incomplete} con datos faltantes`;
        }
    }

    function saveEntries() {
        localStorage.setItem('receiptEntries', JSON.stringify(entriesData));
    }

    function loadEntries() {
        const storedEntries = localStorage.getItem('receiptEntries');
        if (storedEntries) {
            entriesData = JSON.parse(storedEntries);
            entriesData.forEach(entryData => renderEntry(entryData));
        } else {
            // Add one blank entry if nothing is loaded, and it's desired.
            // addEntry(); // Or leave it empty for user to click "Add"
        }
        updateAddEntryButtonState();
    }

    function updateAddEntryButtonState() {
        const addButtons = [addEntryTopBtn, addEntryBtn];

        if (entriesData.length >= MAX_ENTRIES) {
            addButtons.forEach(button => {
                button.disabled = true;
                button.textContent = 'Límite de entradas alcanzado';
            });
        } else {
            addButtons.forEach(button => {
                button.disabled = false;
                button.textContent = 'Agregar Nueva Entrada';
            });
        }
        updateReceiptCount();
    }

    function renderEntry(data) {
        if (entriesData.length > MAX_ENTRIES && !data) { // Prevent adding if rendering a new blank one over limit
            updateAddEntryButtonState();
            return;
        }

        const entryId = data ? data.id : Date.now().toString();
        const newEntryDiv = entryTemplate.cloneNode(true);
        newEntryDiv.style.display = 'block';
        newEntryDiv.id = entryId;

        const deptoInput = newEntryDiv.querySelector('.entry-depto');
        const inquilinoInput = newEntryDiv.querySelector('.entry-inquilino');
        const montoInput = newEntryDiv.querySelector('.entry-monto');
        const periodoFromInput = newEntryDiv.querySelector('.entry-periodo-from');
        const fromDisplaySpan = newEntryDiv.querySelector('.from-display-span');
        const toDisplaySpan = newEntryDiv.querySelector('.to-display-span');
        const removeBtn = newEntryDiv.querySelector('.remove-entry-btn');
        const prevMonthBtn = newEntryDiv.querySelector('.prev-month-btn');
        const nextMonthBtn = newEntryDiv.querySelector('.next-month-btn');
        const editDateBtn = newEntryDiv.querySelector('.edit-date-btn');

        if (data) {
            deptoInput.value = data.depto || '';
            inquilinoInput.value = data.inquilino || '';
            montoInput.value = data.monto || '';
            periodoFromInput.value = data.periodoFrom || '';
            const fromDate = parseInputDate(periodoFromInput.value);
            data.periodoTo = fromDate ? formatDateForInput(calculateReceiptEndDate(fromDate)) : '';
            if(data.periodoFrom) fromDisplaySpan.textContent = formatDateForDisplay(data.periodoFrom);
            if(data.periodoTo) toDisplaySpan.textContent = formatDateForDisplay(data.periodoTo);
        } else {
            // Set default dates for new entries if no data provided
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            periodoFromInput.valueAsDate = firstDayOfMonth;
            const periodoTo = formatDateForInput(calculateReceiptEndDate(firstDayOfMonth));
            fromDisplaySpan.textContent = formatDateForDisplay(periodoFromInput.value);
            toDisplaySpan.textContent = formatDateForDisplay(periodoTo);
        }

        // Event Listeners
        removeBtn.addEventListener('click', () => {
            newEntryDiv.remove();
            entriesData = entriesData.filter(e => e.id !== entryId);
            saveEntries();
            updateReceiptCount();
            updateAddEntryButtonState();
        });

        prevMonthBtn.addEventListener('click', () => shiftMonth(entryId, -1));
        nextMonthBtn.addEventListener('click', () => shiftMonth(entryId, 1));
        editDateBtn.addEventListener('click', () => {
            try {
                if (typeof periodoFromInput.showPicker === 'function') {
                    periodoFromInput.showPicker();
                    return;
                }
            } catch (error) {
                // Some browsers block showPicker() on visually hidden inputs.
            }
            periodoFromInput.style.opacity = '1';
            periodoFromInput.style.pointerEvents = 'auto';
            periodoFromInput.style.width = 'auto';
            periodoFromInput.style.height = 'auto';
            periodoFromInput.addEventListener('blur', () => {
                periodoFromInput.removeAttribute('style');
            }, { once: true });
            periodoFromInput.focus();
            if (typeof periodoFromInput.click === 'function') {
                periodoFromInput.focus();
                periodoFromInput.click();
            }
        });

        [deptoInput, inquilinoInput, montoInput, periodoFromInput].forEach(input => {
            input.addEventListener('input', () => {
                const entryIndex = entriesData.findIndex(e => e.id === entryId);
                if (entryIndex > -1) {
                    entriesData[entryIndex][input.classList.contains('entry-depto') ? 'depto' :
                                        input.classList.contains('entry-inquilino') ? 'inquilino' :
                                        input.classList.contains('entry-monto') ? 'monto' :
                                        'periodoFrom'] = input.value;
                    if (input.type === 'date') {
                        syncReceiptPeriod(entryId);
                    }
                    updateEntryWarnings(entryId);
                    updateReceiptCount();
                    saveEntries();
                }
            });
        });

        entriesContainer.appendChild(newEntryDiv);
        if (!data) { // Only add to entriesData if it's a new entry not loaded from storage
             entriesData.push({
                id: entryId,
                depto: deptoInput.value,
                inquilino: inquilinoInput.value,
                monto: montoInput.value,
                periodoFrom: periodoFromInput.value,
                periodoTo: formatDateForInput(calculateReceiptEndDate(parseInputDate(periodoFromInput.value))),
            });
            saveEntries();
        }
        syncReceiptPeriod(entryId); // Initial calculation for loaded or new entries
        if (data) saveEntries();
        updateEntryWarnings(entryId);
        updateReceiptCount();
        updateAddEntryButtonState();
    }


    function addEntry(data = null) {
        if (entriesData.length >= MAX_ENTRIES) {
            alert('Se ha alcanzado el límite máximo de 30 entradas.');
            updateAddEntryButtonState();
            return;
        }
        renderEntry(data);
    }


    function shiftMonth(entryId, monthOffset) {
        const entryDiv = document.getElementById(entryId);
        if (!entryDiv) return;

        const periodoFromInput = entryDiv.querySelector('.entry-periodo-from');
        const currentFromDate = parseInputDate(periodoFromInput.value) || new Date();
        const originalDay = currentFromDate.getDate();
        let newYear = currentFromDate.getFullYear();
        let newMonth = currentFromDate.getMonth() + monthOffset;

        newYear += Math.floor(newMonth / 12);
        newMonth = (newMonth % 12 + 12) % 12;

        const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
        const newFromDate = new Date(newYear, newMonth, Math.min(originalDay, daysInNewMonth));

        periodoFromInput.value = formatDateForInput(newFromDate);
        syncReceiptPeriod(entryId);
        updateEntryWarnings(entryId);
        saveEntries();
    }

    function shiftAllMonths(monthOffset) {
        entriesData.forEach(entryData => shiftMonth(entryData.id, monthOffset));
    }

    // Enhanced function to generate receipt number
    function generateReceiptNumber() {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${year}${month}${day}-${random}`;
    }

    // Function to convert number to words in Spanish
    function numberToWords(num) {
        const ones = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
        const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
        const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
        const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

        if (num === 0) return 'cero';
        if (num === 100) return 'cien';
        if (num === 1000) return 'mil';

        let result = '';
        
        // Handle thousands
        if (num >= 1000) {
            const thousands = Math.floor(num / 1000);
            if (thousands === 1) {
                result += 'mil ';
            } else {
                result += numberToWords(thousands) + ' mil ';
            }
            num %= 1000;
        }

        // Handle hundreds
        if (num >= 100) {
            result += hundreds[Math.floor(num / 100)] + ' ';
            num %= 100;
        }

        // Handle tens and ones
        if (num >= 20) {
            result += tens[Math.floor(num / 10)];
            if (num % 10 !== 0) {
                result += ' y ' + ones[num % 10];
            }
        } else if (num >= 10) {
            result += teens[num - 10];
        } else if (num > 0) {
            result += ones[num];
        }

        return result.trim();
    }

    /* PDF STYLE REFRESH START
       Revert this block to restore the previous PDF appearance. Keeps 3 receipts per letter page. */
    function drawOfficialReceipt(doc, entry, receiptNumber, currentDate, box) {
        const { x, y, width, height } = box;
        const padding = 7;
        const right = x + width;
        const bottom = y + height;
        const innerX = x + padding;
        const innerRight = right - padding;
        const innerWidth = width - (padding * 2);
        const amount = parseFloat(entry.monto || 0);
        const amountStr = `$ ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
        const amountInWords = numberToWords(Math.floor(amount));
        const cents = amount % 1 !== 0 ? Math.round((amount % 1) * 100).toString().padStart(2, '0') : '00';
        const amountWordsStr = `${amountInWords} pesos ${cents}/100 M.N.`;
        const desde = formatDate(entry.periodoFrom);
        const hasta = formatDate(entry.periodoTo);
        const concept = `Renta del periodo de ${desde} al ${hasta}.`;
        const depto = entry.depto ? `Depto: ${entry.depto}` : '';

        doc.setFillColor(255, 252, 245);
        doc.roundedRect(x, y, width, height, 2.8, 2.8, 'F');

        doc.setDrawColor(45, 55, 72);
        doc.setLineWidth(0.75);
        doc.roundedRect(x, y, width, height, 2.8, 2.8);

        doc.setDrawColor(191, 163, 104);
        doc.setLineWidth(0.28);
        doc.roundedRect(x + 2.2, y + 2.2, width - 4.4, height - 4.4, 1.8, 1.8);

        doc.setFillColor(31, 54, 79);
        doc.roundedRect(x, y, width, 14, 2.8, 2.8, 'F');
        doc.setFillColor(31, 54, 79);
        doc.rect(x, y + 7, width, 7, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Recibo de Dinero', x + width / 2, y + 9.5, { align: 'center' });

        doc.setFillColor(191, 163, 104);
        doc.rect(x, y + 14, width, 1.2, 'F');

        doc.setTextColor(55, 55, 55);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(`Folio: ${receiptNumber}`, innerX, y + 22);
        doc.text(`Fecha: ${currentDate}`, innerRight, y + 22, { align: 'right' });

        doc.setDrawColor(216, 202, 171);
        doc.setLineWidth(0.25);
        doc.line(innerX, y + 25, innerRight, y + 25);

        doc.setFont('times', 'bold');
        doc.setTextColor(31, 54, 79);
        doc.setFontSize(10);
        doc.text('Recibí de:', innerX, y + 32);

        doc.setFont('times', 'normal');
        doc.setTextColor(35, 35, 35);
        doc.setFontSize(12);
        doc.text(entry.inquilino || 'N/A', innerX + 24, y + 32, { maxWidth: innerWidth - 62 });

        if (depto) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(88, 78, 59);
            doc.setFontSize(8.5);
            doc.text(depto, innerRight, y + 32, { align: 'right' });
        }

        doc.setFillColor(244, 237, 221);
        doc.roundedRect(innerX, y + 37, innerWidth, 14, 1.8, 1.8, 'F');
        doc.setDrawColor(216, 202, 171);
        doc.roundedRect(innerX, y + 37, innerWidth, 14, 1.8, 1.8);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(88, 78, 59);
        doc.setFontSize(8);
        doc.text('LA CANTIDAD DE', innerX + 4, y + 42.5);

        doc.setFont('times', 'bold');
        doc.setTextColor(31, 54, 79);
        doc.setFontSize(14);
        doc.text(amountStr, innerRight - 4, y + 46.3, { align: 'right' });

        doc.setFont('times', 'italic');
        doc.setTextColor(88, 88, 88);
        doc.setFontSize(8.2);
        doc.text(`(${amountWordsStr})`, innerX + 4, y + 49.2, { maxWidth: innerWidth - 8 });

        doc.setFont('times', 'bold');
        doc.setTextColor(31, 54, 79);
        doc.setFontSize(9.5);
        doc.text('Por concepto de:', innerX, y + 58);

        doc.setFont('times', 'normal');
        doc.setTextColor(35, 35, 35);
        doc.setFontSize(9.2);
        doc.text(doc.splitTextToSize(concept, innerWidth - 38), innerX + 34, y + 58);

        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.45);
        doc.line(right - 72, bottom - 13, right - 12, bottom - 13);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(55, 55, 55);
        doc.setFontSize(8.5);
        doc.text('Firma de recibido', right - 42, bottom - 8.5, { align: 'center' });

        doc.setDrawColor(191, 163, 104);
        doc.setLineWidth(0.2);
        doc.line(innerX, bottom - 6, innerRight, bottom - 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(6.5);
        doc.text('Recibo de Dinero', innerX, bottom - 2.8);
    }
    /* PDF STYLE REFRESH END */

    function printReceipts() {
        updateAllEntryWarnings();
        updateReceiptCount();
        const validEntries = entriesData.filter(e => getEntryWarnings(e).length === 0 && e.periodoTo);

        if (validEntries.length === 0) {
            alert('No hay entradas válidas para imprimir. Revise los avisos amarillos en cada recibo.');
            return;
        }

        const doc = new jsPDF({ unit: 'mm', format: 'letter' });
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 10;
        const gap = 5;
        const receiptWidth = pageWidth - (margin * 2);
        const receiptHeight = (pageHeight - (margin * 2) - (gap * 2)) / 3;

        validEntries.forEach((entry, index) => {
            if (index > 0 && index % 3 === 0) {
                doc.addPage();
            }

            const positionOnPage = index % 3;
            const receiptNumber = generateReceiptNumber();
            const currentDate = new Date().toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });

            drawOfficialReceipt(doc, entry, receiptNumber, currentDate, {
                x: margin,
                y: margin + positionOnPage * (receiptHeight + gap),
                width: receiptWidth,
                height: receiptHeight,
            });
        });

        doc.save('recibos_oficiales_alquiler.pdf');
    }





    addEntryTopBtn.addEventListener('click', () => addEntry());
    addEntryBtn.addEventListener('click', () => addEntry()); // Pass no data for new blank entry
    prevAllMonthBtn.addEventListener('click', () => shiftAllMonths(-1));
    nextAllMonthBtn.addEventListener('click', () => shiftAllMonths(1));
    printReceiptsBtn.addEventListener('click', printReceipts);

    loadEntries(); // Load entries from localStorage on page load
    if (entriesData.length === 0) { // If no entries loaded, add one by default
        addEntry();
    }
});
