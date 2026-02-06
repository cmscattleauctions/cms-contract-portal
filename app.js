/* ==========================================================
   CMS Contract Portal (client-only) — app.js
   ========================================================== */

console.log("CMS Contract Portal app.js loaded ✅");

const CONFIG = {
  PIN: "0623",

  COLS: {
    buyer: "Buyer",
    consignor: "Consignor",
    rep: "Representative",

    breed: "Breed",
    type: "Type",
    year: "Year",

    lotNumber: "Lot Number",
    lotSeq: "Lot Sequence",
    head: "Head Count",
    loads: "Load Count",
    description: "Description",
    secondDescription: "Second Description",
    sex: "Sex",
    baseWeight: "Base Weight",
    delivery: "Delivery",
    location: "Location",
    shrink: "Shrink",
    slide: "Slide",
    price: "Calculated High Bid",
    downMoney: "Down Money Due",

    cmsInternalNotes: "CMS Internal Notes",
  },

  CONTRACT_COL_CANDIDATES: [
    "Contract #",
    "Contract",
    "Contract Number",
    "Contract No",
    "Contract No."
  ],

  // Header right block (Buyer Recaps / Trade Confirmations / Contract Details)
  HEADER_RIGHT_TITLE: "CMS Livestock Auction",
  HEADER_ADDRESS_LINES: [
    "6900 I-40 West, Suite 135",
    "Amarillo, TX 79106",
    "(806) 355-7505"
  ],

  CONTRACT_TERMS: {
    buyer: `All cattle shall be in good physical condition and shall be free of any defects including to but not limited to lameness, crippled, bad eyes, and lump jaws.
Seller does hereby warrant that all cattle shall have clear title and be free of any and all encumbrances.  Buyer hereby grants a purchase money security interest in the above-described cattle to CMS Orita Calf Auctions, LLC to secure full payment and collection of the purchase price. 
Buyer does hereby agree to a down payment of $30.00 Per head ({{Down Money Due}} of Down Money Due) if delivery date is more than 30 days past the auction date as good faith money to be applied at the time of delivery.
Buyer does hereby agree to payment by wire transfer the day following delivery of the cattle or by overnight carrier at Buyer’s expense. Payments if sent overnight shall be sent to: 
CMS Livestock Auction 
6900 I-40 West, Suite 135 
Amarillo, TX 79106. 
The CMS Livestock Auction Video Auction Terms of Service Agreement as stated in auction registration and participation are incorporated by reference into this contract. If a discrepancy between this contract and the CMS Livestock Auction Video Auction Terms of Service Agreement arises, the CMS Livestock Auction Video Auction Terms of Service Agreement  shall take priority.`,

    seller: `All cattle shall be in good physical condition and shall be free of any defects including to but not limited to lameness, crippled, bad eyes, and lump jaws.
Seller agrees to deliver the above-described cattle to Buyer as sold through CMS Livestock Auction on the agreed-upon delivery date. Seller further agrees that once the cattle are sold through CMS Livestock Auction, Seller shall not sell, transfer, or otherwise dispose of the cattle to any party other than the Buyer prior to the delivery date without written consent from CMS Livestock Auction.
Seller represents and warrants that all information provided regarding the cattle, including weight, breed, age, and health status, is accurate to the best of Seller’s knowledge.
Seller does hereby warrant that all cattle shall have clear title and be free of any and all encumbrances.  
The CMS Livestock Auction Seller’s Terms of Service Agreement as signed prior to the auction are incorporated by reference into this contract. If a discrepancy between this contract and the CMS Livestock Auction Seller’s Terms of Service Agreement arises, the CMS Livestock Auction Seller’s Terms of Service Agreement shall take priority.`
  },

  PDF: {
    pageSize: { width: 612, height: 792 }, // Vertical Page Size
    margin: 26,
    bottomLimit: 9,
    topBarH: 8,

    headerHFirst: 98,
    headerHOther: 62,

    buyerNameSize: 14.4,
    otherNameSize: 12.6,
    title: 12.0,

    lotTitle: 10.4,
    lotBreed: 9.4,
    gridLabel: 7.7,
    gridValue: 8.6,
    notes: 7.8,

    gridLineH: 10.2,
    notesLineH: 10.0,

    lotGap: 7,

    padX: 8,
    cellPadX: 5,
    cellPadY: 4,

    footerLineH: 10.6,
    footerMinH: 92,

    borderW: 1.0,
    innerW: 0.8,
  },

  COLORS: {
    cmsBlue: "#336699",
    consignorColor: "#818589",
    repBar: "#6F8FAF",
    textWhite: [1,1,1],
  },

  REP_CONSIGNOR_PALETTE: [
    "#202E4A",
    "#336699",
    "#3FA796",
    "#6F8FAF",
    "#C9A66B",
  ],
};

