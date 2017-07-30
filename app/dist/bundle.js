/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

// from: https://github.com/zeit/hyper/blob/master/lib/utils/rpc.js

class RPC {
  constructor () {
    const electron = window.require('electron')
    const EventEmitter = window.require('events')
    this.emitter = new EventEmitter()
    this.ipc = electron.ipcRenderer
    this.ipcListener = this.ipcListener.bind(this)
    if (window.__rpcId) {
      setTimeout(() => {
        this.id = window.__rpcId
        this.ipc.on(this.id, this.ipcListener)
        this.emitter.emit('ready')
      }, 0)
    } else {
      this.ipc.on('init', (ev, uid) => {
        // we cache so that if the object
        // gets re-instantiated we don't
        // wait for a `init` event
        window.__rpcId = uid
        this.id = uid
        this.ipc.on(uid, this.ipcListener)
        this.emitter.emit('ready')
      })
    }
  }

  ipcListener (event, {ch, data}) {
    this.emitter.emit(ch, data)
  }

  on (ev, fn) {
    this.emitter.on(ev, fn)
  }

  once (ev, fn) {
    this.emitter.once(ev, fn)
  }

  emit (ev, data) {
    if (!this.id) {
      throw new Error('Not ready')
    }
    // we emit both on ipc and in the renderer process
    this.emitter.emit(ev, data)
    this.ipc.send(this.id, {ev, data})
    console.log('[rpc]', ev, data ? data : '')
  }

  removeListener (ev, fn) {
    this.emitter.removeListener(ev, fn)
  }

  removeAllListeners () {
    this.emitter.removeAllListeners()
  }

  destroy () {
    this.removeAllListeners()
    this.ipc.removeAllListeners()
  }
}

module.exports = new RPC()


/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = require("electron");

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

const {remote, ipcRenderer} = __webpack_require__(1)
const menus = remote.require('./menus')
const config = remote.require('./config')
const rpc = __webpack_require__(0)

let el = null
let webview = null
let frame = null

// utils
let isFirstLoad = true
let zoomIndex = 6
const zoomIncrements = [
  25 / 100,
  33 / 100,
  50 / 100,
  67 / 100,
  75 / 100,
  90 / 100,
  100 / 100,
  110 / 100,
  125 / 100,
  150 / 100,
  175 / 100,
  200 / 100
]

function init() {
  el = document.querySelector('#view')
  frame = document.querySelector('#frame')

  webview = el.appendChild(document.createElement('webview'))
  webview.className = 'webview'

  var webPreferences = 'experimentalFeatures=yes, experimentalCanvasFeatures=yes'
  webview.setAttribute('webPreferences', webPreferences)

  console.log('[view] ✔')
  attachEvents()
}

function attachEvents () {
  // webview events
  webview.addEventListener('load-commit', onLoadCommit)
  webview.addEventListener('page-title-updated', (e) => {
    rpc.emit('view:title-updated', e.title)
  })
  webview.addEventListener('update-target-url', (e) => {
    if(e.url !== '') rpc.emit('status:url-hover', e.url)
    if(e.url == '') rpc.emit('status:url-out')
  })
  // webview.addEventListener('did-frame-finish-load', onDidFrameFinishLoad)
  // webview.addEventListener('did-finish-load', onDidFinishLoad)
  // webview.addEventListener('did-fail-load', onDidFailLoad)
  // webview.addEventListener('did-get-response-details', onDidGetResponseDetails)
  // webview.addEventListener('dom-ready', onDOMReady)

  // rpc events
  rpc.on('view:load', load)
  rpc.on('view:reload', reload)
  rpc.on('view:hard-reload', reloadIgnoringCache)
  rpc.on('view:navigate-back', navigateBack)
  rpc.on('view:navigate-forward', navigateForward)
  rpc.on('view:zoom-in', zoomIn)
  rpc.on('view:zoom-out', zoomOut)
  rpc.on('view:reset-zoom', resetZoom)
  rpc.on('view:filter', toggleFilter)
  rpc.on('view:toggle-devtools', () => {
    console.log(webview)
    if(webview.isDevToolsOpened()) webview.closeDevTools()
    else webview.openDevTools()
  })
  rpc.on('camera:request-save-screenshot', () => {
    rpc.emit('camera:save-screenshot', [webview.getURL(), webview.getTitle()])
  })
  rpc.on('recorder:start', () => {
    el.classList.add('recording')
  })
  rpc.on('recorder:end', () => {
    el.classList.remove('recording')
  })

  window.addEventListener('resize', resize)
}

function load (url) {
  rpc.emit('status:log', {
    'body': '•••',
    'type': 'loading'
  })

  rpc.emit('omnibox:hide')

  webview.classList.add('show')
  webview.setAttribute('src', url)
}

function resize () {
  frame.style.width = window.innerWidth + 'px'
  frame.style.height = (window.innerHeight - document.querySelector('handle').offsetHeight) + 'px'
}

function onLoadCommit (e) {
  if (isFirstLoad) {
    isFirstLoad = false
    rpc.emit('view:first-load')
    menus.refresh()
  }
  rpc.emit('status:log', {
    'body': '•••',
    'type': 'loading'
  })
  console.log('[view]', 'load-commit', e)
}

function reload () {
  webview.reload()
}

function reloadIgnoringCache () {
  webview.reloadIgnoringCache()
}

function navigateBack () {
  if(webview.canGoBack()) webview.goBack()
}

function navigateForward () {
  if(webview.canGoForward()) webview.goForward()
}

function zoomIn () {
  zoomIndex++
  if(zoomIndex >= zoomIncrements.length) zoomIndex = zoomIncrements.length - 1
  webview.setZoomFactor(zoomIncrements[zoomIndex])
  rpc.emit('status:log', {
    body: Math.round(zoomIncrements[zoomIndex] * 100) + '%'
  })
}

function zoomOut () {
  zoomIndex--
  if(zoomIndex < 0) zoomIndex = 0
  webview.setZoomFactor(zoomIncrements[zoomIndex])
  rpc.emit('status:log', {
    body: Math.round(zoomIncrements[zoomIndex] * 100) + '%'
  })
}

function resetZoom () {
  zoomIndex = 6
  webview.setZoomFactor(zoomIncrements[zoomIndex])
  rpc.emit('status:log', {
    body: Math.round(zoomIncrements[zoomIndex] * 100) + '%'
  })
}

function toggleFilter (filter) {
  webview.classList.toggle(filter)

  rpc.emit('status:log', {
    body: filter.charAt(0).toUpperCase() + filter.substr(1).toLowerCase()
  })

  // if (filter == 'invert') {
  //   // invert handle color them as well
  //   rpc.emit('handle:toggle-light-theme')
  // }
}

module.exports = {
  init: init,
  load: load
}

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

// styles
__webpack_require__(4)

// oryoki
const rpc = __webpack_require__(0)
const handle = __webpack_require__(9)
const omnibox = __webpack_require__(10)
const windowhelper = __webpack_require__(12)
const view = __webpack_require__(2)
const status = __webpack_require__(13)
const dragoverlay = __webpack_require__(14)

