import{j as t}from"./ui-B0dVR9sq.js";import{c as $,r as b}from"./vendor-CcMVubkO.js";import{D as _,a as N,b as C,c as T}from"./dialog-B1KPmWeL.js";import{B as j}from"./button-kdzosmPg.js";import{t as g}from"./custom-toast-De62EEW_.js";import{u as P}from"./useTranslation-BR6OJjUf.js";import{R as k}from"./smartphone-Ds4lU5x7.js";import{P as F}from"./printer-BDwaclJ1.js";import{F as f}from"./file-text-BmYvzZ5U.js";import{D as R}from"./download-DpWzK9fg.js";const w=$.forwardRef(({sale:e,companyInfo:s},c)=>{var n,p,d,l,o,m,x,h;const a=Math.max(0,Number(e.paid_amount||0)-Number(e.total_amount||0));return t.jsxs(t.Fragment,{children:[t.jsx("style",{children:`
                    @media print {
                        .thermal-receipt {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            color: black !important;
                        }
                        .thermal-receipt * {
                            color: black !important;
                            visibility: visible !important;
                            opacity: 1 !important;
                        }
                        .company-info {
                            color: black !important;
                            font-weight: normal !important;
                        }
                    }
                `}),t.jsxs("div",{ref:c,className:"thermal-receipt",style:{width:"80mm",maxWidth:"302px",margin:"0 auto",padding:"8px",fontFamily:"Courier New, monospace",fontSize:"12px",lineHeight:"1.2",backgroundColor:"white",color:"black"},children:[t.jsxs("div",{style:{textAlign:"center",marginBottom:"8px"},children:[t.jsx("div",{style:{fontWeight:"bold",fontSize:"14px",marginBottom:"4px"},children:s.name}),s.address&&t.jsx("div",{className:"company-info",style:{fontSize:"10px",marginBottom:"2px",color:"black",fontWeight:"normal"},children:s.address}),s.phone&&t.jsx("div",{className:"company-info",style:{fontSize:"10px",marginBottom:"2px",color:"black",fontWeight:"normal"},children:s.phone})]}),t.jsx("div",{style:{borderTop:"1px dashed #999",margin:"8px 0"}}),t.jsxs("div",{style:{marginBottom:"8px"},children:[t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Receipt #:"}),t.jsx("span",{children:e.sale_number})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Date:"}),t.jsx("span",{children:new Date(e.sale_date).toLocaleString()})]}),e.cash_register&&t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Register:"}),t.jsx("span",{children:e.cash_register.name})]}),((n=e.cash_register)==null?void 0:n.branch)&&t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Branch:"}),t.jsx("span",{children:e.cash_register.branch.name})]})]}),t.jsx("div",{style:{borderTop:"1px dashed #999",margin:"8px 0"}}),t.jsxs("div",{style:{marginBottom:"8px"},children:[t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Customer:"}),t.jsx("span",{children:((p=e.customer)==null?void 0:p.name)||"Walk-in"})]}),((d=e.customer)==null?void 0:d.phone)&&t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Phone:"}),t.jsx("span",{children:e.customer.phone})]}),((l=e.customer)==null?void 0:l.email)&&t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"E-mail:"}),t.jsx("span",{children:e.customer.email})]})]}),t.jsx("div",{style:{borderTop:"1px dashed #999",margin:"8px 0"}}),t.jsxs("div",{style:{marginBottom:"8px"},children:[t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Product Name:"}),t.jsx("span",{children:(o=e.items)==null?void 0:o.map(i=>{var r;return i.product_name||i.name||((r=i.product)==null?void 0:r.name)}).join(", ")})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Price:"}),t.jsx("span",{children:window.appSettings.formatCurrency(((m=e.items)==null?void 0:m.reduce((i,r)=>i+Number(r.unit_price||0)*r.quantity,0))||0)})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Qty:"}),t.jsx("span",{children:((x=e.items)==null?void 0:x.reduce((i,r)=>i+r.quantity,0))||0})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"SubTotal:"}),t.jsx("span",{children:window.appSettings.formatCurrency(e.subtotal||0)})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Tax(%):"}),t.jsx("span",{children:((h=e.items)==null?void 0:h.map(i=>`${i.tax_rate}%`).join(", "))||"0%"})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Tax Amount:"}),t.jsx("span",{children:window.appSettings.formatCurrency(e.tax_amount||0)})]}),e.discount_amount&&Number(e.discount_amount)>0&&t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Discount:"}),t.jsxs("span",{children:["-",window.appSettings.formatCurrency(e.discount_amount)]})]}),t.jsx("div",{style:{borderTop:"1px solid #999",marginTop:"4px",paddingTop:"4px"},children:t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontWeight:"bold"},children:[t.jsx("span",{children:"Total:"}),t.jsx("span",{children:window.appSettings.formatCurrency(e.total_amount||0)})]})})]}),t.jsx("div",{style:{borderTop:"1px dashed #999",margin:"8px 0"}}),t.jsxs("div",{style:{marginBottom:"8px"},children:[t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Payment:"}),t.jsx("span",{style:{textTransform:"capitalize"},children:e.payment_method.replace("_"," ")})]}),t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:"2px"},children:[t.jsx("span",{children:"Paid:"}),t.jsx("span",{children:window.appSettings.formatCurrency(e.paid_amount||0)})]}),a>0&&t.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontWeight:"bold"},children:[t.jsx("span",{children:"Change:"}),t.jsx("span",{children:window.appSettings.formatCurrency(a)})]})]}),e.notes&&t.jsxs(t.Fragment,{children:[t.jsx("div",{style:{borderTop:"1px dashed #999",margin:"8px 0"}}),t.jsx("div",{style:{marginBottom:"8px"},children:t.jsxs("div",{style:{fontSize:"10px"},children:["Notes: ",e.notes]})})]}),t.jsx("div",{style:{borderTop:"1px dashed #999",margin:"8px 0"}}),t.jsx("div",{style:{textAlign:"center",fontSize:"10px"},children:t.jsx("div",{children:"Thank you !"})}),t.jsx("div",{style:{marginTop:"16px",textAlign:"center",fontSize:"10px"},children:t.jsx("div",{children:"* * * * * * * * * * * * * *"})})]})]})});w.displayName="ThermalReceipt";const D=()=>{const e=b.useCallback((a,n={})=>{const{paperSize:p="thermal",margins:d="0",orientation:l="portrait"}=n,o=window.open("","_blank","width=800,height=600");if(!o)throw new Error("Unable to open print window. Please check popup blocker settings.");const m=a.outerHTML,x=p==="thermal"?`
            <style>
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: ${d};
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        line-height: 1.2;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .thermal-receipt {
                        width: 80mm !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 8px !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
                body {
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
            </style>
        `:`
            <style>
                @media print {
                    @page {
                        size: A4 ${l};
                        margin: ${d};
                    }
                    body {
                        margin: 0;
                        padding: 20px;
                        font-family: Arial, sans-serif;
                        font-size: 14px;
                        line-height: 1.4;
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                }
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                }
            </style>
        `;o.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Receipt</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                ${x}
            </head>
            <body>
                ${m}
            </body>
            </html>
        `),o.document.close(),o.onload=()=>{setTimeout(()=>{o.print(),o.close()},250)}},[]),s=b.useCallback(a=>{e(a,{paperSize:"thermal",margins:"0"})},[e]),c=b.useCallback(a=>{e(a,{paperSize:"a4",margins:"20mm",orientation:"portrait"})},[e]);return{printElement:e,printThermalReceipt:s,printA4Receipt:c}},z=async(e,s)=>{var l,o,m,x,h,i,r,u;const c=Math.max(0,Number(e.paid_amount||0)-Number(e.total_amount||0)),a=`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Receipt ${e.sale_number}</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.3;
                    margin: 0;
                    padding: 20px;
                    max-width: 300px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    margin-bottom: 15px;
                }
                .company-name {
                    font-weight: bold;
                    font-size: 14px;
                    margin-bottom: 5px;
                }
                .separator {
                    border-top: 1px dashed #000;
                    margin: 10px 0;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 2px;
                }
                .item {
                    margin-bottom: 8px;
                }
                .item-details {
                    font-size: 10px;
                    color: #666;
                    margin-left: 10px;
                }
                .total-row {
                    border-top: 1px solid #000;
                    padding-top: 5px;
                    font-weight: bold;
                }
                .footer {
                    text-align: center;
                    margin-top: 15px;
                    font-size: 10px;
                }
                .notes {
                    margin: 10px 0;
                    font-size: 10px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">${s.name}</div>
                ${s.address?`<div style="font-size: 10px; margin-bottom: 3px;">${s.address}</div>`:""}
                ${s.phone?`<div style="font-size: 10px; margin-bottom: 3px;">${s.phone}</div>`:""}
            </div>

            <div class="separator"></div>

            <div class="row">
                <span>Receipt #:</span>
                <span>${e.sale_number}</span>
            </div>
            <div class="row">
                <span>Date:</span>
                <span>${new Date(e.sale_date).toLocaleString()}</span>
            </div>
            ${e.cash_register?`
            <div class="row">
                <span>Register:</span>
                <span>${e.cash_register.name}</span>
            </div>
            `:""}
            ${(l=e.cash_register)!=null&&l.branch?`
            <div class="row">
                <span>Branch:</span>
                <span>${e.cash_register.branch.name}</span>
            </div>
            `:""}

            <div class="separator"></div>

            <div class="row">
                <span>Customer:</span>
                <span>${((o=e.customer)==null?void 0:o.name)||"Walk-in"}</span>
            </div>
            ${(m=e.customer)!=null&&m.phone?`
            <div class="row">
                <span>Phone:</span>
                <span>${e.customer.phone}</span>
            </div>
            `:""}
            ${(x=e.customer)!=null&&x.email?`
            <div class="row">
                <span>E-mail:</span>
                <span>${e.customer.email}</span>
            </div>
            `:""}

            <div class="separator"></div>

            <div class="row">
                <span>Product Name:</span>
                <span>${(h=e.items)==null?void 0:h.map(v=>{var y;return v.product_name||v.name||((y=v.product)==null?void 0:y.name)}).join(", ")}</span>
            </div>
            <div class="row">
                <span>Price:</span>
                <span>$${Number(((i=e.items)==null?void 0:i.reduce((v,y)=>v+Number(y.unit_price||0)*y.quantity,0))||0).toFixed(2)}</span>
            </div>
            <div class="row">
                <span>Qty:</span>
                <span>${((r=e.items)==null?void 0:r.reduce((v,y)=>v+y.quantity,0))||0}</span>
            </div>
            <div class="row">
                <span>SubTotal:</span>
                <span>$${Number(e.subtotal||0).toFixed(2)}</span>
            </div>
            <div class="row">
                <span>Tax(%):</span>
                <span>${((u=e.items)==null?void 0:u.map(v=>`${v.tax_rate}%`).join(", "))||"0%"}</span>
            </div>
            <div class="row">
                <span>Tax Amount:</span>
                <span>$${Number(e.tax_amount||0).toFixed(2)}</span>
            </div>
            ${e.discount_amount&&Number(e.discount_amount)>0?`
            <div class="row">
                <span>Discount:</span>
                <span>-$${Number(e.discount_amount).toFixed(2)}</span>
            </div>
            `:""}
            <div class="row total-row">
                <span>Total:</span>
                <span>$${Number(e.total_amount||0).toFixed(2)}</span>
            </div>

            <div class="separator"></div>

            <div class="row">
                <span>Payment:</span>
                <span style="text-transform: capitalize;">${e.payment_method.replace("_"," ")}</span>
            </div>
            <div class="row">
                <span>Paid:</span>
                <span>$${Number(e.paid_amount||0).toFixed(2)}</span>
            </div>
            ${c>0?`
            <div class="row" style="font-weight: bold;">
                <span>Change:</span>
                <span>$${c.toFixed(2)}</span>
            </div>
            `:""}

            ${e.notes?`
            <div class="separator"></div>
            <div class="notes">
                Notes: ${e.notes}
            </div>
            `:""}

            <div class="separator"></div>

            <div class="footer">
                <div>Thank you for your business!</div>
                <div style="margin-top: 10px;">* * * * * * * * * * * * * *</div>
            </div>
        </body>
        </html>
    `,n=new Blob([a],{type:"text/html"}),p=URL.createObjectURL(n),d=document.createElement("a");d.href=p,d.download=`receipt-${e.sale_number}.html`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(p)},B=(e,s)=>{var p,d,l,o,m,x,h,i;const c=Math.max(0,Number(e.paid_amount||0)-Number(e.total_amount||0)),a=window.open("","_blank","width=800,height=600");if(!a)throw new Error("Unable to open print window. Please check popup blocker settings.");const n=`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Receipt ${e.sale_number}</title>
            <style>
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 20mm;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                }
                body {
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.4;
                    margin: 0;
                    padding: 20px;
                    max-width: 400px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 15px;
                }
                .company-name {
                    font-weight: bold;
                    font-size: 18px;
                    margin-bottom: 8px;
                }
                .separator {
                    border-top: 1px dashed #000;
                    margin: 15px 0;
                }
                .row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 5px;
                }
                .item {
                    margin-bottom: 10px;
                    padding: 5px 0;
                }
                .item-details {
                    font-size: 12px;
                    color: #666;
                    margin-left: 15px;
                }
                .total-section {
                    border-top: 2px solid #000;
                    padding-top: 10px;
                    margin-top: 15px;
                }
                .total-row {
                    font-weight: bold;
                    font-size: 16px;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #000;
                }
                .notes {
                    margin: 15px 0;
                    padding: 10px;
                    background-color: #f5f5f5;
                    border-left: 3px solid #007bff;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-name">${s.name}</div>
                ${s.address?`<div style="font-size: 12px; margin-bottom: 5px; color: #666;">${s.address}</div>`:""}
                ${s.phone?`<div style="font-size: 12px; margin-bottom: 5px; color: #666;">${s.phone}</div>`:""}
            </div>

            <div class="row">
                <span><strong>Receipt #:</strong></span>
                <span>${e.sale_number}</span>
            </div>
            <div class="row">
                <span><strong>Date:</strong></span>
                <span>${new Date(e.sale_date).toLocaleString()}</span>
            </div>
            ${e.cash_register?`
            <div class="row">
                <span><strong>Register:</strong></span>
                <span>${e.cash_register.name}</span>
            </div>
            `:""}
            ${(p=e.cash_register)!=null&&p.branch?`
            <div class="row">
                <span><strong>Branch:</strong></span>
                <span>${e.cash_register.branch.name}</span>
            </div>
            `:""}

            <div class="separator"></div>

            <div class="row">
                <span><strong>Customer:</strong></span>
                <span>${((d=e.customer)==null?void 0:d.name)||"Walk-in"}</span>
            </div>
            ${(l=e.customer)!=null&&l.phone?`
            <div class="row">
                <span><strong>Phone:</strong></span>
                <span>${e.customer.phone}</span>
            </div>
            `:""}
            ${(o=e.customer)!=null&&o.email?`
            <div class="row">
                <span><strong>E-mail:</strong></span>
                <span>${e.customer.email}</span>
            </div>
            `:""}

            <div class="separator"></div>

            <div class="total-section">
                <div class="row">
                    <span>Product Name:</span>
                    <span>${(m=e.items)==null?void 0:m.map(r=>{var u;return r.product_name||r.name||((u=r.product)==null?void 0:u.name)}).join(", ")}</span>
                </div>
                <div class="row">
                    <span>Price:</span>
                    <span>$${Number(((x=e.items)==null?void 0:x.reduce((r,u)=>r+Number(u.unit_price||0)*u.quantity,0))||0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span>Qty:</span>
                    <span>${((h=e.items)==null?void 0:h.reduce((r,u)=>r+u.quantity,0))||0}</span>
                </div>
                <div class="row">
                    <span>SubTotal:</span>
                    <span>$${Number(e.subtotal||0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span>Tax(%):</span>
                    <span>${((i=e.items)==null?void 0:i.map(r=>`${r.tax_rate}%`).join(", "))||"0%"}</span>
                </div>
                <div class="row">
                    <span>Tax Amount:</span>
                    <span>$${Number(e.tax_amount||0).toFixed(2)}</span>
                </div>
                ${e.discount_amount&&Number(e.discount_amount)>0?`
                <div class="row">
                    <span>Discount:</span>
                    <span>-$${Number(e.discount_amount).toFixed(2)}</span>
                </div>
                `:""}
                <div class="row total-row">
                    <span>Total:</span>
                    <span>$${Number(e.total_amount||0).toFixed(2)}</span>
                </div>
            </div>

            <div class="separator"></div>

            <div class="row">
                <span><strong>Payment Method:</strong></span>
                <span style="text-transform: capitalize;">${e.payment_method.replace("_"," ")}</span>
            </div>
            <div class="row">
                <span><strong>Amount Paid:</strong></span>
                <span>$${Number(e.paid_amount||0).toFixed(2)}</span>
            </div>
            ${c>0?`
            <div class="row">
                <span><strong>Change Given:</strong></span>
                <span>$${c.toFixed(2)}</span>
            </div>
            `:""}

            ${e.notes?`
            <div class="notes">
                <strong>Notes:</strong> ${e.notes}
            </div>
            `:""}

            <div class="footer">
                <h3>Thank you for your business!</h3>
            </div>
        </body>
        </html>
    `;a.document.write(n),a.document.close(),a.onload=()=>{setTimeout(()=>{a.print()},500)}};function G({isOpen:e,onClose:s,sale:c,companyInfo:a={name:"Your Company",address:"",phone:"",email:""}}){const{t:n}=P(),p=b.useRef(null),{printThermalReceipt:d,printA4Receipt:l}=D(),o=()=>{if(!p.current){g.error(n("Receipt not ready for printing"));return}try{d(p.current),g.success(n("Thermal receipt sent to printer"))}catch(i){console.error("Print error:",i),g.error(n("Failed to print thermal receipt"))}},m=()=>{if(!p.current){g.error(n("Receipt not ready for printing"));return}try{l(p.current),g.success(n("A4 receipt sent to printer"))}catch(i){console.error("Print error:",i),g.error(n("Failed to print A4 receipt"))}},x=async()=>{try{await z(c,a),g.success(n("Receipt HTML downloaded successfully"))}catch(i){console.error("Download error:",i),g.error(n("Failed to download receipt"))}},h=()=>{try{B(c,a),g.success(n("PDF receipt opened in new window"))}catch(i){console.error("PDF generation error:",i),g.error(n("Failed to generate PDF receipt"))}};return t.jsx(_,{open:e,onOpenChange:s,children:t.jsxs(N,{className:"max-w-md max-h-[90vh] overflow-y-auto",onPointerDownOutside:()=>s(),onInteractOutside:()=>s(),children:[t.jsx(C,{children:t.jsxs(T,{className:"flex items-center",children:[t.jsx(k,{className:"h-5 w-5 mr-2"}),n("Receipt Preview")," - ",c.sale_number]})}),t.jsxs("div",{className:"space-y-6",children:[t.jsx("div",{className:"border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto",children:t.jsx(w,{ref:p,sale:c,companyInfo:a})}),t.jsxs("div",{className:"space-y-3",children:[t.jsx("div",{className:"text-sm font-medium text-gray-700",children:n("Print Options")}),t.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[t.jsxs(j,{onClick:o,className:"flex items-center justify-center",variant:"default",children:[t.jsx(F,{className:"h-4 w-4 mr-2"}),n("Thermal Print")]}),t.jsxs(j,{onClick:m,className:"flex items-center justify-center",variant:"outline",children:[t.jsx(f,{className:"h-4 w-4 mr-2"}),n("A4 Print")]})]})]}),t.jsxs("div",{className:"space-y-3",children:[t.jsx("div",{className:"text-sm font-medium text-gray-700",children:n("Download Options")}),t.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[t.jsxs(j,{onClick:x,className:"flex items-center justify-center",variant:"outline",children:[t.jsx(R,{className:"h-4 w-4 mr-2"}),n("HTML File")]}),t.jsxs(j,{onClick:h,className:"flex items-center justify-center",variant:"outline",children:[t.jsx(f,{className:"h-4 w-4 mr-2"}),n("Generate PDF")]})]})]}),t.jsxs("div",{className:"text-xs text-gray-600 bg-blue-50 p-3 rounded-lg",children:[t.jsx("div",{className:"font-medium mb-1",children:n("Options Guide:")}),t.jsxs("ul",{className:"space-y-1",children:[t.jsxs("li",{children:["• ",t.jsx("strong",{children:n("Thermal Print:")})," ",n("80mm format for thermal printers")]}),t.jsxs("li",{children:["• ",t.jsx("strong",{children:n("A4 Print:")})," ",n("Standard paper with detailed layout")]}),t.jsxs("li",{children:["• ",t.jsx("strong",{children:n("HTML File:")})," ",n("Save as HTML for custom formatting")]}),t.jsxs("li",{children:["• ",t.jsx("strong",{children:n("Generate PDF:")})," ",n("Create PDF using browser's print function")]})]})]}),t.jsx("div",{className:"flex justify-end",children:t.jsx(j,{variant:"outline",onClick:s,children:n("Close")})})]})]})})}export{G as R};
