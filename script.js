document.getElementById("analyze").addEventListener("click", () => {
    const fileInput = document.getElementById("excelFile");
    const errorMsg = document.getElementById("errorMsg");
    const resultsDiv = document.getElementById("results");
    const accountNumber = document.getElementById("accountSelect").value;

    // تنظيف النتائج السابقة
    resultsDiv.innerHTML = "";
    errorMsg.textContent = "";

    if (!fileInput.files.length) {
        errorMsg.textContent = "يرجى اختيار ملف إكسل أولاً!";
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            // قراءة الورقة الأولى
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // عدنا لاستخدام raw: false لقراءة النصوص كما هي (مثل 1/25/26)
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                header: "A",
                range: 16,
                defval: "",
                raw: false 
            });

            if (jsonData.length === 0) {
                errorMsg.textContent = "لم يتم العثور على بيانات في الجدول بدءاً من السطر 17.";
                return;
            }

            // دالة لتحويل النصوص المالية (مثل "1,200.50") إلى أرقام
            const parseAmount = (val) => {
                if (!val) return 0;
                let cleanStr = val.toString().replace(/,/g, '').trim();
                return parseFloat(cleanStr) || 0;
            };

            // --- دالة جديدة فقط لإصلاح شكل التاريخ ---
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const str = dateStr.toString().trim();
                
                // إذا كان التاريخ يحتوي على / (مثل 1/25/26)
                if (str.includes('/')) {
                    const parts = str.split('/'); // يقطع النص إلى [1, 25, 26]
                    
                    // إذا كان لدينا 3 أجزاء
                    if (parts.length === 3) {
                        let p1 = parseInt(parts[0]); // غالباً الشهر أو اليوم
                        let p2 = parseInt(parts[1]); // غالباً اليوم أو الشهر
                        let year = parseInt(parts[2]); // السنة

                        // تحويل السنة من 26 إلى 2026
                        if (year < 100) year += 2000;

                        // تحديد أيهما اليوم وأيهما الشهر
                        // بما أنك رأيت 1/25/26 فالجزء الثاني (25) هو قطعاً اليوم لأن الشهر لا يتجاوز 12
                        let day, month;
                        
                        if (p2 > 12) {
                            // التنسيق هو: شهر/يوم/سنة (النظام الأمريكي)
                            day = p2;
                            month = p1;
                        } else {
                            // نفترض التنسيق: يوم/شهر/سنة (أو نتركها كما هي إذا كان كلاهما أصغر من 12)
                            day = p1;
                            month = p2;
                        }

                        // إعادة الترتيب ليصبح DD/MM/YYYY
                        // padStart(2, '0') تضمن إضافة صفر لليسار للأرقام الفردية (1 تصبح 01)
                        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                    }
                }
                // إذا لم يكن يحتوي على / نعيده كما هو
                return str;
            };
            // ------------------------------------------

            const groupedData = {};

            jsonData.forEach((row) => {
                const typeRaw = row["F"];
                const dateRaw = row["I"];

                if (!typeRaw || !dateRaw) return;

                const type = typeRaw.toString().trim().toUpperCase();
                
                // تنظيف التاريخ من الوقت واستخدام الدالة الجديدة للإصلاح
                let rawDateStr = dateRaw.toString().trim().split(" ")[0];
                let dateStr = formatDate(rawDateStr); // هنا يتم التحويل إلى 25/01/2026

                const fee = parseAmount(row["O"]);
                const value = parseAmount(row["P"]);
                const vat = parseAmount(row["X"]);

                if (!groupedData[dateStr]) {
                    groupedData[dateStr] = {};
                }

                if (!groupedData[dateStr][type]) {
                    groupedData[dateStr][type] = {
                        totalValue: 0,
                        totalFee: 0,
                        totalVat: 0,
                    };
                }

                groupedData[dateStr][type].totalValue += value;
                groupedData[dateStr][type].totalFee += fee;
                groupedData[dateStr][type].totalVat += vat;
            });

            // البيانات الثابتة
            const debitAccounts = [
                { acc: "1321", note: "مجموع سحوبات " },
                { acc: "5211", note: "مصاريف " },
                { acc: "126", note: "ضريبة مصاريف " },
            ];
            const creditAccounts = [
                { acc: accountNumber, note: "مجموع سحوبات " },
                { acc: "1321", note: "مصاريف " },
                { acc: "1321", note: "ضريبة مصاريف " },
            ];

            // ترتيب التواريخ
            const sortedDates = Object.keys(groupedData).sort((a, b) => {
                const partsA = a.split("/");
                const partsB = b.split("/");
                if (partsA.length === 3 && partsB.length === 3) {
                    return new Date(partsA[2], partsA[1] - 1, partsA[0]) -
                           new Date(partsB[2], partsB[1] - 1, partsB[0]);
                }
                return 0;
            });

            let finalHtml = "";

            sortedDates.forEach((dateKey) => {
                const dayData = groupedData[dateKey];
                
                // حاوية اليوم
                let dateBlockHtml = `<div class="date-container">
                                        <div class="date-header">تاريخ العملية: ${dateKey}</div>`;

                let hasContent = false;

                // حاويات أنواع البطاقات
                for (const [cardType, v] of Object.entries(dayData)) {
                    const totalValue = v.totalValue;
                    const totalFee = v.totalFee;
                    const totalVat = v.totalVat;

                    let tableRows = "";

                    // مدين
                    if (totalValue > 0) tableRows += `<tr><td>${totalValue.toFixed(2)}</td><td>0</td><td>${debitAccounts[0].acc}</td><td>${debitAccounts[0].note} ${cardType}</td></tr>`;
                    if (totalFee > 0)   tableRows += `<tr><td>${totalFee.toFixed(2)}</td><td>0</td><td>${debitAccounts[1].acc}</td><td>${debitAccounts[1].note} ${cardType}</td></tr>`;
                    if (totalVat > 0)   tableRows += `<tr><td>${totalVat.toFixed(2)}</td><td>0</td><td>${debitAccounts[2].acc}</td><td>${debitAccounts[2].note} ${cardType}</td></tr>`;

                    // دائن
                    if (totalValue > 0) tableRows += `<tr><td>0</td><td>${totalValue.toFixed(2)}</td><td>${creditAccounts[0].acc}</td><td>${creditAccounts[0].note} ${cardType}</td></tr>`;
                    if (totalFee > 0)   tableRows += `<tr><td>0</td><td>${totalFee.toFixed(2)}</td><td>${creditAccounts[1].acc}</td><td>${creditAccounts[1].note} ${cardType}</td></tr>`;
                    if (totalVat > 0)   tableRows += `<tr><td>0</td><td>${totalVat.toFixed(2)}</td><td>${creditAccounts[2].acc}</td><td>${creditAccounts[2].note} ${cardType}</td></tr>`;

                    if (tableRows) {
                        hasContent = true;
                        dateBlockHtml += `
                            <div class="card-type-container">
                                <div class="card-type-header">نوع البطاقة: ${cardType}</div>
                                <table>
                                    <thead>
                                        <tr><th>مدين</th><th>دائن</th><th>اسم الحساب</th><th>ملاحظة</th></tr>
                                    </thead>
                                    <tbody>
                                        ${tableRows}
                                    </tbody>
                                </table>
                            </div>`;
                    }
                }

                dateBlockHtml += `</div>`;

                if (hasContent) {
                    finalHtml += dateBlockHtml;
                }
            });

            if (finalHtml === "") {
                resultsDiv.innerHTML = "<p style='text-align:center'>لم يتم العثور على عمليات صالحة للعرض.</p>";
            } else {
                resultsDiv.innerHTML = finalHtml;
            }

        } catch (err) {
            console.error(err);
            errorMsg.textContent = "حدث خطأ أثناء قراءة الملف.";
        }
    };

    reader.readAsArrayBuffer(file);
});