rpc.on('ready', function (e, uid) {
  console.log('[rpc] ✔', rpc.id)
  status.init()
  handle.init()
  omnibox.init()
  windowhelper.init()
  view.init()
  dragoverlay.init()
})


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(5);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(7)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {
	// When the styles change, update the <style> tags
	if(!content.locals) {
		module.hot.accept("!!../../node_modules/css-loader/index.js!../../node_modules/sass-loader/lib/loader.js!./bundle.scss", function() {
			var newContent = require("!!../../node_modules/css-loader/index.js!../../node_modules/sass-loader/lib/loader.js!./bundle.scss");
			if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
			update(newContent);
		});
	}
	// When the module is disposed, remove the <style> tags
	module.hot.dispose(function() { update(); });
}

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(6)(undefined);
// imports


// module
exports.push([module.i, "@charset \"UTF-8\";\n/* http://meyerweb.com/eric/tools/css/reset/ \n   v2.0 | 20110126\n   License: none (public domain)\n*/\nhtml, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, abbr, acronym, address, big, cite, code, del, dfn, em, img, ins, kbd, q, s, samp, small, strike, strong, sub, sup, tt, var, b, u, i, center, dl, dt, dd, ol, ul, li, fieldset, form, label, legend, table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas, details, embed, figure, figcaption, footer, header, hgroup, menu, nav, output, ruby, section, summary, time, mark, audio, video {\n  margin: 0;\n  padding: 0;\n  border: 0;\n  font-size: 100%;\n  font: inherit;\n  vertical-align: baseline; }\n\n/* HTML5 display-role reset for older browsers */\narticle, aside, details, figcaption, figure, footer, header, hgroup, menu, nav, section {\n  display: block; }\n\nbody {\n  line-height: 1; }\n\nol, ul {\n  list-style: none; }\n\nblockquote, q {\n  quotes: none; }\n\nblockquote:before, blockquote:after {\n  content: '';\n  content: none; }\n\nq:before, q:after {\n  content: '';\n  content: none; }\n\ntable {\n  border-collapse: collapse;\n  border-spacing: 0; }\n\n@keyframes blink {\n  0% {\n    border-color: #00ec91; }\n  50% {\n    border-color: rgba(0, 236, 145, 0.6); } }\n\n@keyframes pulse {\n  0% {\n    opacity: 1; }\n  50% {\n    opacity: 0; } }\n\n@keyframes fade-in {\n  0% {\n    opacity: 0; }\n  100% {\n    opacity: 1; } }\n\n@keyframes fade-out {\n  0% {\n    opacity: 1; }\n  100% {\n    opacity: 0; } }\n\n@keyframes appear {\n  0% {\n    box-shadow: inset 0 0 0 3px rgba(52, 130, 220, 0); }\n  100% {\n    box-shadow: inset 0 0 0 3px rgba(52, 130, 220, 0.7); } }\n\nbody {\n  background-color: #141414;\n  font-family: -apple-system, BlinkMacSystemFont, sans-serif;\n  color: white;\n  overflow: hidden;\n  -webkit-font-smoothing: antialiased; }\n\ncursor {\n  z-index: 99;\n  position: fixed;\n  width: 10px;\n  height: 10px;\n  background: red;\n  border-radius: 10px;\n  pointer-events: none; }\n  cursor.active {\n    background: blue; }\n\nhandle {\n  -webkit-app-region: drag;\n  background: rgba(20, 20, 20, 0);\n  height: 24px;\n  width: 100%;\n  text-align: center;\n  transition: background 0.2s;\n  display: block; }\n  handle.stroke::after {\n    content: ' ';\n    width: 100%;\n    height: 1px;\n    background: #212121;\n    display: inline-block;\n    position: fixed;\n    top: 24px;\n    left: 0;\n    z-index: 98;\n    transition: background 0.1s; }\n  handle .title {\n    padding: 0 8px;\n    padding-top: 4px;\n    padding-bottom: 5px;\n    text-align: center;\n    font-size: 15px;\n    line-height: 15px;\n    letter-spacing: -0.5px;\n    display: inline-block;\n    -webkit-app-region: no-drag;\n    -webkit-user-select: none;\n    user-select: none;\n    cursor: pointer;\n    background: transparent;\n    border-radius: 5px;\n    transition: background 0.1s; }\n    handle .title.selected {\n      background: rgba(255, 255, 255, 0.15); }\n      handle .title.selected::after {\n        opacity: 1; }\n    handle .title::after {\n      width: 9px;\n      height: 9px;\n      position: relative;\n      top: -1px;\n      content: '\\2022';\n      display: inline-block;\n      margin-left: 4px;\n      opacity: 0.2;\n      transition: opacity 0.2s; }\n    handle .title:hover::after {\n      opacity: 1; }\n    handle .title.align-left {\n      text-align: left;\n      position: absolute;\n      left: 60px; }\n  handle .button {\n    position: absolute;\n    -webkit-app-region: no-drag;\n    user-select: none;\n    top: 6px;\n    border-radius: 100%;\n    height: 12px;\n    width: 12px;\n    transition: background-color 0.1s;\n    -webkit-box-sizing: border-box; }\n    handle .button::after {\n      content: '';\n      display: block;\n      margin-left: 3px;\n      margin-top: 3px;\n      height: 6px;\n      width: 6px;\n      border-radius: 100%;\n      background: transparent;\n      transition: background-color 0.1s; }\n    handle .button:hover::after {\n      background: rgba(0, 0, 0, 0.3); }\n  handle .close {\n    left: 9px;\n    background: #fc5b57; }\n    handle .close:active {\n      background: #CC443F; }\n  handle .minimize {\n    left: 29px;\n    background: rgba(255, 255, 255, 0.2);\n    transition: background 0.2s; }\n  handle .fullscreen {\n    left: 49px;\n    background: rgba(255, 255, 255, 0.2);\n    transition: background 0.2s; }\n  handle.hide {\n    display: none; }\n  handle:hover .minimize, handle.light:hover .minimize {\n    background: #ffbb3c; }\n    handle:hover .minimize:active, handle.light:hover .minimize:active {\n      background: #CC9631; }\n  handle:hover .fullscreen, handle.light:hover .fullscreen {\n    background: #35c849; }\n    handle:hover .fullscreen:active, handle.light:hover .fullscreen:active {\n      background: #269435; }\n  handle.disabled .button {\n    background: rgba(255, 255, 255, 0.2); }\n  handle.disabled .title {\n    opacity: 0.6; }\n  handle.light {\n    background: #f7f7f7; }\n    handle.light.stroke::after {\n      background: rgba(33, 33, 33, 0.15); }\n    handle.light .title {\n      color: #1a1a1a; }\n    handle.light .minimize {\n      background: rgba(0, 0, 0, 0.15); }\n    handle.light .fullscreen {\n      background: rgba(0, 0, 0, 0.15); }\n    handle.light.disabled .button {\n      background: rgba(0, 0, 0, 0.15); }\n\n#view {\n  width: 100%;\n  height: 100%; }\n  #view.recording::before {\n    content: '';\n    width: 10px;\n    height: 10px;\n    background: transparent;\n    border-radius: 10px;\n    position: absolute;\n    top: 20px;\n    right: 20px;\n    animation: pulse 0.8s infinite; }\n\nomnibox {\n  width: 100%;\n  height: 100%;\n  position: fixed;\n  -webkit-app-region: drag;\n  z-index: 98; }\n  omnibox .box {\n    z-index: 98;\n    max-width: 485px;\n    top: calc(25px);\n    position: relative;\n    margin: auto; }\n    omnibox .box ::-webkit-input-placeholder {\n      color: rgba(255, 255, 255, 0.2); }\n    omnibox .box .input {\n      z-index: 98;\n      -webkit-app-region: no-drag;\n      width: calc(100% - 24px);\n      font-size: 22px;\n      letter-spacing: -0.5px;\n      color: white;\n      background: #262626;\n      line-height: 21px;\n      outline: none;\n      border: none;\n      padding: 6px 12px;\n      position: relative;\n      border-radius: 2px;\n      transition: background-color 0.1s ease-out;\n      box-shadow: 0px 0px 0px 2px transparent;\n      transition: box-shadow 0.1s ease-out;\n      white-space: nowrap;\n      overflow-x: scroll; }\n      omnibox .box .input::-webkit-scrollbar {\n        display: none; }\n      omnibox .box .input.highlight {\n        background-color: #1F1F1F; }\n      omnibox .box .input.drop {\n        box-shadow: 0px 0px 0px 2px rgba(53, 130, 220, 0.7); }\n      omnibox .box .input::selection {\n        background-color: rgba(255, 255, 255, 0.1); }\n      omnibox .box .input.hintShown {\n        border-bottom-left-radius: 0;\n        border-bottom-right-radius: 0; }\n  omnibox .hints {\n    z-index: 98;\n    display: block;\n    max-width: 485px;\n    margin: auto;\n    font-size: 14px;\n    letter-spacing: -0.4px;\n    background: #1A1A1A;\n    position: relative;\n    border-radius: 0px 0px 2px 2px;\n    color: rgba(255, 255, 255, 0.4);\n    -webkit-user-select: none;\n    cursor: default; }\n    omnibox .hints.hide {\n      display: none; }\n    omnibox .hints.show {\n      display: block; }\n    omnibox .hints hint {\n      padding: 14px;\n      display: block; }\n      omnibox .hints hint .keyword {\n        float: right;\n        letter-spacing: -0.1px;\n        color: rgba(255, 255, 255, 0.4); }\n      omnibox .hints hint .highlighted {\n        color: rgba(255, 255, 255, 0.6); }\n      omnibox .hints hint.selected {\n        background: #262626; }\n  omnibox.show {\n    display: block; }\n  omnibox.hide {\n    display: none; }\n  omnibox .overlay {\n    width: 100%;\n    height: 100%;\n    background-color: #141414;\n    position: absolute;\n    top: 0;\n    left: 0;\n    z-index: 88; }\n  omnibox .updateClue {\n    background: #1A1A1A;\n    padding: 7px 14px;\n    margin-bottom: 10px;\n    font-size: 12px;\n    letter-spacing: -0.4px;\n    display: inline-block;\n    color: rgba(255, 255, 255, 0.4);\n    -webkit-user-select: none;\n    cursor: default;\n    border-bottom-right-radius: 10px;\n    border-bottom-left-radius: 10px;\n    transition: 0.3s color;\n    display: none; }\n    omnibox .updateClue::before {\n      content: '';\n      width: 4px;\n      height: 4px;\n      border-radius: 4px;\n      display: inline-block;\n      background: green;\n      margin-right: 8px;\n      position: relative;\n      top: -2px;\n      display: none; }\n    omnibox .updateClue:hover {\n      color: white; }\n    omnibox .updateClue:active {\n      background-color: #1F1F1F; }\n    omnibox .updateClue.available {\n      display: inline-block; }\n      omnibox .updateClue.available::before {\n        background: red; }\n    omnibox .updateClue.downloading {\n      display: inline-block; }\n      omnibox .updateClue.downloading:hover {\n        color: rgba(255, 255, 255, 0.4); }\n      omnibox .updateClue.downloading:active {\n        background: #1A1A1A; }\n      omnibox .updateClue.downloading::before {\n        background: rgba(255, 255, 255, 0.8);\n        display: inline-block;\n        animation: pulse 1s infinite; }\n    omnibox .updateClue.ready {\n      display: inline-block; }\n      omnibox .updateClue.ready::before {\n        background: green;\n        display: inline-block; }\n\n@media (max-width: 485px) {\n  omnibox .box {\n    top: 4px;\n    width: calc(100% - 8px); }\n    omnibox .box .input {\n      border-radius: 2px; } }\n\nstatus {\n  position: fixed;\n  top: 0;\n  right: 0;\n  text-align: right;\n  padding: 5px 8px;\n  font-size: 12.5px;\n  display: inline-block;\n  letter-spacing: -0.1px;\n  line-height: 14px;\n  text-rendering: optimizeLegibility;\n  color: rgba(255, 255, 255, 0.8);\n  background: rgba(40, 40, 40, 0.7);\n  pointer-events: none;\n  border-bottom-left-radius: 6px;\n  opacity: 0;\n  transition: opacity 0.5s ease-out;\n  z-index: 99; }\n  status icon {\n    padding-right: 7px;\n    position: relative;\n    top: 0.5px;\n    color: white; }\n  status.hide {\n    display: none; }\n  status.fade-in {\n    opacity: 1;\n    transition: opacity 0.5s ease-out; }\n  status.fade-out {\n    opacity: 0;\n    transition: opacity 1s ease-in; }\n  status i {\n    font-style: italic; }\n  status.light {\n    background: rgba(40, 40, 40, 0.1);\n    color: rgba(0, 0, 0, 0.8); }\n  @media (-webkit-min-device-pixel-ratio: 2) {\n    status icon {\n      padding-right: 5px; } }\n\nconsole {\n  position: fixed;\n  bottom: 0;\n  background: #252525;\n  width: calc(100% - 10px);\n  padding-left: 10px;\n  padding-top: 4px;\n  height: 19px;\n  font-family: 'Roboto Mono Regular', sans-serif;\n  font-size: 12px;\n  color: rgba(255, 255, 255, 0.6);\n  display: none; }\n  console.show {\n    display: block; }\n  console.hide {\n    display: none; }\n  console input {\n    -webkit-app-region: no-drag;\n    width: calc(100% - 36px - 55px);\n    color: rgba(255, 255, 255, 0.7);\n    background: #252525;\n    line-height: 11px;\n    letter-spacing: 0.5px;\n    outline: none;\n    border: none;\n    position: relative;\n    padding-right: 79px;\n    border-radius: 2px;\n    transition: background-color 0.1s ease-out; }\n    console input.highlight {\n      background-color: #1F1F1F; }\n    console input::selection {\n      background-color: rgba(255, 255, 255, 0.2); }\n\nwindowhelper {\n  position: fixed;\n  z-index: 99;\n  bottom: 18px;\n  right: 18px;\n  background: #212121;\n  padding: 3px 7px;\n  border-radius: 2px;\n  text-align: center;\n  color: rgba(255, 255, 255, 0.6);\n  display: none; }\n  windowhelper.show {\n    display: block; }\n  windowhelper.hide {\n    display: none; }\n  windowhelper::focus {\n    background: #262626; }\n  windowhelper input {\n    font-size: 13px;\n    letter-spacing: 0px;\n    color: rgba(255, 255, 255, 0.6);\n    background: transparent;\n    width: 26px;\n    display: inline-block;\n    line-height: 19px;\n    outline: none;\n    border: none;\n    padding: 0;\n    transition: background-color 0.1s ease-out;\n    text-align: center; }\n    windowhelper input.fourDigits {\n      width: 34px; }\n    windowhelper input.leadingOne {\n      width: 30px; }\n    windowhelper input:focus {\n      color: white;\n      background: transparent; }\n    windowhelper input::selection {\n      color: white;\n      background: transparent; }\n  windowhelper #width {\n    text-align: right; }\n  windowhelper #height {\n    text-align: left; }\n  windowhelper .separator {\n    color: rgba(255, 255, 255, 0.4);\n    display: inline-block;\n    width: 8px;\n    position: relative;\n    left: -0.5px;\n    text-align: center;\n    -webkit-user-select: none;\n    user-select: none; }\n\n@media (-webkit-min-device-pixel-ratio: 2) {\n  windowhelper input.fourDigits {\n    width: 34px; }\n  windowhelper input.leadingOne {\n    width: 33px; } }\n\n#dragOverlay {\n  position: fixed;\n  width: 100%;\n  height: 100%;\n  top: 0;\n  left: 0;\n  z-index: 999;\n  background: transparent;\n  pointer-events: none;\n  display: none;\n  box-shadow: inset 0 0 0 3px rgba(52, 130, 220, 0);\n  -webkit-app-region: drag; }\n  #dragOverlay.active {\n    display: block;\n    pointer-events: all;\n    box-shadow: inset 0 0 0 3px rgba(52, 130, 220, 0);\n    animation: appear 0.1s ease-in;\n    animation-delay: 0.1s;\n    -webkit-animation-fill-mode: forwards; }\n  #dragOverlay.invisible {\n    opacity: 0; }\n\n.webview {\n  height: 100%;\n  width: 100%;\n  background: white;\n  transition: 0.4s filter;\n  filter: grayscale(0%) invert(0%); }\n  .webview.show {\n    animation: fade-in 0.15s ease-out; }\n  .webview.hide {\n    opacity: 0; }\n  .webview.grayscale {\n    filter: grayscale(100%) invert(0%); }\n  .webview.invert {\n    filter: grayscale(0%) invert(100%); }\n  .webview.grayscale.invert {\n    filter: grayscale(100%) invert(100%); }\n\n.homepage {\n  -webkit-app-region: drag;\n  height: 100%;\n  width: 100%;\n  position: fixed; }\n  .homepage .infos {\n    position: fixed;\n    bottom: 45px;\n    left: 50px; }\n  .homepage p {\n    margin-bottom: 0;\n    margin-top: 0;\n    font-family: 'Roboto Light', sans-serif;\n    font-size: 18px;\n    color: rgba(255, 255, 255, 0.3);\n    line-height: 24px; }\n\nbody.about {\n  background-color: #333333; }\n  body.about main {\n    -webkit-app-region: drag;\n    width: 100%;\n    height: 90%;\n    position: absolute;\n    top: 0;\n    left: 0;\n    text-align: center;\n    padding-top: 10%;\n    color: rgba(255, 255, 255, 0.7); }\n    body.about main img {\n      width: 150px;\n      margin-bottom: 25px;\n      animation: fade-in 0.3s ease-out; }\n    body.about main h1 {\n      color: white;\n      font-size: 20px;\n      font-weight: 400;\n      margin-bottom: 10px; }\n    body.about main p.version {\n      color: rgba(255, 255, 255, 0.7);\n      font-size: 13px;\n      line-height: 1.4;\n      display: inline; }\n    body.about main p.author {\n      text-align: center;\n      position: absolute;\n      bottom: 25px;\n      width: 100%;\n      font-size: 13px;\n      color: rgba(255, 255, 255, 0.7); }\n    body.about main p.notes {\n      display: inline;\n      font-size: 13px; }\n      body.about main p.notes a {\n        color: rgba(255, 255, 255, 0.7);\n        text-decoration: none;\n        outline: none;\n        cursor: default; }\n        body.about main p.notes a:hover {\n          text-decoration: underline; }\n  body.about handle {\n    -webkit-app-region: drag;\n    background: transparent;\n    height: 24px;\n    text-align: center;\n    z-index: 99;\n    position: absolute; }\n    body.about handle::after {\n      display: none; }\n    body.about handle .button {\n      position: absolute;\n      -webkit-app-region: no-drag;\n      user-select: none;\n      top: 6px;\n      border-radius: 100%;\n      height: 12px;\n      width: 12px;\n      transition: background-color 0.1s;\n      -webkit-box-sizing: border-box;\n      background: transparent;\n      border: 1px solid rgba(255, 255, 255, 0.2); }\n      body.about handle .button:hover::after {\n        display: none; }\n    body.about handle .close {\n      left: 9px;\n      background: #fc5b57;\n      border: none; }\n      body.about handle .close:active {\n        background: #CC443F; }\n      body.about handle .close::after {\n        content: '';\n        display: block;\n        margin-left: 3px;\n        margin-top: 3px;\n        height: 6px;\n        width: 6px;\n        border-radius: 100%;\n        background: transparent;\n        transition: background-color 0.1s; }\n      body.about handle .close:hover::after {\n        display: block;\n        background: rgba(0, 0, 0, 0.3); }\n    body.about handle.disabled .button {\n      background: rgba(255, 255, 255, 0.2); }\n", ""]);