/* ---------------- DOM ---------------- */
function mustGet(id){
  const el = document.getElementById(id);
  if(!el) throw new Error(`Missing element in HTML: #${id}`);
  return el;
}

// Further DOM functions and event listeners...

/* ---------------- PDF GENERATION ---------------- */

// Modified functions for vertical layout, ensure text fits the new orientation

async function buildSalesContractPdf({row, side}) {
  assertLibsLoaded();
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = CONFIG.PDF.pageSize.width;
  const H = CONFIG.PDF.pageSize.height;
  const M = CONFIG.PDF.margin;
  const contentW = W - 2*M;

  const topBarColor = rgb(...hexToRgb01(CONFIG.COLORS.cmsBlue));
  const BLACK = rgb(0,0,0);
  const GRAY = rgb(0.55, 0.55, 0.55);

  const page = pdfDoc.addPage([W,H]);
  page.drawRectangle({ x:0, y:H-CONFIG.PDF.topBarH, width:W, height:CONFIG.PDF.topBarH, color: topBarColor });

  const contract = safeStr(getContract(row));
  const buyer = safeStr(row[CONFIG.COLS.buyer]);
  const consignor = safeStr(row[CONFIG.COLS.consignor]);
  const rep = safeStr(row[CONFIG.COLS.rep]);
  const downMoney = downMoneyDisplay(row[CONFIG.COLS.downMoney]);

  const auctionTitleBase = safeStr(auctionName.value) || "Auction";
  const extra = safeStr(auctionLabel.value);
  const auctionTitle = extra ? `${auctionTitleBase} — ${extra}` : auctionTitleBase;
  const aDate = safeStr(auctionDate.value) || "";

  const headerY = H - CONFIG.PDF.topBarH - 34;
  page.drawText("Cattle Sales Contract", { x: M, y: headerY, size: 18, font: fontBold, color: BLACK });

  const cnText = `Contract #: ${contract || ""}`.trim();
  const cnSize = 18;
  const cnW = fontBold.widthOfTextAtSize(cnText, cnSize);
  const cnX = M + contentW - cnW;
  page.drawText(cnText, { x: cnX, y: headerY, size: cnSize, font: fontBold, color: BLACK });

  const addrLines = [
    "CMS Orita Calf Auctions, LLC",
    "6900 I-40 West, Suite 135",
    "Amarillo, TX 79106",
    "(806) 355-7505"
  ];

  let ay = headerY - 14;
  page.drawText(addrLines[0], { x: cnX, y: ay, size: 9.6, font: fontBold, color: BLACK });
  ay -= 11;
  page.drawText(addrLines[1], { x: cnX, y: ay, size: 9.2, font, color: BLACK });
  ay -= 11;
  page.drawText(addrLines[2], { x: cnX, y: ay, size: 9.2, font, color: BLACK });
  ay -= 11;
  page.drawText(addrLines[3], { x: cnX, y: ay, size: 9.2, font, color: BLACK });

  const titleY = headerY - 18;
  page.drawText(safeStr(auctionTitle), { x: M, y: titleY, size: 9.8, font, color: BLACK });
  if(aDate){
    page.drawText(safeStr(aDate), { x: M, y: titleY - 12, size: 9.8, font, color: BLACK });
  }

  // Continue with vertical layout for content...

  return await pdfDoc.save();
}

/* ---------------- DOWNLOAD / ZIP ---------------- */

// Adjust download functions to handle the new contract layout

async function downloadZip(items, zipName){
  const zip = new JSZip();
  for(const it of items) zip.file(it.filename, it.bytes);

  const blob = await zip.generateAsync({type:"blob"});
  const url = URL.createObjectURL(blob);
  blobUrls.push(url);

  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(()=>{
    try{ URL.revokeObjectURL(url); }catch{}
    blobUrls = blobUrls.filter(u => u !== url);
  }, 25000);
}

