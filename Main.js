import { utils, writeFile } from "./Data/xlsx.mjs";
import { dbID, initEL, KadTable } from "./KadUtils/KadUtils.js";

initEL({ id: "idVin_mainAssemblyNr", fn: getMainNumber, resetValue: "MM-Nummern Anlage" });
initEL({ id: "idVin_mainAssemblyName", fn: getMainName, resetValue: "Anlagename" });
const Area_input = initEL({ id: "idArea_input", fn: readData, resetValue: "Zwischenablage hier einfügen" });

initEL({ id: "idBtn_infoUpload", fn: openInfoUpload, resetValue: "Download" });
initEL({ id: "idBtn_infoCloseUpload", fn: closeInfoUpload, resetValue: "Download" });
const Btn_download = initEL({ id: "idBtn_download", fn: startDownload, resetValue: "Download" });

window.onload = mainSetup;

function mainSetup() {
  rawStringAvailable = false;
  enableDownload(true);
  dbID("idLbl_fileName").textContent = `*.xlsx`;
  populateTokenList("idUL_Upload", ulInfoUpload);
}

const ulInfoUpload = ["Die Zwischenablage direkt in das Textfeld kopieren und fertig!"];

function openInfoUpload() {
  dbID("idDia_Upload").showModal();
}
function closeInfoUpload() {
  dbID("idDia_Upload").close();
}

function populateTokenList(parentID, list) {
  let ulParent = dbID(parentID);
  for (let token of list) {
    const li = document.createElement("li");
    li.append(token);
    ulParent.append(li);
  }
}

let mainNumber = null;
function getMainNumber(event) {
  mainNumber = event.target.value;
  updateMainName();
}

let mainName = null;
function getMainName(event) {
  mainName = event.target.value;
  updateMainName();
}

function updateMainName() {
  if (mainName == null) {
    fileData.outputName = `${mainNumberPadded(mainNumber)}.xlsx`;
  } else {
    fileData.outputName = `${mainNumberPadded(mainNumber)}_${mainName}.xlsx`;
  }
  enableDownload();
  dbID("idLbl_fileName").textContent = fileData.outputName;
}

function mainNumberPadded(num = null) {
  if (num == null) return "";
  return num.toString().padStart(6, "0");
}

const fileData = {
  rawStringData: null,
  rowData: {},
  listData: [],
  outputName: "",
};

let rawStringAvailable = false;
function readData(data) {
  rawStringAvailable = data.data !== null;
  fileData.rawStringData = Area_input.KadGet({ noPlaceholder: true });

  enableDownload();
  if (rawStringAvailable) {
    parseData();
  }
}

let mmID = "ArtikelNr";
let description = "Bezeichnung";
let netto = "NettoMenge";
let brutto = "Bruttobedarf";
const basicHeaderFields = [mmID, description, netto, brutto];

let headerFields = [];
let outputHeader = [];

function parseData() {
  fileData.rowData = {};
  let rows = fileData.rawStringData.split("\n");

  headerFields = rows.splice(0, 1)[0].split("\t");
  headerFields.splice(-1, 1);
  createHeaderChecklist();

  for (let row of rows) {
    const data = row.split("\t");
    let obj = {};
    for (let i = 0; i < headerFields.length; i++) {
      if (data[i] == "") {
        obj[headerFields[i]] = null;
      } else if (isNaN(Number(data[i]))) {
        obj[headerFields[i]] = data[i];
      } else {
        obj[headerFields[i]] = Number(data[i]);
      }
    }
    const id = obj[mmID];
    if (!fileData.rowData.hasOwnProperty(id)) {
      fileData.rowData[id] = obj;
      fileData.rowData[id][netto] = parseNumber(obj[netto]);
      fileData.rowData[id][brutto] = parseNumber(obj[brutto]);
    } else {
      fileData.rowData[id][netto] += parseNumber(obj[netto]);
      fileData.rowData[id][brutto] += parseNumber(obj[brutto]);
    }
    if (fileData.rowData[id][netto] == 0 && fileData.rowData[id][brutto] == 0) delete fileData.rowData[id];
  }
  changeHeaderOutput(false);
  createPreviewTable();
}
function createPreviewTable() {
  const header = outputHeader.map((item) => {
    return { data: item };
  });

  const body = [
    ...outputHeader.map((head) => ({
      data: Object.values(fileData.rowData).map((item) => item[head]),
    })),
  ];
  KadTable.createHTMLGrid({ id: "idTab_vorschau", header, body });
}

function parseNumber(num) {
  if (num == null) return 0;
  if (!isNaN(num)) return num;
  let str = num.replace(",", ".");
  return Number(str);
}

function enableDownload(enable = null) {
  if (enable === false) {
    Btn_download.KadEnable(false);
    return;
  }
  let state = rawStringAvailable && fileData.outputName != "" ? true : false;
  Btn_download.KadEnable(state);
}

function createOutputData() {
  fileData.listData = [];
  for (let obj of Object.values(fileData.rowData)) {
    const arr = [];
    for (let field of outputHeader) {
      arr.push(obj[field]);
    }
    fileData.listData.push(arr);
  }
  fileData.listData.unshift(outputHeader);
}

function startDownload() {
  createOutputData();
  const book = utils.book_new();
  const list = utils.aoa_to_sheet(fileData.listData);
  utils.book_append_sheet(book, list, "Vorschauliste bereinigt");
  writeFile(book, fileData.outputName);
}

function createHeaderChecklist() {
  const uiSize = "width9";

  const header = null;
  const body = [
    {
      type: "Checkbox",
      data: headerFields.map((field) => basicHeaderFields.includes(field)),
      settings: {
        onclick: changeHeaderOutput,
        uiSize,
        names: ["headerCheck"],
        align: "right",
      },
    },
    { data: headerFields, settings: { for: "headerCheck", align: "left" } },
  ];
  KadTable.createHTMLGrid({ id: "idTab_Ausgabespalten", header, body });
}

function changeHeaderOutput(redrawTable = true) {
  outputHeader = [];
  for (let i = 0; i < headerFields.length; i++) {
    const id = `idCheckbox_headerCheck_${i}`;
    let check = dbID(id).checked;
    if (check) outputHeader.push(headerFields[i]);
  }
  if (redrawTable) createPreviewTable();
}