// exports


/***/ }),
/* 6 */
/***/ (function(module, exports) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
// css base code, injected by the css-loader
module.exports = function(useSourceMap) {
	var list = [];

	// return the list of modules as css string
	list.toString = function toString() {
		return this.map(function (item) {
			var content = cssWithMappingToString(item, useSourceMap);
			if(item[2]) {
				return "@media " + item[2] + "{" + content + "}";
			} else {
				return content;
			}
		}).join("");
	};

	// import a list of modules into the list
	list.i = function(modules, mediaQuery) {
		if(typeof modules === "string")
			modules = [[null, modules, ""]];
		var alreadyImportedModules = {};
		for(var i = 0; i < this.length; i++) {
			var id = this[i][0];
			if(typeof id === "number")
				alreadyImportedModules[id] = true;
		}
		for(i = 0; i < modules.length; i++) {
			var item = modules[i];
			// skip already imported module
			// this implementation is not 100% perfect for weird media query combinations
			//  when a module is imported multiple times with different media queries.
			//  I hope this will never occur (Hey this way we have smaller bundles)
			if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
				if(mediaQuery && !item[2]) {
					item[2] = mediaQuery;
				} else if(mediaQuery) {
					item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
				}
				list.push(item);
			}
		}
	};
	return list;
};

