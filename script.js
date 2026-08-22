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

            // دالة إصلاح شكل التاريخ (التعديل الأول: ضمان خروج التاريخ بصيغة dd/mm/yyyy)
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
                        // الإكسل عادة يصدر الشهر أولاً إلا إذا كان الرقم الأول أكبر من 12
                        if (p1 > 12) {
                            day = p1;
                            month = p2;
                        } else {
                            month = p1; // الشهر هو الأول
                            day = p2;   // اليوم هو الثاني
                        }
                        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                    }
                }
                return str;
            };

            const groupedData = {};

            jsonData.forEach((row) => {
                const typeRaw = row["F"];
                const transDateRaw = row["I"]; // 1. تاريخ العملية
                const timeRaw = row["M"];      // 3. وقت الموازنة
                const settlementRaw = row["R"];// 2. تاريخ التسوية

                if (!typeRaw || !transDateRaw) return;

                const type = typeRaw.toString().trim().toUpperCase();
                
                // تنظيف تاريخ العملية
                let rawDateStr = transDateRaw.toString().trim().split(" ")[0];
                let transDateStr = formatDate(rawDateStr); 

                // تجهيز تاريخ التسوية (وإذا كان فارغ نضع له قيمة افتراضية حتى لا يتم تجاهله)
                let settlementStr = settlementRaw ? settlementRaw.toString().trim() : "بدون تاريخ تسوية";

                // تنظيف وقت الموازنة
                let timeStr = timeRaw ? timeRaw.toString().trim().replace(/\.000$/, '') : "توقيت غير محدد";

                const fee = parseAmount(row["O"]);
                const value = parseAmount(row["P"]);
                const vat = parseAmount(row["Y"]);

                // بناء الهيكلية الجديدة ذات الـ 4 مستويات
                if (!groupedData[transDateStr]) {
                    groupedData[transDateStr] = {};
                }

                if (!groupedData[transDateStr][settlementStr]) {
                    groupedData[transDateStr][settlementStr] = {};
                }

                if (!groupedData[transDateStr][settlementStr][timeStr]) {
                    groupedData[transDateStr][settlementStr][timeStr] = {};
                }

                if (!groupedData[transDateStr][settlementStr][timeStr][type]) {
                    groupedData[transDateStr][settlementStr][timeStr][type] = {
                        totalValue: 0,
                        totalFee: 0,
                        totalVat: 0,
                    };
                }

                groupedData[transDateStr][settlementStr][timeStr][type].totalValue += value;
                groupedData[transDateStr][settlementStr][timeStr][type].totalFee += fee;
                groupedData[transDateStr][settlementStr][timeStr][type].totalVat += vat;
            });

            // البيانات الثابتة
            const debitAccounts =[
                { acc: "1321", note: "مجموع سحوبات " },
                { acc: "5211", note: "مصاريف " },
                { acc: "5211", note: "ضريبة مصاريف " },
            ];
            const creditAccounts =[
                { acc: accountNumber, note: "مجموع سحوبات " },
                { acc: "1321", note: "مصاريف " },
                { acc: "1321", note: "ضريبة مصاريف " },
            ];

            // ترتيب تواريخ العملية
            const sortedTransDates = Object.keys(groupedData).sort((a, b) => {
                const partsA = a.split("/");
                const partsB = b.split("/");
                if (partsA.length === 3 && partsB.length === 3) {
                    return new Date(partsA[2], partsA[1] - 1, partsA[0]) -
                           new Date(partsB[2], partsB[1] - 1, partsB[0]);
                }
                return 0;
            });

            let finalHtml = "";

            // الحلقة الأولى: تاريخ العملية
            sortedTransDates.forEach((transDateKey) => {
                const settlementObj = groupedData[transDateKey];
                
                // ترتيب تواريخ التسوية (مثل 20260404 ثم 20260405)
                const sortedSettlements = Object.keys(settlementObj).sort();

                // الحلقة الثانية: تاريخ التسوية
                sortedSettlements.forEach((settlementKey) => {
                    const timesObj = settlementObj[settlementKey];
                    
                    // ترتيب الأوقات
                    const sortedTimes = Object.keys(timesObj).sort();

                    // الحلقة الثالثة: أوقات الموازنة
                    sortedTimes.forEach((timeKey) => {
                        const cardData = timesObj[timeKey];

                        // --- التعديل الثاني يبدأ هنا: حساب تاريخ السند من تاريخ التسوية ---
                        let sanadDate = "";
                        
                        // التحقق من أن تاريخ التسوية موجود وبصيغة YYYYMMDD (طوله 8 أرقام)
                        if (settlementKey !== "بدون تاريخ تسوية" && settlementKey.toString().trim().length === 8) {
                            const sStr = settlementKey.toString().trim();
                            const y = parseInt(sStr.substring(0, 4));
                            const m = parseInt(sStr.substring(4, 6)) - 1; // الأشهر تبدأ من صفر برمجياً
                            const d = parseInt(sStr.substring(6, 8));
                            
                            let sDateObj = new Date(y, m, d);
                            
                            // إذا كانت الساعة 23:59:59 نضيف يوم
                            if (timeKey === "23:59:59") {
                                // sDateObj.setDate(sDateObj.getDate() + 1);
                                // تم التعديل بسبب إلغاء زيادة اليوم
                                sDateObj.setDate(sDateObj.getDate());
                            }
                            
                            // تحويله لصيغة DD/MM/YYYY
                            sanadDate = `${sDateObj.getDate().toString().padStart(2, '0')}/${(sDateObj.getMonth() + 1).toString().padStart(2, '0')}/${sDateObj.getFullYear()}`;
                        } else {
                            // في حال كان الحقل فارغاً، نعتمد على تاريخ العملية كاحتياط
                            sanadDate = transDateKey;
                            if (timeKey === "23:59:59") {
                                const parts = transDateKey.split('/');
                                if (parts.length === 3) {
                                    let dObj = new Date(parts[2], parts[1] - 1, parts[0]);
                                    dObj.setDate(dObj.getDate() + 1);
                                    sanadDate = `${dObj.getDate().toString().padStart(2, '0')}/${(dObj.getMonth() + 1).toString().padStart(2, '0')}/${dObj.getFullYear()}`;
                                }
                            }
                        }
                        // --- التعديل الثاني ينتهي هنا ---

                        // حاوية السند
                        let dateBlockHtml = `<div class="date-container">
                                                <div class="date-header" style="background-color: #2563eb; color: white; padding: 10px; border-bottom: 2px solid #ccc; border-radius: 5px;">
                                                    تاريخ العملية: <strong>${transDateKey}</strong> | تاريخ التسوية: <strong>${settlementKey}</strong> | وقت الموازنة: <strong>${timeKey}</strong><br>
                                                    تاريخ السند: <strong>${sanadDate}</strong>
                                                </div>`;

                        let hasContent = false;

                        // الحلقة الرابعة: أنواع البطاقات لإنشاء الجداول
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
                                        <div class="card-type-header" style="color: #333; margin-bottom: 5px; font-weight: bold;">نوع البطاقة: ${cardType}</div>
                                        <table border="1" style="width: 100%; border-collapse: collapse; text-align: center;">
                                            <thead style="background-color: #f8f9fa;">
                                                <tr><th>مدين</th><th>دائن</th><th>اسم الحساب</th><th>ملاحظة</th></tr>
                                            </thead>
                                            <tbody>
                                                ${tableRows}
                                            </tbody>
                                        </table>
                                    </div>`;
                            }
                        }

                        dateBlockHtml += `</div><br>`;

                        if (hasContent) {
                            finalHtml += dateBlockHtml;
                        }
                    });
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
