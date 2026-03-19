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

            // عدنا لاستخدام raw: false لقراءة النصوص كما هي
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

            // دالة لتحويل النصوص المالية إلى أرقام
            const parseAmount = (val) => {
                if (!val) return 0;
                let cleanStr = val.toString().replace(/,/g, '').trim();
                return parseFloat(cleanStr) || 0;
            };

            // دالة إصلاح شكل التاريخ
            const formatDate = (dateStr) => {
                if (!dateStr) return "";
                const str = dateStr.toString().trim();
                
                if (str.includes('/')) {
                    const parts = str.split('/');
                    if (parts.length === 3) {
                        let p1 = parseInt(parts[0]);
                        let p2 = parseInt(parts[1]);
                        let year = parseInt(parts[2]);

                        if (year < 100) year += 2000;

                        let day, month;
                        if (p2 > 12) {
                            day = p2;
                            month = p1;
                        } else {
                            day = p1;
                            month = p2;
                        }
                        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                    }
                }
                return str;
            };

            const groupedData = {};

            jsonData.forEach((row) => {
                const typeRaw = row["F"];
                const dateRaw = row["L"]; 
                const timeRaw = row["M"]; 

                if (!typeRaw || !dateRaw) return;

                const type = typeRaw.toString().trim().toUpperCase();
                
                let rawDateStr = dateRaw.toString().trim().split(" ")[0];
                let dateStr = formatDate(rawDateStr); 

                let timeStr = timeRaw ? timeRaw.toString().trim().replace(/\.000$/, '') : "توقيت غير محدد";

                const fee = parseAmount(row["O"]);
                const value = parseAmount(row["P"]);
                const vat = parseAmount(row["X"]);

                if (!groupedData[dateStr]) {
                    groupedData[dateStr] = {};
                }

                if (!groupedData[dateStr][timeStr]) {
                    groupedData[dateStr][timeStr] = {};
                }

                if (!groupedData[dateStr][timeStr][type]) {
                    groupedData[dateStr][timeStr][type] = {
                        totalValue: 0,
                        totalFee: 0,
                        totalVat: 0,
                    };
                }

                groupedData[dateStr][timeStr][type].totalValue += value;
                groupedData[dateStr][timeStr][type].totalFee += fee;
                groupedData[dateStr][timeStr][type].totalVat += vat;
            });

            // البيانات الثابتة
            const debitAccounts =[
                { acc: "1321", note: "مجموع سحوبات " },
                { acc: "5211", note: "مصاريف " },
                { acc: "126", note: "ضريبة مصاريف " },
            ];
            const creditAccounts =[
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
                const timesObj = groupedData[dateKey];
                
                const sortedTimes = Object.keys(timesObj).sort();

                sortedTimes.forEach((timeKey) => {
                    const cardData = timesObj[timeKey];

                    // --- التعديل الجديد يبدأ هنا ---
                    // حساب تاريخ السند
                    let sanadDate = dateKey;
                    if (timeKey === "23:59:59") {
                        const parts = dateKey.split('/');
                        if (parts.length === 3) {
                            let d = new Date(parts[2], parts[1] - 1, parts[0]);
                            d.setDate(d.getDate() + 1); // إضافة يوم واحد
                            sanadDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
                        }
                    }

                    // حاوية التاريخ والوقت مع التعديل الجديد
                    let dateBlockHtml = `<div class="date-container">
                                            <div class="date-header" style="background-color: #2563eb; padding: 10px; border-bottom: 2px solid #ccc;">
                                                تاريخ الموازنة: <strong>${dateKey}</strong> | وقت الموازنة: <strong>${timeKey}</strong><br>
                                                تاريخ السند: <strong>${sanadDate}</strong>
                                            </div>`;
                    // --- التعديل الجديد ينتهي هنا ---

                    let hasContent = false;

                    for (const [cardType, v] of Object.entries(cardData)) {
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
                                <div class="card-type-container" style="margin: 10px;">
                                    <div class="card-type-header" style="color: #333; margin-bottom: 5px;">نوع البطاقة: ${cardType}</div>
                                    <table border="1" style="width: 100%; border-collapse: collapse; text-align: center;">
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