function cssWithMappingToString(item, useSourceMap) {
	var content = item[1] || '';
	var cssMapping = item[3];
	if (!cssMapping) {
		return content;
	}

	if (useSourceMap && typeof btoa === 'function') {
		var sourceMapping = toComment(cssMapping);
		var sourceURLs = cssMapping.sources.map(function (source) {
			return '/*# sourceURL=' + cssMapping.sourceRoot + source + ' */'
		});

		return [content].concat(sourceURLs).concat([sourceMapping]).join('\n');
	}

	return [content].join('\n');
}

// Adapted from convert-source-map (MIT)
function toComment(sourceMap) {
	// eslint-disable-next-line no-undef
	var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap))));
	var data = 'sourceMappingURL=data:application/json;charset=utf-8;base64,' + base64;

	return '/*# ' + data + ' */';
}


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

var stylesInDom = {};

var	memoize = function (fn) {
	var memo;

	return function () {
		if (typeof memo === "undefined") memo = fn.apply(this, arguments);
		return memo;
	};
};

var isOldIE = memoize(function () {
	// Test for IE <= 9 as proposed by Browserhacks
	// @see http://browserhacks.com/#hack-e71d8692f65334173fee715c222cb805
	// Tests for existence of standard globals is to allow style-loader
	// to operate correctly into non-standard environments
	// @see https://github.com/webpack-contrib/style-loader/issues/177
	return window && document && document.all && !window.atob;
});

