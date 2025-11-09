document.getElementById("analyze").addEventListener("click", () => {
   const types = document.getElementById("types").value.trim().split(/\n+/);
   const values = document
      .getElementById("values")
      .value.trim()
      .split(/\n+/)
      .map(Number);
   const fees = document
      .getElementById("fees")
      .value.trim()
      .split(/\n+/)
      .map(Number);

   if (types.length !== values.length || types.length !== fees.length) {
      alert("عدد الأسطر في القوائم الثلاث يجب أن يكون متساويًا!");
      return;
   }

   // التجميع حسب نوع البطاقة
   const data = {};
   for (let i = 0; i < types.length; i++) {
      const t = types[i].trim().toUpperCase();
      if (!data[t]) data[t] = { totalValue: 0, totalFee: 0 };
      data[t].totalValue += values[i];
      data[t].totalFee += fees[i];
   }
   console.log(data);

   // إنشاء الجدول
   let html = `
  <table>
    <thead>
      <tr>
        <th>مدين</th>
        <th>دائن</th>
        <th>اسم الحساب</th>
        <th>ملاحظة</th>
      </tr>
    </thead>
    <tbody>
  `;

   const VAT_DIV = 6.6666666667;
   let accNumbers = [1321, 5211, 126, 1331, 1321, 1321];
   let info = [
      " مجموع سحوبات الفيزا",
      " مصاريف فيزا",
      " ضريبة مصاريف فيزا",
      " مجموع سحوبات الفيزا",
      " مصاريف فيزا",
      " ضريبة مصاريف فيزا",
   ];
   for (const accNumIndex in accNumbers) {
      if (!Object.hasOwn(accNumbers, accNumIndex)) continue;

      for (const [type, v] of Object.entries(data)) {
         const vat = +(v.totalFee / VAT_DIV).toFixed(2);
         const accNumber = accNumbers[accNumIndex];

         html += `
                    <tr>`;
         if (accNumIndex < 3) {
            html += `
   <td>${v.totalValue.toFixed(2)}</td>
   <td>0</td>
   `;
         } else {
            html += `
     <td>0</td>
   <td>${v.totalValue.toFixed(2)}</td>
   `;
         }
         html += `
                    <td>${accNumber}</td>
                        <td>${info[accNumIndex] + type}</td>
                        </tr>
                   
        `;
      }
   }

   html += "</tbody></table>";
   const accountNumber = document.getElementById("accountSelect").value;

   html = `<table>
   <thead>
      <tr>
        <th>مدين</th>
        <th>دائن</th>
        <th>اسم الحساب</th>
        <th>ملاحظة</th>
      </tr>
    </thead>
   <tbody>
      <tr>
         <td>${data.SPAN.totalValue}</td>
         <td>0</td>

         <td>1321</td>
         <td>مجموع سحوبات الفيزا SPAN</td>
      </tr>

      <tr>
         <td>${data.MASTER_CARD.totalValue}</td>
         <td>0</td>

         <td>1321</td>
         <td>مجموع سحوبات الفيزا MASTER_CARD</td>
      </tr>

      <tr>
         <td>${data.VISA.totalValue}</td>
         <td>0</td>

         <td>1321</td>
         <td>مجموع سحوبات الفيزا VISA</td>
      </tr>

      <tr>
         <td>${data.SPAN.totalFee}</td>
         <td>0</td>

         <td>5211</td>
         <td>مصاريف فيزا SPAN</td>
      </tr>

      <tr>
         <td>${data.MASTER_CARD.totalFee}</td>
         <td>0</td>

         <td>5211</td>
         <td>مصاريف فيزا MASTER_CARD</td>
      </tr>

      <tr>
         <td>${data.VISA.totalFee}</td>
         <td>0</td>

         <td>5211</td>
         <td>مصاريف فيزا VISA</td>
      </tr>

      <tr>
         <td>${(data.SPAN.totalFee / VAT_DIV).toFixed(2)}</td>
         <td>0</td>

         <td>126</td>
         <td>ضريبة مصاريف فيزا SPAN</td>
      </tr>

      <tr>
         <td>${(data.MASTER_CARD.totalFee / VAT_DIV).toFixed(2)}</td>
         <td>0</td>

         <td>126</td>
         <td>ضريبة مصاريف فيزا MASTER_CARD</td>
      </tr>

      <tr>
         <td>${(data.VISA.totalFee / VAT_DIV).toFixed(2)}</td>
         <td>0</td>

         <td>126</td>
         <td>ضريبة مصاريف فيزا VISA</td>
      </tr>
      <tr>
         <td>0</td>
         <td>${data.SPAN.totalValue}</td>
         <td>${accountNumber}</td>
         <td>مجموع سحوبات الفيزا SPAN</td>
      </tr>

      <tr>
         <td>0</td>
         <td>${data.MASTER_CARD.totalValue}</td>
         <td>${accountNumber}</td>
         <td>مجموع سحوبات الفيزا MASTER_CARD</td>
      </tr>

      <tr>
         <td>0</td>
         <td>${data.VISA.totalValue}</td>
         <td>${accountNumber}</td>
         <td>مجموع سحوبات الفيزا VISA</td>
      </tr>

      <tr>
         <td>0</td>
         <td>${data.SPAN.totalFee}</td>
         <td>1321</td>
         <td>مصاريف فيزا SPAN</td>
      </tr>

      <tr>
         <td>0</td>
         <td>${data.MASTER_CARD.totalFee}</td>
         <td>1321</td>
         <td>مصاريف فيزا MASTER_CARD</td>
      </tr>

      <tr>
         <td>0</td>
         <td>${data.VISA.totalFee}</td>
         <td>1321</td>
         <td>مصاريف فيزا VISA</td>
      </tr>

      <tr>
         <td>0</td>
         <td>${(data.SPAN.totalFee / VAT_DIV).toFixed(2)}</td>
         <td>1321</td>
         <td>ضريبة مصاريف فيزا SPAN</td>
      </tr>

      <tr>
         <td>0</td>
         <td>${(data.MASTER_CARD.totalFee / VAT_DIV).toFixed(2)}</td>
         <td>1321</td>
         <td>ضريبة مصاريف فيزا MASTER_CARD</td>
      </tr>

      <tr>
         <td>0</td>
         <td>${(data.VISA.totalFee / VAT_DIV).toFixed(2)}</td>
         <td>1321</td>
         <td>ضريبة مصاريف فيزا VISA</td>
      </tr>
   </tbody>
   <table></table>
</table>
`;

   document.getElementById("results").innerHTML = html;
});
