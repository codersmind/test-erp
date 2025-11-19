// POS Receipt Template (80mm) - Simplified compact layout
export const POS_TEMPLATE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt</title>
  <style>
    {{CSS}}
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      {{#if companyName}}
      <h1>{{companyName}}</h1>
      {{/if}}
      {{#if companyAddress}}
      <p class="address">{{companyAddress}}</p>
      {{/if}}
      {{#if companyPhone}}
      <p>Ph: {{companyPhone}}</p>
      {{/if}}
      {{#if companyGst}}
      <p>GST: {{companyGst}}</p>
      {{/if}}
    </div>
    
    <div class="invoice-title">
      <h2>{{type}}</h2>
      <p>#{{orderId}}</p>
    </div>
    
    <div class="info-section">
      <div class="bill-to">
        <p><strong>{{billToLabel}}:</strong> {{customerName}}</p>
      </div>
      <div class="order-details">
        <p>Date: {{orderDate}}</p>
        {{#if dueDate}}
        <p>Due: {{dueDate}}</p>
        {{/if}}
        <p>Status: {{status}}</p>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th class="text-right">Qty</th>
          {{#if showDiscount}}
          <th class="text-right">MRP</th>
          <th class="text-right">Price</th>
          <th class="text-right">Disc</th>
          {{else}}
          <th class="text-right">Price</th>
          {{/if}}
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td>{{productName}}</td>
          <td class="text-right">{{quantity}}</td>
          {{#if ../showDiscount}}
          <td class="text-right mrp-cell">
            {{#if mrp}}
            <span class="mrp-strikethrough">{{mrp}}</span>
            {{#if discountPercent}}
            <br><span class="discount-percent">{{discountPercent}}</span>
            {{/if}}
            {{else}}
            -
            {{/if}}
          </td>
          <td class="text-right">{{salePrice}}</td>
          <td class="text-right">{{discount}}</td>
          {{else}}
          <td class="text-right">{{unitPrice}}</td>
          {{/if}}
          <td class="text-right">{{lineTotal}}</td>
        </tr>
        {{/each}}
      </tbody>
    </table>
    
    <div class="totals">
      <div class="totals-row">
        <span>Subtotal:</span>
        <span>{{subtotal}}</span>
      </div>
      {{#if discount}}
      <div class="totals-row">
        <span>Discount:</span>
        <span>-{{discount}}</span>
      </div>
      {{/if}}
      {{#if cgst}}
      <div class="totals-row">
        <span>CGST:</span>
        <span>{{cgst}}</span>
      </div>
      <div class="totals-row">
        <span>SGST:</span>
        <span>{{sgst}}</span>
      </div>
      {{else if tax}}
      <div class="totals-row">
        <span>GST:</span>
        <span>{{tax}}</span>
      </div>
      {{/if}}
      <div class="totals-row total">
        <span>Total:</span>
        <span>{{total}}</span>
      </div>
      {{#if paidAmount}}
      <div class="totals-row">
        <span>Paid:</span>
        <span>{{paidAmount}}</span>
      </div>
      {{/if}}
      {{#if dueAmount}}
      <div class="totals-row" style="color: #dc2626; font-weight: bold;">
        <span>Due:</span>
        <span>{{dueAmount}}</span>
      </div>
      {{/if}}
    </div>
    
    {{#if footerText}}
    <div class="footer">
      <p>{{footerText}}</p>
    </div>
    {{/if}}
  </div>
</body>
</html>`

export const POS_TEMPLATE_CSS = `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  font-size: 9px;
  color: #333;
  padding: 5mm;
  width: 80mm;
  max-width: 80mm;
}

.invoice {
  width: 100%;
  background: white;
}

.header {
  text-align: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #000;
}

.header h1 {
  font-size: 14px;
  margin-bottom: 4px;
  font-weight: bold;
}

.header p {
  margin: 2px 0;
  font-size: 8px;
  line-height: 1.2;
}

.invoice-title {
  text-align: center;
  margin: 8px 0;
}

.invoice-title h2 {
  font-size: 12px;
  margin-bottom: 2px;
  font-weight: bold;
}

.invoice-title p {
  font-size: 9px;
}

.info-section {
  margin-bottom: 8px;
  font-size: 8px;
}

.info-section p {
  margin: 2px 0;
  font-size: 8px;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 8px;
  table-layout: fixed;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.items-table th,
.items-table td {
  padding: 3px 1px;
  border-bottom: 1px dashed #ccc;
  text-align: left;
  vertical-align: top;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
  font-size: 7px;
  white-space: normal;
  overflow: hidden;
  hyphens: auto;
}

.items-table th {
  font-weight: bold;
  font-size: 7px;
  white-space: normal;
  line-height: 1.1;
  border-bottom: 1px solid #000;
  overflow: hidden;
}

.items-table th:first-child,
.items-table td:first-child {
  width: 30%;
  padding-left: 1px;
  max-width: 30%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.items-table th:nth-child(2),
.items-table td:nth-child(2) {
  width: 10%;
  max-width: 10%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.items-table th:nth-child(3),
.items-table td:nth-child(3) {
  width: 20%;
  max-width: 20%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.items-table th:nth-child(4),
.items-table td:nth-child(4) {
  width: 20%;
  max-width: 20%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.items-table th:nth-child(5),
.items-table td:nth-child(5) {
  width: 10%;
  max-width: 10%;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.items-table th:last-child,
.items-table td:last-child {
  width: 10%;
  max-width: 10%;
  padding-right: 1px;
  overflow: hidden;
  word-wrap: break-word;
  overflow-wrap: break-word;
  word-break: break-word;
}

.items-table .text-right {
  text-align: right;
  white-space: normal;
}

.items-table .mrp-cell {
  line-height: 1.2;
  white-space: normal;
  font-size: 6px;
}

.items-table .mrp-strikethrough {
  text-decoration: line-through;
  color: #666;
  display: block;
  font-size: 6px;
}

.items-table .discount-percent {
  color: #2563eb;
  font-weight: 500;
  font-size: 6px;
  display: block;
  margin-top: 1px;
}

.totals {
  margin-top: 8px;
  border-top: 1px solid #000;
  padding-top: 4px;
  width: 100%;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  margin: 2px 0;
  font-size: 8px;
  padding: 2px 0;
  border-bottom: 1px dashed #ccc;
}

.totals-row span:first-child {
  font-weight: 500;
}

.totals-row span:last-child {
  text-align: right;
  font-weight: 500;
}

.totals-row.total {
  font-weight: bold;
  font-size: 10px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
}

.totals-row.total span {
  font-weight: bold;
}

.footer {
  text-align: center;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #ccc;
  font-size: 8px;
  font-style: italic;
}

@media print {
  body {
    padding: 0;
    margin: 0;
  }
  
  @page {
    size: 80mm auto;
    margin: 0;
  }
}`