var getElement = (function (fn) {
	var memo = {};

	return function(selector) {
		if (typeof memo[selector] === "undefined") {
			memo[selector] = fn.call(this, selector);
		}

		return memo[selector]
	};
})(function (target) {
	return document.querySelector(target)
});

var singleton = null;
var	singletonCounter = 0;
var	stylesInsertedAtTop = [];

var	fixUrls = __webpack_require__(8);

module.exports = function(list, options) {
	if (typeof DEBUG !== "undefined" && DEBUG) {
		if (typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
	}

	options = options || {};

	options.attrs = typeof options.attrs === "object" ? options.attrs : {};

	// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
	// tags it will allow on a page
	if (!options.singleton) options.singleton = isOldIE();

	// By default, add <style> tags to the <head> element
	if (!options.insertInto) options.insertInto = "head";

	// By default, add <style> tags to the bottom of the target
	if (!options.insertAt) options.insertAt = "bottom";

	var styles = listToStyles(list, options);

	addStylesToDom(styles, options);

	return function update (newList) {
		var mayRemove = [];

		for (var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];

			domStyle.refs--;
			mayRemove.push(domStyle);
		}

		if(newList) {
			var newStyles = listToStyles(newList, options);
			addStylesToDom(newStyles, options);
		}

		for (var i = 0; i < mayRemove.length; i++) {
			var domStyle = mayRemove[i];

			if(domStyle.refs === 0) {
				for (var j = 0; j < domStyle.parts.length; j++) domStyle.parts[j]();

				delete stylesInDom[domStyle.id];
			}
		}
	};
};

function addStylesToDom (styles, options) {
	for (var i = 0; i < styles.length; i++) {
		var item = styles[i];
		var domStyle = stylesInDom[item.id];

		if(domStyle) {
			domStyle.refs++;

			for(var j = 0; j < domStyle.parts.length; j++) {
				domStyle.parts[j](item.parts[j]);
			}

			for(; j < item.parts.length; j++) {
				domStyle.parts.push(addStyle(item.parts[j], options));
			}
		} else {
			var parts = [];

			for(var j = 0; j < item.parts.length; j++) {
				parts.push(addStyle(item.parts[j], options));
			}

			stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
		}
	}
}

function listToStyles (list, options) {
	var styles = [];
	var newStyles = {};

	for (var i = 0; i < list.length; i++) {
		var item = list[i];
		var id = options.base ? item[0] + options.base : item[0];
		var css = item[1];
		var media = item[2];
		var sourceMap = item[3];
		var part = {css: css, media: media, sourceMap: sourceMap};

		if(!newStyles[id]) styles.push(newStyles[id] = {id: id, parts: [part]});
		else newStyles[id].parts.push(part);
	}

	return styles;
}

function insertStyleElement (options, style) {
	var target = getElement(options.insertInto)

	if (!target) {
		throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");
	}

	var lastStyleElementInsertedAtTop = stylesInsertedAtTop[stylesInsertedAtTop.length - 1];

	if (options.insertAt === "top") {
		if (!lastStyleElementInsertedAtTop) {
			target.insertBefore(style, target.firstChild);
		} else if (lastStyleElementInsertedAtTop.nextSibling) {
			target.insertBefore(style, lastStyleElementInsertedAtTop.nextSibling);
		} else {
			target.appendChild(style);
		}
		stylesInsertedAtTop.push(style);
	} else if (options.insertAt === "bottom") {
		target.appendChild(style);
	} else {
		throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
	}
}

function removeStyleElement (style) {
	if (style.parentNode === null) return false;
	style.parentNode.removeChild(style);

	var idx = stylesInsertedAtTop.indexOf(style);
	if(idx >= 0) {
		stylesInsertedAtTop.splice(idx, 1);
	}
}

function createStyleElement (options) {
	var style = document.createElement("style");

	options.attrs.type = "text/css";

	addAttrs(style, options.attrs);
	insertStyleElement(options, style);

	return style;
}

function createLinkElement (options) {
	var link = document.createElement("link");

	options.attrs.type = "text/css";
	options.attrs.rel = "stylesheet";

	addAttrs(link, options.attrs);
	insertStyleElement(options, link);

	return link;
}

function addAttrs (el, attrs) {
	Object.keys(attrs).forEach(function (key) {
		el.setAttribute(key, attrs[key]);
	});
}

function addStyle (obj, options) {
	var style, update, remove, result;

	// If a transform function was defined, run it on the css
	if (options.transform && obj.css) {
	    result = options.transform(obj.css);

	    if (result) {
	    	// If transform returns a value, use that instead of the original css.
	    	// This allows running runtime transformations on the css.
	    	obj.css = result;
	    } else {
	    	// If the transform function returns a falsy value, don't add this css.
	    	// This allows conditional loading of css
	    	return function() {
	    		// noop
	    	};
	    }
	}

	if (options.singleton) {
		var styleIndex = singletonCounter++;

		style = singleton || (singleton = createStyleElement(options));

		update = applyToSingletonTag.bind(null, style, styleIndex, false);
		remove = applyToSingletonTag.bind(null, style, styleIndex, true);

	} else if (
		obj.sourceMap &&
		typeof URL === "function" &&
		typeof URL.createObjectURL === "function" &&
		typeof URL.revokeObjectURL === "function" &&
		typeof Blob === "function" &&
		typeof btoa === "function"
	) {
		style = createLinkElement(options);
		update = updateLink.bind(null, style, options);
		remove = function () {
			removeStyleElement(style);

			if(style.href) URL.revokeObjectURL(style.href);
		};
	} else {
		style = createStyleElement(options);
		update = applyToTag.bind(null, style);
		remove = function () {
			removeStyleElement(style);
		};
	}

	update(obj);

	return function updateStyle (newObj) {
		if (newObj) {
			if (
				newObj.css === obj.css &&
				newObj.media === obj.media &&
				newObj.sourceMap === obj.sourceMap
			) {
				return;
			}

			update(obj = newObj);
		} else {
			remove();
		}
	};
}

var replaceText = (function () {
	var textStore = [];

	return function (index, replacement) {
		textStore[index] = replacement;

		return textStore.filter(Boolean).join('\n');
	};
})();

function applyToSingletonTag (style, index, remove, obj) {
	var css = remove ? "" : obj.css;

	if (style.styleSheet) {
		style.styleSheet.cssText = replaceText(index, css);
	} else {
		var cssNode = document.createTextNode(css);
		var childNodes = style.childNodes;

		if (childNodes[index]) style.removeChild(childNodes[index]);

		if (childNodes.length) {
			style.insertBefore(cssNode, childNodes[index]);
		} else {
			style.appendChild(cssNode);
		}
	}
}

