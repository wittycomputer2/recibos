document.addEventListener('DOMContentLoaded', () => {
    const entriesContainer = document.getElementById('entries-container');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const printReceiptsBtn = document.getElementById('print-receipts-btn');
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
        if (entriesData.length >= MAX_ENTRIES) {
            addEntryBtn.disabled = true;
            addEntryBtn.textContent = 'Límite de entradas alcanzado';
        } else {
            addEntryBtn.disabled = false;
            addEntryBtn.textContent = 'Agregar Nueva Entrada';
        }
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
        const periodoToInput = newEntryDiv.querySelector('.entry-periodo-to');
        const fromDisplaySpan = newEntryDiv.querySelector('.from-display-span');
        const toDisplaySpan = newEntryDiv.querySelector('.to-display-span');
        const removeBtn = newEntryDiv.querySelector('.remove-entry-btn');
        const prevMonthBtn = newEntryDiv.querySelector('.prev-month-btn');
        const nextMonthBtn = newEntryDiv.querySelector('.next-month-btn');

        if (data) {
            deptoInput.value = data.depto || '';
            inquilinoInput.value = data.inquilino || '';
            montoInput.value = data.monto || '';
            periodoFromInput.value = data.periodoFrom || '';
            periodoToInput.value = data.periodoTo || '';
            // Update display spans for loaded data
            if(data.periodoFrom) fromDisplaySpan.textContent = formatDateForDisplay(data.periodoFrom);
            if(data.periodoTo) toDisplaySpan.textContent = formatDateForDisplay(data.periodoTo);
        } else {
            // Set default dates for new entries if no data provided
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            periodoFromInput.valueAsDate = firstDayOfMonth;
            periodoToInput.valueAsDate = lastDayOfMonth;
            // Update display spans for default new entry dates
            fromDisplaySpan.textContent = formatDateForDisplay(periodoFromInput.value);
            toDisplaySpan.textContent = formatDateForDisplay(periodoToInput.value);
        }

        // Event Listeners
        removeBtn.addEventListener('click', () => {
            newEntryDiv.remove();
            entriesData = entriesData.filter(e => e.id !== entryId);
            saveEntries();
            updateAddEntryButtonState();
        });

        prevMonthBtn.addEventListener('click', () => shiftMonth(entryId, -1));
        nextMonthBtn.addEventListener('click', () => shiftMonth(entryId, 1));

        [deptoInput, inquilinoInput, montoInput, periodoFromInput, periodoToInput].forEach(input => {
            input.addEventListener('input', () => {
                const entryIndex = entriesData.findIndex(e => e.id === entryId);
                if (entryIndex > -1) {
                    entriesData[entryIndex][input.classList.contains('entry-depto') ? 'depto' :
                                        input.classList.contains('entry-inquilino') ? 'inquilino' :
                                        input.classList.contains('entry-monto') ? 'monto' :
                                        input.classList.contains('entry-periodo-from') ? 'periodoFrom' : 'periodoTo'] = input.value;
                    if (input.type === 'date') {
                        const displaySpan = input.classList.contains('entry-periodo-from') ?
                                            fromDisplaySpan : // Use already queried span
                                            toDisplaySpan;   // Use already queried span
                        if (displaySpan) {
                            displaySpan.textContent = formatDateForDisplay(input.value);
                        }
                        validatePeriod(entryId);
                    }
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
                periodoTo: periodoToInput.value,
            });
            saveEntries();
        }
        validatePeriod(entryId); // Initial validation for loaded or new entries
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


    function validatePeriod(entryId) {
        const entryIndex = entriesData.findIndex(e => e.id === entryId);
        if (entryIndex === -1) return;

        const entryData = entriesData[entryIndex];
        const entryDiv = document.getElementById(entryId);
        if (!entryDiv) return;

        const periodoFromInput = entryDiv.querySelector('.entry-periodo-from');
        const periodoToInput = entryDiv.querySelector('.entry-periodo-to');

        if (periodoFromInput.value && periodoToInput.value) {
            const fromDate = new Date(periodoFromInput.value + 'T00:00:00');
            let toDate = new Date(periodoToInput.value + 'T00:00:00');

            const diffTime = Math.abs(toDate - fromDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include start day

            if (diffDays > 31) {
                const newToDate = new Date(fromDate);
                newToDate.setDate(newToDate.getDate() + 30);
                periodoToInput.valueAsDate = newToDate; // Update DOM
                entryData.periodoTo = periodoToInput.value; // Update data
                saveEntries();
            } else if (toDate < fromDate) { // Ensure ToDate is not before FromDate
                 periodoToInput.valueAsDate = fromDate;
                 entryData.periodoTo = periodoToInput.value;
                 saveEntries();
            }
        }
    }

    function shiftMonth(entryId, monthOffset) {
    const entryIndex = entriesData.findIndex(e => e.id === entryId);
    if (entryIndex === -1) return;

    const entryData = entriesData[entryIndex];
    const entryDiv = document.getElementById(entryId);
    if (!entryDiv) return;

    const periodoFromInput = entryDiv.querySelector('.entry-periodo-from');
    const periodoToInput = entryDiv.querySelector('.entry-periodo-to');

    // Get current "Desde" date
    let currentFromDate;
    if (periodoFromInput.value) {
        const parts = periodoFromInput.value.split('-');
        currentFromDate = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
        currentFromDate = new Date();
        currentFromDate.setHours(0, 0, 0, 0);
        currentFromDate.setDate(1);
    }

    // Store the original day
    const originalDay = currentFromDate.getDate();

    // Calculate new year and month
    let newYear = currentFromDate.getFullYear();
    let newMonth = currentFromDate.getMonth() + monthOffset;
    
    // Adjust year if month goes out of bounds
    newYear += Math.floor(newMonth / 12);
    newMonth = (newMonth % 12 + 12) % 12; // Ensure positive month (0-11)

    // Create new "Desde" date - this approach avoids Date's month overflow issues
    let newFromDate = new Date(newYear, newMonth, 1);
    const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    newFromDate.setDate(Math.min(originalDay, daysInNewMonth));

    // Calculate new "Hasta" date - exactly one month after newFromDate, minus one day
    let newToDate = new Date(newFromDate);
    newToDate.setMonth(newToDate.getMonth() + 1);
    newToDate.setDate(newToDate.getDate() - 1);

    // Format dates as YYYY-MM-DD
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Update DOM and data store
    periodoFromInput.value = formatDateForInput(newFromDate);
    periodoToInput.value = formatDateForInput(newToDate);

    // Update display spans
    const fromDisplaySpan = entryDiv.querySelector('.from-display-span');
    const toDisplaySpan = entryDiv.querySelector('.to-display-span');
    if (fromDisplaySpan) fromDisplaySpan.textContent = formatDateForDisplay(periodoFromInput.value);
    if (toDisplaySpan) toDisplaySpan.textContent = formatDateForDisplay(periodoToInput.value);

    entryData.periodoFrom = periodoFromInput.value;
    entryData.periodoTo = periodoToInput.value;

    saveEntries();
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

    function printReceipts() {
    const validEntries = entriesData.filter(e => e.inquilino && e.monto && e.periodoFrom && e.periodoTo);

    if (validEntries.length === 0) {
        alert('No hay entradas válidas para imprimir. Asegúrese de que Inquilino, Monto y Períodos estén completos.');
        return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 12;
    const receiptWidth = pageWidth - (margin * 2);
    const receiptHeight = 90;
    let currentY = margin;
    let receiptsOnPage = 0;

    validEntries.forEach((entry, index) => {
        if (receiptsOnPage > 0 && currentY + receiptHeight > pageHeight - margin) {
            doc.addPage();
            currentY = margin;
            receiptsOnPage = 0;
        }

        const receiptNumber = generateReceiptNumber();
        const currentDate = new Date().toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const receiptTop = currentY;
        const receiptBottom = currentY + receiptHeight;

        // === Main Border ===
        doc.setDrawColor(51, 51, 51);
        doc.setLineWidth(1.2);
        doc.rect(margin, receiptTop, receiptWidth, receiptHeight);

        // === Decorative Header Strip ===
        doc.setFillColor(240, 248, 255);
        doc.setDrawColor(240, 248, 255);
        doc.rect(margin, receiptTop, receiptWidth, 20, 'F');

        // === Decorative Corners ===
        doc.setFillColor(70, 130, 180);
        doc.circle(margin + 5, receiptTop + 5, 2, 'F');
        doc.circle(margin + receiptWidth - 5, receiptTop + 5, 2, 'F');
        doc.circle(margin + 5, receiptBottom - 5, 2, 'F');
        doc.circle(margin + receiptWidth - 5, receiptBottom - 5, 2, 'F');

        // === Content Layout ===
        let contentY = receiptTop + 8;

        // Title
        doc.setTextColor(25, 25, 112);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text('RECIBO DE PAGO', pageWidth / 2, contentY, { align: 'center' });

        // Receipt number
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`No. ${receiptNumber}`, margin + receiptWidth - 5, contentY + 5, { align: 'right' });

        contentY += 18;

        // Fecha + Recibí de
        doc.setTextColor(51, 51, 51);
        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.text('Fecha:', margin + 8, contentY);
        doc.setFont("times", "normal");
        doc.text(currentDate, margin + 25, contentY);

        doc.setFont("times", "bold");
        doc.text('Recibí de:', margin + receiptWidth / 2, contentY);
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        doc.text(`${entry.inquilino || 'N/A'}`, margin + receiptWidth / 2 + 25, contentY);

        contentY += 6;

        // === Top separator line (NOW moved BELOW header info) ===
        doc.setDrawColor(70, 130, 180);
        doc.setLineWidth(0.5);
        doc.line(margin + 8, contentY, margin + receiptWidth - 8, contentY);

        contentY += 6;

        // Amount
        const amount = parseFloat(entry.monto || 0);
        const amountStr = `$ ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
        const amountInWords = numberToWords(Math.floor(amount));
        const cents = amount % 1 !== 0 ? Math.round((amount % 1) * 100).toString().padStart(2, '0') : '00';
        const amountWordsStr = `(${amountInWords} pesos ${cents}/100 M.N.)`;

        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.setTextColor(51, 51, 51);
        doc.text('La cantidad de:', margin + 8, contentY);

        doc.setFont("times", "bold");
        doc.setFontSize(14);
        doc.setTextColor(25, 25, 112);
        doc.text(amountStr, margin + 45, contentY);

        contentY += 6;

        doc.setFont("times", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(amountWordsStr, margin + 8, contentY, { maxWidth: receiptWidth - 16 });

        contentY += 14;

        // Concept line (wrapped as requested)
        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.setTextColor(51, 51, 51);
        doc.text('Por concepto de', margin + 8, contentY);
        contentY += 6;

        const desde = formatDate(entry.periodoFrom);
        const hasta = formatDate(entry.periodoTo);
        doc.text(`renta desde ${desde} hasta ${hasta}`, margin + 8, contentY);

        contentY += 18;

        // Signature line
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51);
        doc.text('Firma:', margin + receiptWidth - 80, receiptBottom - 14);

        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.8);
        doc.line(margin + receiptWidth - 65, receiptBottom - 11, margin + receiptWidth - 8, receiptBottom - 11);

        currentY += receiptHeight + 8;
        receiptsOnPage++;
    });

    doc.save('recibos_oficiales_alquiler.pdf');
}





    addEntryBtn.addEventListener('click', () => addEntry()); // Pass no data for new blank entry
    printReceiptsBtn.addEventListener('click', printReceipts);

    loadEntries(); // Load entries from localStorage on page load
    if (entriesData.length === 0) { // If no entries loaded, add one by default
        addEntry();
    }
});
