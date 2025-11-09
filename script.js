document.getElementById("analyze").addEventListener("click", () => {
  // قراءة البيانات وتنظيف الأسطر الفارغة
  const types = document.getElementById("types").value
    .split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const values = document.getElementById("values").value
    .split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(Number);
  const fees = document.getElementById("fees").value
    .split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(Number);

  if (types.length !== values.length || types.length !== fees.length) {
    alert("عدد الأسطر في القوائم الثلاث يجب أن يكون متساويًا!");
    return;
  }

  const accountNumber = document.getElementById("accountSelect").value;
  const VAT_DIV = 6.6666666667;

  // تجميع البيانات حسب نوع البطاقة
  const data = {};
  for (let i = 0; i < types.length; i++) {
    const t = types[i].toUpperCase();
    if (!data[t]) data[t] = { totalValue: 0, totalFee: 0 };
    data[t].totalValue += values[i];
    data[t].totalFee += fees[i];
  }

  // حسابات ثابتة كما هي في جدولك
  const debitAccounts = [
    { acc: '1321', note: 'مجموع سحوبات الفيزا' },
    { acc: '5211', note: 'مصاريف فيزا' },
    { acc: '126', note: 'ضريبة مصاريف فيزا' }
  ];
  const creditAccounts = [
    { acc: accountNumber, note: 'مجموع سحوبات الفيزا' },
    { acc: '1321', note: 'مصاريف فيزا' },
    { acc: '1321', note: 'ضريبة مصاريف فيزا' }
  ];

  let html = `<table>
    <thead>
      <tr><th>مدين</th><th>دائن</th><th>اسم الحساب</th><th>ملاحظة</th></tr>
    </thead>
    <tbody>`;

  for (const [type, v] of Object.entries(data)) {
    const totalValue = Number(v.totalValue || 0);
    const totalFee = Number(v.totalFee || 0);
    const vat = Number((totalFee / VAT_DIV) || 0);

    // صفوف مدين: إظهار فقط إذا القيمة > 0
    if (totalValue > 0) html += `<tr><td>${totalValue.toFixed(2)}</td><td>0</td><td>${debitAccounts[0].acc}</td><td>${debitAccounts[0].note} ${type}</td></tr>`;
    if (totalFee > 0) html += `<tr><td>${totalFee.toFixed(2)}</td><td>0</td><td>${debitAccounts[1].acc}</td><td>${debitAccounts[1].note} ${type}</td></tr>`;
    if (vat > 0) html += `<tr><td>${vat.toFixed(2)}</td><td>0</td><td>${debitAccounts[2].acc}</td><td>${debitAccounts[2].note} ${type}</td></tr>`;

    // صفوف دائن: إظهار فقط إذا القيمة > 0
    if (totalValue > 0) html += `<tr><td>0</td><td>${totalValue.toFixed(2)}</td><td>${creditAccounts[0].acc}</td><td>${creditAccounts[0].note} ${type}</td></tr>`;
    if (totalFee > 0) html += `<tr><td>0</td><td>${totalFee.toFixed(2)}</td><td>${creditAccounts[1].acc}</td><td>${creditAccounts[1].note} ${type}</td></tr>`;
    if (vat > 0) html += `<tr><td>0</td><td>${vat.toFixed(2)}</td><td>${creditAccounts[2].acc}</td><td>${creditAccounts[2].note} ${type}</td></tr>`;
  }

  html += `</tbody></table>`;
  document.getElementById("results").innerHTML = html;
});
