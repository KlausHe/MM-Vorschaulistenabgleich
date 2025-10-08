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
let name = "Bezeichnung";
let kind = "ArtikelArt";
let netto = "NettoMenge";
let brutto = "Bruttobedarf";
let storage = "BestandVerfuegbar";
const usedPartDataFields = [mmID, name, kind, netto, brutto, storage];
let headerFields = [];
let outputHeader = [];

function parseData() {
  fileData.rowData = {};
  let rows = fileData.rawStringData.split("\n");

  headerFields = rows.splice(0, 1)[0].split("\t");
  outputHeader = [...headerFields];

  for (let row of rows) {
    const data = row.split("\t");
    let obj = {};
    for (let i = 0; i < data.length; i++) {
      if (isNaN(Number(data[i]))) {
        obj[headerFields[i]] = data[i];
      } else {
        obj[headerFields[i]] = Number(data[i]);
      }
    }
    if (!fileData.rowData.hasOwnProperty(obj[mmID])) {
      fileData.rowData[obj[mmID]] = obj;
      fileData.rowData[obj[mmID]][netto] = parseNumber(obj[netto]);
      fileData.rowData[obj[mmID]][brutto] = parseNumber(obj[brutto]);
    } else {
      fileData.rowData[obj[mmID]][netto] += parseNumber(obj[netto]);
      fileData.rowData[obj[mmID]][brutto] += parseNumber(obj[brutto]);
      if (fileData.rowData[obj[mmID]][netto] == 0 && fileData.rowData[obj[mmID]][brutto] == 0) delete fileData.rowData[obj[mmID]];
    }
  }

  createHeaderChecklist();
  createPreviewTable();
  createOutputData();
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
      data: headerFields.map((field) => usedPartDataFields.includes(field)),
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

function changeHeaderOutput() {
  outputHeader = [];
  for (let i = 0; i < headerFields.length; i++) {
    const id = `idCheckbox_headerCheck_${i}`;
    let check = dbID(id).checked;
    if (check) outputHeader.push(headerFields[i]);
  }
  createPreviewTable();
  createOutputData();
}
