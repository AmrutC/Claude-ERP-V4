/**
 * Vision Grroup ERP — Document Engine
 * Handles PDF (receipt, demand notice) and Word merge (legal docs).
 * Runs in Electron main process. Called via IPC.
 */

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign } = require('docx');
const fs = require('fs');
const path = require('path');

// ── UTILITY ───────────────────────────────────────────────────────────────
function numWords(n) {
  n = Math.round(n);
  if (!n) return 'Zero';
  const o=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const t=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if(n<20) return o[n];
  if(n<100) return t[Math.floor(n/10)]+(n%10?' '+o[n%10]:'');
  if(n<1000) return o[Math.floor(n/100)]+' Hundred'+(n%100?' '+numWords(n%100):'');
  if(n<100000) return numWords(Math.floor(n/1000))+' Thousand'+(n%1000?' '+numWords(n%1000):'');
  if(n<10000000) return numWords(Math.floor(n/100000))+' Lakh'+(n%100000?' '+numWords(n%100000):'');
  return numWords(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+numWords(n%10000000):'');
}

function inr(n) { return '₹' + Number(n||0).toLocaleString('en-IN'); }

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

const NAVY = '0D1E35';
const GOLD = 'C9951E';
const nb = { style:BorderStyle.NONE, size:0, color:'FFFFFF' };
const nob = { top:nb, bottom:nb, left:nb, right:nb };

function bdr() { const b={style:BorderStyle.SINGLE,size:1,color:'D0D8E4'}; return {top:b,bottom:b,left:b,right:b}; }

function tc(w, text, opts={}) {
  return new TableCell({
    width: { size:w, type:WidthType.DXA },
    borders: opts.nob ? nob : bdr(),
    shading: opts.bg ? { fill:opts.bg, type:ShadingType.CLEAR } : undefined,
    margins: { top:80, bottom:80, left:120, right:120 },
    verticalAlign: VerticalAlign.TOP,
    children: [new Paragraph({ alignment: opts.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text||''), font:'Arial', size:opts.sz||19, bold:opts.bold||false, color:opts.col||(opts.bg===NAVY?'FFFFFF':'1A2332') })]
    })]
  });
}

function headerSection(entityName, entityAddress, reraNo, docTitle) {
  return [
    new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[9360], rows:[
      new TableRow({ children:[new TableCell({ borders:nob, shading:{fill:NAVY,type:ShadingType.CLEAR}, margins:{top:120,bottom:120,left:200,right:200},
        children:[
          new Paragraph({ alignment:AlignmentType.CENTER, children:[new TextRun({text:'VISION GRROUP', font:'Arial', size:36, bold:true, color:'FFFFFF'})] }),
          new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:40}, children:[new TextRun({text:entityName, font:'Arial', size:20, color:'F0C040'})] }),
          new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:20}, children:[new TextRun({text:entityAddress, font:'Arial', size:17, color:'FFFFFF', italics:true})] }),
          reraNo ? new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:20}, children:[new TextRun({text:`RERA Reg. No.: ${reraNo}`, font:'Arial', size:16, color:'F0C040'})] }) : new Paragraph({children:[new TextRun('')]}),
          new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:60}, children:[new TextRun({text:docTitle, font:'Arial', size:24, bold:true, color:GOLD})] }),
        ]
      })]})
    ]}),
    new Paragraph({ spacing:{before:0,after:0}, border:{bottom:{style:BorderStyle.SINGLE,size:6,color:GOLD}}, children:[new TextRun('')] }),
  ];
}

