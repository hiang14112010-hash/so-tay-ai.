import {browserLocalAPI} from './local-api.mjs';
window.studyLocal=browserLocalAPI();
await import('./app.js?v=6');
