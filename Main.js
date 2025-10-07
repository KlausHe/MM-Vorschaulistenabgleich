import { utils, writeFile } from "./Data/xlsx.mjs";
import { dbID, initEL, KadTable } from "./KadUtils/KadUtils.js";

initEL({ id: "idVin_mainAssemblyNr", fn: getMainNumber, resetValue: "MM-Nummern Anlage" });
initEL({ id: "idVin_mainAssemblyName", fn: getMainName, resetValue: "Anlagename" });
const Area_input = initEL({ id: "idArea_input", fn: readData, resetValue: "Zwischenablage hier einfügen" });

const CB_calculateNetto = initEL({ id: "idCB_calculateNetto", fn: changeSettings, resetValue: false });
const CB_calculateBrutto = initEL({ id: "idCB_calculateBrutto", fn: changeSettings, resetValue: false });

initEL({ id: "idBtn_infoUpload", fn: openInfoUpload, resetValue: "Download" });
initEL({ id: "idBtn_infoCloseUpload", fn: closeInfoUpload, resetValue: "Download" });
const Btn_download = initEL({ id: "idBtn_download", fn: startDownload, resetValue: "Download" });

const Vin_Test_mmID = initEL({ id: "idVin_Test_mmID", fn: () => testChangeHeader(0), resetValue: "ArtikelNr" });
const Vin_Test_name = initEL({ id: "idVin_Test_name", fn: () => testChangeHeader(1), resetValue: "Bezeichnung" });
const Vin_Test_kind = initEL({ id: "idVin_Test_kind", fn: () => testChangeHeader(2), resetValue: "ArtikelArt" });
const Vin_Test_netto = initEL({ id: "idVin_Test_netto", fn: () => testChangeHeader(3), resetValue: "NettoMenge" });
const Vin_Test_brutto = initEL({ id: "idVin_Test_brutto", fn: () => testChangeHeader(4), resetValue: "Bruttobedarf" });
const Vin_Test_unit = initEL({ id: "idVin_Test_unit", fn: () => testChangeHeader(5), resetValue: "Einheit" });
const Vin_Tests = [Vin_Test_mmID, Vin_Test_name, Vin_Test_kind, Vin_Test_netto, Vin_Test_brutto, Vin_Test_unit];

window.onload = mainSetup;

function mainSetup() {
  rawStringAvailable = false;
  enableDownload(true);
  dbID("idLbl_fileName").textContent = `*.xlsx`;
  populateTokenList("idUL_Upload", [...ulInfoUpload, ...partDataFields.map((item) => `- ${item}`)]);
  CB_calculateNetto.KadReset({ resetValue: settings.calculateNetto });
  CB_calculateBrutto.KadReset({ resetValue: settings.calculateBrutto });
}

const ulInfoUpload = ["Die Zwischenablage direkt in das Textfeld kopieren und fertig!", "Erwartete Spalten:"];

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

const settings = {
  calculateNetto: true,
  calculateBrutto: true,
};

function changeSettings() {
  settings.calculateNetto = CB_calculateNetto.KadGet();
  settings.calculateBrutto = CB_calculateBrutto.KadGet();
  if (rawStringAvailable) {
    parseData();
  }
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
// let storage = "BestandVerfuegbar";
let unit = "Einheit";
const partDataFields = [mmID, name, kind, netto, brutto, unit];
// const partDataFields = [mmID, name, kind, netto, brutto, storage, unit];

function parseData() {
  fileData.rowData = {};
  const rows = fileData.rawStringData.split("\n");
  // check header

  for (let row of rows) {
    const data = row.split("\t");
    let obj = {};
    for (let i = 0; i < data.length; i++) {
      obj[partDataFields[i]] = isNaN(Number(data[i])) ? data[i] : Number(data[i]);
    }
    if (!fileData.rowData.hasOwnProperty(obj[mmID])) {
      fileData.rowData[obj[mmID]] = obj;
    } else {
      let state = 0;
      if (settings.calculateNetto) {
        state += 1;
        fileData.rowData[obj[mmID]][netto] += obj[netto];
      }
      if (settings.calculateBrutto) {
        state += 2;
        fileData.rowData[obj[mmID]][brutto] += obj[brutto];
      }
      switch (state) {
        case 1:
          if (fileData.rowData[obj[mmID]][netto] == 0) delete fileData.rowData[obj[mmID]];
          break;
        case 2:
          if (fileData.rowData[obj[mmID]][brutto] == 0) delete fileData.rowData[obj[mmID]];
          break;
        case 3:
          if (fileData.rowData[obj[mmID]][netto] == 0 && fileData.rowData[obj[mmID]][brutto] == 0) delete fileData.rowData[obj[mmID]];
          break;
      }
    }
  }
  delete fileData.rowData[mmID];

  const header = [{ data: mmID }, { data: name }, { data: kind }, { data: netto }, { data: brutto }, { data: unit }];

  const body = [
    { data: Object.values(fileData.rowData).map((item) => item[mmID]) },
    { data: Object.values(fileData.rowData).map((item) => item[name]) },
    { data: Object.values(fileData.rowData).map((item) => item[kind]) },
    { data: Object.values(fileData.rowData).map((item) => item[netto]) },
    { data: Object.values(fileData.rowData).map((item) => item[brutto]) },
    { data: Object.values(fileData.rowData).map((item) => item[unit]) },
  ];

  KadTable.createHTMLGrid({ id: "idTab_vorschau", header, body });

  fileData.listData = [];
  for (let obj of Object.values(fileData.rowData)) {
    const arr = [];
    for (let field of partDataFields) {
      arr.push(obj[field]);
    }
    fileData.listData.push(arr);
  }
}

function enableDownload(enable = null) {
  if (enable === false) {
    Btn_download.KadEnable(false);
    return;
  }
  let state = rawStringAvailable && fileData.outputName != "" ? true : false;
  Btn_download.KadEnable(state);
}

function startDownload() {
  const book = utils.book_new();
  const list = utils.aoa_to_sheet(fileData.listData);
  utils.book_append_sheet(book, list, "Vorschauliste bereinigt");
  writeFile(book, fileData.outputName);
}

function testChangeHeader(index) {
  const value = Vin_Tests[index].KadGet();
  partDataFields[index] = value;
}