function applyToTag (style, obj) {
	var css = obj.css;
	var media = obj.media;

	if(media) {
		style.setAttribute("media", media)
	}

	if(style.styleSheet) {
		style.styleSheet.cssText = css;
	} else {
		while(style.firstChild) {
			style.removeChild(style.firstChild);
		}

		style.appendChild(document.createTextNode(css));
	}
}

function updateLink (link, options, obj) {
	var css = obj.css;
	var sourceMap = obj.sourceMap;

	/*
		If convertToAbsoluteUrls isn't defined, but sourcemaps are enabled
		and there is no publicPath defined then lets turn convertToAbsoluteUrls
		on by default.  Otherwise default to the convertToAbsoluteUrls option
		directly
	*/
	var autoFixUrls = options.convertToAbsoluteUrls === undefined && sourceMap;

	if (options.convertToAbsoluteUrls || autoFixUrls) {
		css = fixUrls(css);
	}

	if (sourceMap) {
		// http://stackoverflow.com/a/26603875
		css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
	}

	var blob = new Blob([css], { type: "text/css" });

	var oldSrc = link.href;

	link.href = URL.createObjectURL(blob);

	if(oldSrc) URL.revokeObjectURL(oldSrc);
}


/***/ }),
/* 8 */
/***/ (function(module, exports) {


/**
 * When source maps are enabled, `style-loader` uses a link element with a data-uri to
 * embed the css on the page. This breaks all relative urls because now they are relative to a
 * bundle instead of the current page.
 *
 * One solution is to only use full urls, but that may be impossible.
 *
 * Instead, this function "fixes" the relative urls to be absolute according to the current page location.
 *
 * A rudimentary test suite is located at `test/fixUrls.js` and can be run via the `npm test` command.
 *
 */

module.exports = function (css) {
  // get current location
  var location = typeof window !== "undefined" && window.location;

  if (!location) {
    throw new Error("fixUrls requires window.location");
  }

	// blank or null?
	if (!css || typeof css !== "string") {
	  return css;
  }

  var baseUrl = location.protocol + "//" + location.host;
  var currentDir = baseUrl + location.pathname.replace(/\/[^\/]*$/, "/");

	// convert each url(...)
	/*
	This regular expression is just a way to recursively match brackets within
	a string.

	 /url\s*\(  = Match on the word "url" with any whitespace after it and then a parens
	   (  = Start a capturing group
	     (?:  = Start a non-capturing group
	         [^)(]  = Match anything that isn't a parentheses
	         |  = OR
	         \(  = Match a start parentheses
	             (?:  = Start another non-capturing groups
	                 [^)(]+  = Match anything that isn't a parentheses
	                 |  = OR
	                 \(  = Match a start parentheses
	                     [^)(]*  = Match anything that isn't a parentheses
	                 \)  = Match a end parentheses
	             )  = End Group
              *\) = Match anything and then a close parens
          )  = Close non-capturing group
          *  = Match anything
       )  = Close capturing group
	 \)  = Match a close parens

	 /gi  = Get all matches, not the first.  Be case insensitive.
	 */
	var fixedCss = css.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi, function(fullMatch, origUrl) {
		// strip quotes (if they exist)
		var unquotedOrigUrl = origUrl
			.trim()
			.replace(/^"(.*)"$/, function(o, $1){ return $1; })
			.replace(/^'(.*)'$/, function(o, $1){ return $1; });

		// already a full url? no change
		if (/^(#|data:|http:\/\/|https:\/\/|file:\/\/\/)/i.test(unquotedOrigUrl)) {
		  return fullMatch;
		}

		// convert the url to a full url
		var newUrl;

		if (unquotedOrigUrl.indexOf("//") === 0) {
		  	//TODO: should we add protocol?
			newUrl = unquotedOrigUrl;
		} else if (unquotedOrigUrl.indexOf("/") === 0) {
			// path should be relative to the base url
			newUrl = baseUrl + unquotedOrigUrl; // already starts with '/'
		} else {
			// path should be relative to current directory
			newUrl = currentDir + unquotedOrigUrl.replace(/^\.\//, ""); // Strip leading './'
		}

		// send back the fixed url(...)
		return "url(" + JSON.stringify(newUrl) + ")";
	});

	// send back the fixed css
	return fixedCss;
};


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

const {remote, ipcRenderer} = __webpack_require__(1)
const clipboard = remote.clipboard
const Menu = remote.Menu
const MenuItem = remote.MenuItem

const menus = remote.require('./menus')

const config = remote.require('./config')
const rpc = __webpack_require__(0)

let el
let titleEl

var title = 'Ōryōki'
var isShown = config.getPreference('show_title_bar')
var isDisabled = false
let hasLightTheme = false

function init () {
  el = document.querySelector('handle')
  titleEl = el.querySelector('.title')

  titleEl.addEventListener('mousedown', openMenu)
  // no way of telling when pop-up menu has been closed, so:
  window.addEventListener('mouseup', unselectTitle)
  window.addEventListener('mousemove', unselectTitle)

  el.querySelector('.button.close').addEventListener('click', () => {
    remote.getCurrentWindow().close()
  })

  el.querySelector('.button.minimize').addEventListener('click', () => {
    remote.getCurrentWindow().minimize()
  })

  el.querySelector('.button.fullscreen').addEventListener('click', () => {
    remote.getCurrentWindow().setFullScreen(true)
    hide()
  })

  el.ondragover = (e) => {
    e.preventDefault()
  }

  el.ondrop = (e) => {
    e.preventDefault()
  }

  rpc.on('handle:toggle', toggle)
  rpc.on('view:title-updated', updateTitle)
  rpc.on('handle:toggle-light-theme', toggleLightThem)

  if (isShown) show()
  else hide()
  console.log('[handle] ✔')
}

function show () {
  el.classList.remove('hide')
  win = remote.getCurrentWindow()
  win.setSize(
    win.getSize()[0],
    win.getSize()[1] + 24
  )
  isShown = true
  win.hasTitleBar = true
  menus.refresh()
  window.dispatchEvent(new Event('resize'))
}

function hide () {
  el.classList.add('hide')
  win = remote.getCurrentWindow()
  win.setSize(
    win.getSize()[0],
    win.getSize()[1] - 24
  )
  isShown = false
  win.hasTitleBar = false
  menus.refresh()
  window.dispatchEvent(new Event('resize'))
}

function toggle () {
  if (isShown) hide()
  else show()
}

function disable () {
  el.classList.add('disabled')
  isDisabled = true
}

function enable () {
  el.classList.remove('disabled')
  isDisabled = false
}

function updateTitle (newTitle) {
  titleEl.setAttribute('title', newTitle)
  title = newTitle
  titleEl.innerText = newTitle
  remote.getCurrentWindow().setTitle(newTitle)
}

function unselectTitle () {
  titleEl.classList.remove('selected')
}

function toggleLightThem () {
  if(hasLightTheme) {
    el.classList.remove('light')
    hasLightTheme = false
  }
  else {
    el.classList.add('light')
    hasLightTheme = true
  }
}

function openMenu () {
  titleEl.classList.add('selected')

  var menu = new Menu()
  menu.append(
    new MenuItem(
      {
        label: 'Copy URL',
        click: function () {
          console.log('Copied!')
          unselectTitle()
        }
      }
    )
  )
  menu.append(
    new MenuItem(
      {
        label: 'Copy Screenshot',
        accelerator: 'Cmd+Shift+C',
        click: function () {
          unselectTitle()
          remote.require('./camera').copyScreenshot()
        }
      }
    )
  )
  menu.append(
    new MenuItem(
      {
        type: 'separator'
      }
    )
  )
  
  menu.popup(remote.getCurrentWindow(), {
    async: true
  })
}

module.exports = {
  init: init,
  show: show,
  hide: hide,
  updateTitle: updateTitle
}


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

const {remote, ipcRenderer} = __webpack_require__(1)

const config = remote.require('./config')
const updater = remote.require('./updater')
const menus = remote.require('./menus')
const fileHandler = remote.require('./fileHandler')
const rpc = __webpack_require__(0)

const hints = __webpack_require__(11)
const view = __webpack_require__(2)

// elements
let el
let input
let overlay
let updateHint

// data
let searchDictionary = config.getSearchDictionary()

// utils
let isShown = false
let dragCount = 0

function init () {
  // elements
  el = document.querySelector('omnibox')
  input = el.querySelector('.input')
  overlay = el.querySelector('.overlay')
  updateHint = el.querySelector('.updateHint')

  // events
  input.addEventListener('keydown', onKeyDown)
  input.addEventListener('keyup', onKeyUp)

  // rpc
  rpc.on('omnibox:toggle', toggle)
  rpc.on('omnibox:hide', hide)
  rpc.on('omnibox:focus', focus)

  // always keep the omnibox in focus
  overlay.addEventListener('mousedown', (e) => {
    focus()
    e.preventDefault()
  })

  // check on updater
  refreshUpdaterStatus()
  ipcRenderer.on('updater-refresh', refreshUpdaterStatus)

  // init hints
  hints.init()

  // drag&drop
  el.ondragover = (e) => {
    e.preventDefault()
  }

  el.ondragenter = (e) => {
    console.log(e.dataTransfer.files[0].path);
    dragCount++
    input.classList.add('drop')
    e.preventDefault()
  }

  el.ondragleave = (e) => {
    dragCount--
    if (dragCount === 0) input.classList.remove('drop')
    e.preventDefault()
  }

  el.ondrop = (e) => {
    input.classList.remove('drop')
    dragCount = 0
    fileHandler.handleFile(e.dataTransfer.files[0].path, '_self')
    e.preventDefault()
  }

  show()
  console.log('[omnibox] ✔')
}

function onKeyDown (e) {
  if(e.keyCode == 40 || e.keyCode == 38) return
  if(e.keyCode == 13) {
    input.classList.add('highlight')
    e.preventDefault()
  }
}

function onKeyUp (e) {
  if(e.keyCode == 40 || e.keyCode == 38) return
    
  if(e.keyCode == 13) {
    input.classList.remove('highlight')
    submit()
    e.preventDefault()
    return
  }

  if (e.key == 'Escape') {
    hide()
    return
  }

  var customSearch = getCustomSearch()

  if (customSearch != null) {
    input.classList.add('hintShown')
    hints.render(input.value, customSearch)
  } else {
    hints.hide()
    input.classList.remove('hintShown')
  }
}

function submit () {
  var raw = input.value
  var output = null

  var domain = new RegExp(/[a-z]+(\.[a-z]+)+/ig)
  var port = new RegExp(/(:[0-9]*)\w/g)

  var customSearch = getCustomSearch()

  if (customSearch == null || customSearch[0].isComplete == undefined) {
    // Is this a domain?
    if (domain.test(raw) || port.test(raw)) {
      if (!raw.match(/^[a-zA-Z]+:\/\//)) {
        output = 'http://' + raw
      } else {
        output = raw
      }
    } else {
      // use default search engine
      output = searchDictionary.default.replace('{query}', raw)
    }
  } else if (customSearch[0].isComplete) {
    // use custom search
    var keyword = customSearch[0].keyword
    var query = raw.replace(keyword, '')

    if (query.trim().length == 0) {
      // if custom search doesn't have a parameter,
      // use default URL
      output = searchDictionary.default.replace('{query}', raw)
    } else {
      console.log('[omnibox] Search URL:', customSearch[0].url)
      output = customSearch[0].url.replace('{query}', query.trim())
    }
  }

  console.log('[omnibox]  ⃯⃗→ ', output)
  view.load(output)
  hide()
}

function show () {
  isShown = true
  el.classList.remove('hide')

  focus()
  selectAll()
}

function hide () {
  isShown = false

  el.classList.add('hide')
}

function toggle () {
  if (isShown) hide()
  else show()
}

function focus () {
  input.focus()
}

function selectAll () {
  focus()
  document.execCommand('selectAll', false, null)
}

function updateSearchDictionary () {
  searchDictionary = config.getSearchDictionary()
}

function getCustomSearch () {
  var raw = input.value
  var keyword = raw.split(' ')[0].trim()

  // Empty omnibox doesn't count
  if (keyword.trim().length == 0) return null

  // Look for a complete match
  var completeMatch = searchDictionary.custom.filter(function (search) {
    return search.keyword == keyword
  })

  if (completeMatch.length > 0) {
    console.log('[omnibox] Complete match:', completeMatch[0].keyword)
    completeMatch[0].isComplete = true // Flag the match as a complete match
    return completeMatch
  }

  // Look for potential matches
  var potentialMatches = searchDictionary.custom.filter(function (search) {
    return search.keyword.includes(keyword)
  })

  console.log('[omnibox] Potential matches:', potentialMatches.length)

  if (potentialMatches.length == 0) {
    // No matches
    return null
  } else {
    return potentialMatches
  }
}

function refreshUpdaterStatus () {
  switch(updater.getStatus()) {
    case 'no-update':
      return

    case 'update-available':
      updateHint.innerHTML = 'Update available (' + updater.getLatest().version + ')'
      updateHint.className = 'updateClue available'
      updateHint.addEventListener('click', requestDownloadUpdate)
      break

    case 'downloading-update':
      updateHint.removeEventListener('click', requestDownloadUpdate)
      updateHint.innerHTML = 'Downloading'
      updateHint.className = 'updateClue downloading'
      break

    case 'update-ready':
      updateHint.innerHTML = 'Update to ' + updater.getLatest().version
      updateHint.className = 'updateClue ready'
      updateHint.addEventListener('click', () => {
        updater.quitAndInstall()
      })
      break
  }
}

function requestDownloadUpdate () {
  updater.downloadUpdate()
}

module.exports = {
  init: init,
  show: show,
  hide: hide
}

/***/ }),
/* 11 */
/***/ (function(module, exports) {

let hints = null
let isShown = false

function init () {
  hints = document.querySelector('.hints')
}

function render (input, searchArray) {
  hints.innerHTML = ''
  length = searchArray.length

  var raw = input
  var keyword = raw.split(' ')[0].trim()

  for (var i = 0; i < searchArray.length; i++) {
    var hint = document.createElement('hint')
    hint.innerHTML = searchArray[i].hint

    hints.appendChild(hint)

    var keywordEl = '<span class="keyword">' + searchArray[i].keyword + '</span>'
    hint.innerHTML += keywordEl

    if (searchArray[i].keyword == keyword) {
      hint.getElementsByClassName('keyword')[0].classList.add('highlighted')
    }
  }

  isShown = true
  hints.classList.remove('hide')
  hints.classList.add('show')
}

function hide () {
  hints.innerHTML = ''
  isShown = false
  hints.classList.remove('show')
  hints.classList.add('hide')
}

module.exports = {
  init: init,
  render: render,
  hide: hide
}

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

const {remote} = __webpack_require__(1)
const menus = remote.require('./menus')
const windows = remote.require('./windows')

const rpc = __webpack_require__(0)

let el = null
let widthInput = null
let heightInput = null

let isShown = false

function init () {
  el = document.querySelector('windowhelper')
  widthInput = el.querySelector('#width')
  heightInput = el.querySelector('#height')

  // rpc
  rpc.on('windowhelper:toggle', toggle)
  rpc.on('windowhelper:update-dimensions', updateWindowDimensions)

  // events
  window.addEventListener('resize', updateWindowDimensions)
  widthInput.addEventListener('click', () => { widthInput.select() })
  heightInput.addEventListener('click', () => { heightInput.select() })
  el.addEventListener('keyup', onInputKeyUp)
  el.addEventListener('keydown', onInputKeyDown)

  updateWindowDimensions()
  hide()
  console.log('[windowhelper] ✔')
}

function updateWindowDimensions () {
  widthInput.value = window.innerWidth
  heightInput.value = window.innerHeight

  updateUI()
}

function updateUI () {
  if (widthInput.value <= 1000) {
    el.querySelectorAll('#width')[0].className = ''
  }

  if (heightInput.value <= 1000) {
    el.querySelectorAll('#height')[0].className = ''
  }

  if (widthInput.value >= 1000) {
    el.querySelectorAll('#width')[0].className = 'leadingOne'
  }

  if (heightInput.value >= 1000) {
    el.querySelectorAll('#height')[0].className = 'leadingOne'
  }

  if (widthInput.value >= 2000) {
    el.querySelectorAll('#width')[0].className = 'fourDigits'
  }

  if (heightInput.value >= 2000) {
    el.querySelectorAll('#height')[0].className = 'fourDigits'
  }
}

function show () {
  isShown = true
  el.className = 'show'

  widthInput.select()
}

function hide () {
  isShown = false
  el.className = 'hide'
}

function toggle () {
  if (isShown) hide()
  else show()
}

function onInputKeyUp (e) {
  if(e.key == 'Escape') {
    hide()
    rpc.emit('omnibox:focus')
    menus.refresh()
  }

  // ignore keys we dont have a use for
  if (e.key.match(/[a-z]/i) && e.key.length == 1 || e.keyCode == 9) e.preventDefault()

  switch (e.keyCode) {
    case 9:
      // tab
      if (e.target.id == 'width') heightInput.select()
      else widthInput.select()
      break

    case 13:
      // enter
      windows.resize(widthInput.value, heightInput.value)
      break
  }

  updateUI()
}

function onInputKeyDown (e) {
  // ignore keys we dont have a use for
  if (e.metaKey == false && e.key.match(/[a-z]/i) && e.key.length == 1 || e.keyCode == 9 || e.keyCode == 38 || e.keyCode == 40) e.preventDefault()

  switch (e.keyCode) {
    case 38:
      // arrow Up
      increment(e, 'up')
      e.target.select()
      break

    case 40:
      // arrow Down
      increment(e, 'down')
      e.target.select()
      break
  }

  updateUI()
}

function increment (e, direction) {
  switch(direction) {
    case 'up':
      if (e.shiftKey) {
        e.target.value = parseInt(e.target.value) + 10
      } else {
        e.target.value = parseInt(e.target.value) + 1
      }
      break

    case 'down':
      if (e.shiftKey) {
        e.target.value = parseInt(e.target.value) - 10
      } else {
        e.target.value = parseInt(e.target.value) - 1
      }
      break
  }
}

module.exports = {
  init
}

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

const rpc = __webpack_require__(0)

let el = null

// utils
let isShown = true
let isActive = false
let isFrozen = false

let visibilityTimer = null

function init() {
  el = document.querySelector('status')

  rpc.on('status:log', log)
  rpc.on('status:important', important)
  rpc.on('status:error', error)
  rpc.on('status:unfreeze', unFreeze)
  rpc.on('status:hide', hide)
  rpc.on('status:show', show)
  rpc.on('status:url-hover', onURLHover)
  rpc.on('status:url-out', onURLOut)
}

function log (props) {
  // loading events have lower priority
  if (props.type == 'loading' && isActive) return

  // stop logging stuff if an error is displayed
  if (isFrozen) return

  if (props.icon) {
    el.innerHTML = '<icon>' + props.icon + '</icon>' + props.body
  } else {
    el.innerHTML = props.body
  }

  isActive = true

  el.classList.remove('fade-out')
  el.classList.add('fade-in')

  clearTimeout(visibilityTimer)
  visibilityTimer = setTimeout(fadeOut, 1200)
}

function important (props) {
  if (props.icon) {
    el.innerHTML = '<icon>' + props.icon + '</icon>' + props.body
  } else {
    el.innerHTML = props.body
  }

  isActive = true

  el.classList.remove('fade-out')
  el.classList.add('fade-in')

  freeze()
}

function error (props) {
  el.innerHTML = '<icon>' + '⭕️' + '</icon>' + props.body
  el.classList.remove('fade-out')
  el.classList.add('fade-in')

  isActive = true

  clearTimeout(visibilityTimer)
  visibilityTimer = setTimeout(fadeOut, 5000)
}

function onURLHover (url) {
  if(url.length > 35) {
    url = url.substring(0, 35) + '...'
  }
  console.log(url)
  el.innerHTML = url
  isActive = true
  el.classList.remove('fade-out')
  el.classList.add('fade-in')
  clearTimeout(visibilityTimer)
}

function onURLOut () {
  visibilityTimer = setTimeout(fadeOut, 100)
}

function freeze () {
  clearTimeout(visibilityTimer)
  isFrozen = true
}

function unFreeze () {
  if(isFrozen) {
    visibilityTimer = setTimeout(fadeOut, 1200)
    isFrozen = false
  }
}

function fadeOut () {
  el.classList.add('fade-out')
  isActive = false
}

function hide () {
  el.innerHTML = ''
  isShown = false
  el.classList.add('hide')
  freeze()
}

function show () {
  isShown = true
  el.classList.remove('hide')
  unFreeze()
}

module.exports = {
  init: init
}

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

const {remote, ipcRenderer} = __webpack_require__(1)
const config = remote.require('./config')

let overlay = null
let isDragging = false

function init() {
  overlay = document.querySelector('#dragOverlay')
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
}

function onKeyDown (e) {
  if (e.altKey && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
    if (config.getPreference('use_alt_drag') && !remote.getCurrentWindow().isFullScreen()) {
      overlay.classList.add('active')
    }
  } else if (e.shiftKey || e.metaKey || e.ctrlKey) {
    overlay.classList.remove('active')
  }
}

function onKeyUp (e) {
  if (!e) var e = window.event
  if (e.keyCode == 18) {
    // ALT
    overlay.classList.remove('active')
  }
}

module.exports = {
  init: init
}

/***/ })
/******/ ]);