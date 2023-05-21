// ==UserScript==
// @name         WME ChatHistoryV2
// @namespace    none
// @version      0.2
// @description  Zeigt die letzte Chat-Nachricht des Chat-Addons an
// @author       pv
// @match        https://*.waze.com/*/editor*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require      https://code.jquery.com/jquery-3.7.0.js
// ==/UserScript==

/* global W */
/* global WazeWrap */
/* global $ */

'use strict';

let country;
let tries = 0;
var chatmsg;
let eventListenerRegistered = false;

function blinkButton() {
  const button = document.getElementById('id-chatmsg');
  if (!button) return;

  let newMessage = true;

  button.style.backgroundColor = newMessage ? 'orange' : 'transparent';

  // Setze den Hintergrund des Buttons auf normal, wenn er gedrückt wird
  button.addEventListener('click', () => {
    button.style.backgroundColor = 'transparent';
    newMessage = false;
  });
}



async function init() {
  async function chatpopuptab() {
    const { tabLabel, tabPane } = W.userscripts.registerSidebarTab('tabChatMSG');
    tabLabel.innerText = 'Chat-Nachrichten';
    tabLabel.title = 'Chat-Nachrichten';
    tabLabel.style.color = 'blue';
    tabLabel.style.fontWeight = 'bold';
    tabLabel.id = 'id-chatmsg';
    await W.userscripts.waitForElementConnected(tabPane);

    return Promise.resolve(tabPane);
  }

  var tab = await chatpopuptab();
  var messages = []; // Array zum Speichern der Nachrichten


  // Funktion zum Formatieren des Datums
  function formatDateTime(date) {
    const options = { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    return date.toLocaleDateString('de-DE', options);
  }

  // Funktion zum Aktualisieren des Tab-Inhalts
function updateTabContent() {
  var msgtxt = messages.map(function(message) {
    var formattedMessage;
    if (typeof message === 'object') {
      // Informationen in separaten Feldern vorhanden
      const dateTime = formatDateTime(message.datetime);
      formattedMessage = dateTime + '<br>' +
                        message.username + '<br>' +
                        message.message + '<br>';
    } else {
      // Alle Informationen in einem Feld enthalten
      formattedMessage = message + '<br>';
    }
    return formattedMessage;
  }).join('');

  tab.innerHTML = "<h1>Chat Historie</h1><p>" + msgtxt + "</p>";
  tab.style.padding = '10px';
  tab.style.backgroundColor = 'lightgray';
  tab.style.padding = '10px';
      if (messages.length > 0) {
    blinkButton();
      }
}


// MutationObserver für neue Nachrichten
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    const addedNodes = Array.from(mutation.addedNodes);
    const newMessages = addedNodes.filter((node) => node.matches && node.matches("div[id='chat-overlay'] div"));
    // Neue Nachrichten verarbeiten
    newMessages.forEach((message) => {
      const text = $(message).text();
      console.log('Neue Nachricht:', text);
      console.log('WME ChatHistory......', messages);

      // Nachricht in ein Objekt umwandeln und zum Array hinzufügen
      const messageObj = {
        datetime: new Date(),
        username: '', // Benutzername extrahieren oder festlegen
        id: '', // ID extrahieren oder festlegen
        message: text
      };
      messages.unshift(messageObj); // Neue Nachricht am Anfang des Arrays hinzufügen
    });
    updateTabContent(); // Tab-Inhalt aktualisieren
  });
});

  // Zielknoten für den Observer festlegen (hier: chat-overlay)
  const targetNode = document.querySelector("div[id='chat-overlay']");

  // Observer konfigurieren
  const config = { childList: true, subtree: true };

  // Observer starten
  observer.observe(targetNode, config);
}


function bootstrap() {
  if (W && W.map && W.model && W.model.countries && W.model.states && W.loginManager.user && $ && WazeWrap.Ready) {
    checkCountry();
    if (country === null) {
      setTimeout(function () {
        bootstrap();
      }, 200);
    } else {
      init();
    }
  } else if (tries < 500) {
    setTimeout(() => {
      tries++;
      bootstrap();
    }, 200);
  } else {
    console.log('WME ChatHistory: Laden fehlgeschlagen');
  }
}

function checkCountry() {
  try {
    country = W.model.getTopCountry().name;
  } catch (err) {
    country = null;
    // console.log(err);
  }
}

bootstrap();
