console.log("CMS Contract Portal app.js loaded ✅");

const CONFIG = {
  PIN: "0623",

  COLS: {
    buyer: "Buyer",
    consignor: "Consignor",
    rep: "Representative",
    breed: "Breed",
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

  CONTRACT_TERMS: {
    buyer: `All cattle shall be in good physical condition and shall be free of any defects including to but not limited to lameness, crippled, bad eyes, and lump jaws.
Seller does hereby warrant that all cattle shall have clear title and be free of any and all encumbrances. Buyer hereby grants a purchase money security interest in the above-described cattle to CMS Orita Calf Auctions, LLC to secure full payment and collection of the purchase price. 
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
    pageSize: { width: 612, height: 792 }, // Portrait 8.5x11
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
    textWhite: [1, 1, 1],
  },

  REP_CONSIGNOR_PALETTE: [
    "#202E4A",
    "#336699",
    "#3FA796",
    "#6F8FAF",
    "#C9A66B",
  ],
};

function mustGet(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element in HTML: #${id}`);
  return el;
}

let pageAuth, pageBuilder, pageResults;
let pinInput, pinSubmit, authError;
let auctionName, auctionDate, auctionLabel;
let dropZone, fileInput, fileMeta;
let chkBuyerContracts, chkSellerContracts;
let buildBtn, builderError;

let csvRows = [];
let contractColName = null;
let generated = {
  buyerContracts: [],
  sellerContracts: [],
};

// Show the page
function show(el) {
  el.classList.remove("hidden");
}

// Hide the page
function hide(el) {
  el.classList.add("hidden");
}

// Change pages
function goto(page) {
  [pageAuth, pageBuilder, pageResults].forEach(hide);
  show(page);
}

function wireDropZone({ zoneEl, inputEl, onFile, metaEl }) {
  zoneEl.addEventListener("dragover", (e) => { e.preventDefault(); zoneEl.classList.add("dragover"); });
  zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dragover"));
  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    zoneEl.classList.remove("dragover");
    const f = e.dataTransfer.files?.[0];
    if (f) { inputEl.value = ""; onFile(f); }
  });

  inputEl.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  });

  if (metaEl) {
    metaEl.textContent = "";
    metaEl.classList.add("hidden");
  }
}

// Handle CSV file upload
function handleCsvFile(file) {
  if (!file) return;

  fileMeta.textContent = `CSV loaded: ${file.name || "uploaded.csv"}`;
  show(fileMeta);

  try {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        csvRows = (results.data || []).filter(r => Object.values(r).some(v => safeStr(v) !== ""));
        contractColName = detectContractColumn(csvRows);
        setBuildEnabled();
      },
      error: () => {
        setError(builderError, "Could not parse CSV. Make sure it's a valid CSV export.");
        csvRows = [];
        setBuildEnabled();
      }
    });
  } catch (err) {
    setError(builderError, err.message);
    csvRows = [];
    setBuildEnabled();
  }
}

// Build the PDF contract
async function buildPdfForContract({ row, side }) {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const BLACK = rgb(0, 0, 0);
  const FILL = rgb(0.98, 0.98, 0.98);
  const topBarColor = rgb(...hexToRgb01(CONFIG.COLORS.cmsBlue));

  const W = CONFIG.PDF.pageSize.width;
  const H = CONFIG.PDF.pageSize.height;
  const M = CONFIG.PDF.margin;
  const contentW = W - 2 * M;

  const page = pdfDoc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: H - CONFIG.PDF.topBarH, width: W, height: CONFIG.PDF.topBarH, color: topBarColor });

  const contract = safeStr(getContract(row));
  const buyer = safeStr(row[CONFIG.COLS.buyer]);
  const consignor = safeStr(row[CONFIG.COLS.consignor]);
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

  // Add more contract generation logic here...

  return await pdfDoc.save();
}

// Wire the authentication (PIN validation)
function wireAuth() {
  pinSubmit.addEventListener("click", () => {
    const entered = safeStr(pinInput.value);
    if (entered === CONFIG.PIN) {
      setError(authError, "");
      pinInput.value = "";
      goto(pageBuilder);  // Navigate to the contract builder page
    } else {
      setError(authError, "Incorrect PIN.");
    }
  });

  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") pinSubmit.click();  // Allow pressing Enter to submit
  });
}

// Set error message
function setError(el, msg) {
  if (!msg) { hide(el); el.textContent = ""; return; }
  el.textContent = msg;
  show(el);
}

// Enable the 'Generate' button when the conditions are met
function setBuildEnabled() {
  const anyChecked = chkBuyerContracts.checked || chkSellerContracts.checked;
  buildBtn.disabled = !(csvRows.length > 0 && anyChecked);
}

// Initialize the app
function init() {
  try { bindDom(); }
  catch (e) { console.error(e); alert(e.message); return; }

  wireAuth();
  wireDropZone({ zoneEl: dropZone, inputEl: fileInput, onFile: handleCsvFile, metaEl: fileMeta });

  [chkBuyerContracts, chkSellerContracts].forEach(el => el.addEventListener("change", setBuildEnabled));
  wireBuild();
  wireExit();
  wireResultsDropdowns();

  goto(pageAuth);
  setBuildEnabled();
}

document.addEventListener("DOMContentLoaded", init);