// ── PAYMENT RECEIPT ───────────────────────────────────────────────────────
async function generateReceipt(data) {
  const { receiptNo, date, allottee, flat, project, milestone, baseAmount, gstRate, gstAmount, total, paymentMode, chequeUtr, entity } = data;
  const doc = new Document({ sections:[{ properties:{ page:{ size:{width:11906,height:16838}, margin:{top:1080,bottom:1080,left:1080,right:1080} }},
    children:[
      ...headerSection(entity.name, entity.address, entity.reraNo, 'PAYMENT RECEIPT'),
      new Paragraph({ spacing:{before:120,after:0}, children:[new TextRun('')] }),
      new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[4680,4680], rows:[
        new TableRow({ children:[
          tc(4680, `Receipt No.: ${receiptNo}`, {bold:true}),
          tc(4680, `Date: ${fmtDate(date)}`, {bold:true, right:true}),
        ]})
      ]}),
      new Paragraph({ spacing:{before:160,after:80}, children:[new TextRun({text:'ALLOTTEE DETAILS', font:'Arial', size:19, bold:true, color:NAVY})] }),
      new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[3200,6160], rows:[
        new TableRow({children:[tc(3200,'Allottee Name',{bg:'F5F7FA',bold:true}), tc(6160,allottee.name,{bold:true})]}),
        new TableRow({children:[tc(3200,'Flat / Unit No.',{bg:'F5F7FA',bold:true}), tc(6160,flat.unitNo,{bold:true})]}),
        new TableRow({children:[tc(3200,'Project',{bg:'F5F7FA',bold:true}), tc(6160,project.name)]}),
        new TableRow({children:[tc(3200,'Phone',{bg:'F5F7FA',bold:true}), tc(6160,allottee.phone||'—')]}),
      ]}),
      new Paragraph({ spacing:{before:160,after:80}, children:[new TextRun({text:'PAYMENT DETAILS', font:'Arial', size:19, bold:true, color:NAVY})] }),
      new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[3200,6160], rows:[
        new TableRow({children:[tc(3200,'Against Milestone',{bg:'F5F7FA',bold:true}), tc(6160,milestone,{bold:true})]}),
        new TableRow({children:[tc(3200,'Amount Received (Base)',{bg:'F5F7FA',bold:true}), tc(6160,inr(baseAmount),{bold:true})]}),
        new TableRow({children:[tc(3200,`GST @ ${gstRate}%`,{bg:'F5F7FA',bold:true}), tc(6160,inr(gstAmount))]}),
        new TableRow({children:[tc(3200,'Total Received (incl. GST)',{bg:NAVY,bold:true}), tc(6160,inr(total),{bg:NAVY,bold:true,sz:22})]}),
        new TableRow({children:[tc(3200,'Amount in Words',{bg:'F5F7FA',bold:true}), tc(6160,numWords(total)+' Rupees Only',{col:'0D1E35'})]}),
        new TableRow({children:[tc(3200,'Payment Mode',{bg:'F5F7FA',bold:true}), tc(6160,paymentMode||'—')]}),
        chequeUtr ? new TableRow({children:[tc(3200,'Cheque / UTR No.',{bg:'F5F7FA',bold:true}), tc(6160,chequeUtr)]}) : null,
      ].filter(Boolean)}),
      new Paragraph({ spacing:{before:480,after:0}, children:[new TextRun('')] }),
      new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[5760,3600], rows:[
        new TableRow({ children:[
          tc(5760, `This is a computer-generated receipt. Subject to realisation of instrument.`, {col:'888888',sz:16}),
          tc(3600, 'Authorised Signatory', {bold:true,right:true}),
        ]})
      ]}),
      new Paragraph({ spacing:{before:0,after:0}, children:[new TextRun({text:'',size:60})] }),
      new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[5760,3600], rows:[
        new TableRow({ children:[
          tc(5760, `${entity.name}`, {col:'888888',sz:16}),
          tc(3600, '________________________', {right:true,col:'888888'}),
        ]})
      ]}),
    ]
  }]});
  return await Packer.toBuffer(doc);
}

