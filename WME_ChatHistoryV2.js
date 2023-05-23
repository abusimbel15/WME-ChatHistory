// ==UserScript==
// @name         WME ChatHistoryV2
// @namespace    none
// @version      1.0
// @description  Zeigt die letzte Chat-Nachricht des Chat-Addons an
// @author       pv
// @match        https://*.waze.com/*/editor*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @require      https://code.jquery.com/jquery-3.7.0.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/localforage/1.9.0/localforage.min.js
// @updateURL    https://raw.githubusercontent.com/abusimbel15/WME-ChatHistory/master/WME_ChatHistoryV2.js
// @downloadURL  https://raw.githubusercontent.com/abusimbel15/WME-ChatHistory/master/WME_ChatHistoryV2.js
// ==/UserScript==

/* global W */
/* global WazeWrap */
/* global $ */
/* global localforage */

'use strict';

let country;
let tries = 0;
let chatmsg;
let eventListenerRegistered = false;

let newMessageReceived = false; // Variable, um den Zustand der neuen Nachricht zu speichern

function blinkButton() {
  const button = document.getElementById('id-chatmsg');
  if (!button) return;

  // Überprüfe, ob eine neue Nachricht empfangen wurde
  if (newMessageReceived) {
    button.style.backgroundColor = 'orange';
  } else {
    button.style.backgroundColor = 'transparent';
  }

  // Setze den Hintergrund des Buttons auf normal, wenn er gedrückt wird
  button.addEventListener('click', () => {
    button.style.backgroundColor = 'transparent';
    newMessageReceived = false; // Setze den Zustand der neuen Nachricht zurück
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

  // Leeren des Arrays und Aktualisieren des Tab-Inhalts
  function clearHistory() {
    messages = [];
    updateTabContent();
  }

  const clearButton = document.createElement('button');
  clearButton.innerText = 'Verlauf leeren';
  clearButton.addEventListener('click', clearHistory);

  tab.appendChild(clearButton);

  // Array zum Speichern der Nachrichten
  let messages = [];

  // Funktion zum Formatieren des Datums
  function formatDateTime(date) {
    const options = { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    return date.toLocaleDateString('de-DE', options);
  }

  // Funktion zum Aktualisieren des Tab-Inhalts
  function updateTabContent() {
    const msgtxt = messages.map((message) => {
      let formattedMessage;
      if (typeof message === 'object') {
        // Informationen in separaten Feldern vorhanden
        const dateTime = formatDateTime(message.datetime);
        formattedMessage = dateTime + '<br>' +
          message.message + '<br>';
      } else {
        // Alle Informationen in einem Feld enthalten
        formattedMessage = `${message}<br>`;
      }
      return formattedMessage;
    }).join('');

    tab.innerHTML = `<h1>Chat Historie</h1><p>${msgtxt}</p>`;
    tab.style.padding = '10px';
    tab.style.backgroundColor = 'lightgray';
    tab.style.padding = '10px';
    if (messages.length > 0) {
      blinkButton();
    }
    tab.prepend(clearButton); // Button oben einfügen// Button erneut hinzufügen
  }

  // MutationObserver für neue Nachrichten
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const addedNodes = Array.from(mutation.addedNodes);
      const newMessages = addedNodes.filter((node) => node.matches && node.matches("div[id='chat-overlay'] div"));
      // Neue Nachrichten verarbeiten
      newMessages.forEach((message) => {
        const text = $(message).text();
        console.log('WME ChatHistory Neue Nachricht:', text);
        console.log('WME ChatHistory......', messages);

        // Nachricht in ein Objekt umwandeln und zum Array hinzufügen
        const messageObj = {
          datetime: new Date(),
          message: text
        };
        messages.unshift(messageObj); // Neue Nachricht am Anfang des Arrays hinzufügen

        // Setze den Zustand der neuen Nachricht auf true
        newMessageReceived = true;

        updateTabContent(); // Tab-Inhalt aktualisieren
        blinkButton(); // Button zum Blinken bringen
      });
    });
  });

  // Zielknoten für den Observer festlegen (hier: chat-overlay)
  const targetNode = document.querySelector("div[id='chat-overlay']");

  // Observer konfigurieren
  const config = { childList: true, subtree: true };

  // Observer starten
  observer.observe(targetNode, config);

  // Speichere das Array im Local Storage beim Schließen des Tabs oder beim Verlassen der Seite
  window.addEventListener('beforeunload', () => {
    localforage.setItem('ChatHistory', messages);
  });

  // Array aus dem Local Storage laden
  const storedMessages = await localforage.getItem('ChatHistory');
  if (storedMessages) {
    messages = storedMessages;
  }

  // Tab-Inhalt aktualisieren
  updateTabContent();
}

function bootstrap() {
  if (W && W.map && W.model && W.model.countries && W.model.states && W.loginManager.user && $ && WazeWrap.Ready) {
    checkCountry();
    if (country === null) {
      setTimeout(() => {
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