// ── DEMAND NOTICE ─────────────────────────────────────────────────────────
async function generateDemandNotice(data) {
  const { demandNo, date, dueDate, allottee, flat, project, milestone, baseAmount, gstAmount, total, paymentDetails, entity, isOverdue } = data;
  const doc = new Document({ sections:[{ properties:{page:{size:{width:11906,height:16838},margin:{top:1080,bottom:1080,left:1080,right:1080}}},
    children:[
      ...headerSection(entity.name, entity.address, entity.reraNo, isOverdue ? 'OVERDUE PAYMENT REMINDER' : 'PAYMENT DEMAND NOTICE'),
      new Paragraph({ spacing:{before:120,after:0}, children:[new TextRun('')] }),
      new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[4680,4680], rows:[
        new TableRow({children:[tc(4680,`Demand Notice No.: ${demandNo}`,{bold:true}), tc(4680,`Date: ${fmtDate(date)}`,{bold:true,right:true})]}),
        new TableRow({children:[tc(4680,`Due Date: ${fmtDate(dueDate)}`,{bold:true,col:isOverdue?'B91C1C':'0D1E35'}), tc(4680,'',{nob:true})]}),
      ]}),
      new Paragraph({spacing:{before:160,after:80},children:[new TextRun({text:'TO', font:'Arial', size:19, bold:true, color:NAVY})]}),
      new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:allottee.name, font:'Arial', size:21, bold:true})]}),
      new Paragraph({spacing:{before:0,after:40},children:[new TextRun({text:`Flat No.: ${flat.unitNo} | Project: ${project.name}`, font:'Arial', size:19})]}),
      new Paragraph({spacing:{before:0,after:80},children:[new TextRun({text:allottee.address||'', font:'Arial', size:19})]}),
      new Paragraph({spacing:{before:120,after:80},children:[new TextRun({text:'Dear Sir/Madam,', font:'Arial', size:19})]}),
      new Paragraph({spacing:{before:0,after:120},children:[new TextRun({
        text:`This is to inform you that as per the Agreement for Sale dated ________, the following payment installment is now ${isOverdue?'overdue':'due'} for your flat at ${project.name}:`,
        font:'Arial', size:19})]}),
      new Table({ width:{size:9360,type:WidthType.DXA}, columnWidths:[3600,5760], rows:[
        new TableRow({children:[tc(3600,'Milestone / Stage',{bg:NAVY,bold:true}), tc(5760,milestone,{bg:NAVY,bold:true})]}),
        new TableRow({children:[tc(3600,'Basic Amount',{bg:'F5F7FA',bold:true}), tc(5760,inr(baseAmount))]}),
        new TableRow({children:[tc(3600,'GST Amount',{bg:'F5F7FA',bold:true}), tc(5760,inr(gstAmount))]}),
        new TableRow({children:[tc(3600,'Total Amount Due',{bg:'FBF3E2',bold:true}), tc(5760,inr(total),{bg:'FBF3E2',bold:true,sz:22})]}),
        new TableRow({children:[tc(3600,'Amount in Words',{bg:'F5F7FA',bold:true}), tc(5760,numWords(total)+' Rupees Only',{col:'0D1E35'})]}),
        new TableRow({children:[tc(3600,'Due Date',{bg:'F5F7FA',bold:true}), tc(5760,fmtDate(dueDate),{bold:true,col:isOverdue?'B91C1C':'0D1E35'})]}),
      ]}),
      new Paragraph({spacing:{before:160,after:80},children:[new TextRun({text:'Please remit the above amount to:', font:'Arial', size:19})]}),
      new Paragraph({spacing:{before:0,after:60},children:[new TextRun({text:paymentDetails||'[Bank details as per agreement]', font:'Arial', size:19, bold:true})]}),
      new Paragraph({spacing:{before:80,after:40},children:[new TextRun({text:'Please ignore if payment has already been made.', font:'Arial', size:17, italics:true, color:'888888'})]}),
      new Paragraph({spacing:{before:360,after:0},children:[new TextRun({text:'For '+entity.name, font:'Arial', size:19, bold:true})]}),
      new Paragraph({spacing:{before:280,after:0},children:[new TextRun({text:'________________________', font:'Arial', size:19, color:'888888'})]}),
      new Paragraph({spacing:{before:0,after:0},children:[new TextRun({text:'Authorised Signatory', font:'Arial', size:17})]}),
    ]
  }]});
  return await Packer.toBuffer(doc);
}

// ── WORD MERGE — generic template filler ────────────────────────────────
async function generateFromTemplate(templatePath, mergeFields) {
  // Reads a Word .docx template, replaces {{field}} placeholders.
  // Returns buffer.
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templatePath}. Please add the template to OneDrive/templates/word/`);
  }
  const content = fs.readFileSync(templatePath);
  // Simple approach: unzip, replace in document.xml, rezip.
  // For production, use a proper docx template library.
  // This is the hook — developer implements full merge logic here.
  return content; // placeholder — returns template as-is until implemented
}

module.exports = { generateReceipt, generateDemandNotice, generateFromTemplate };
