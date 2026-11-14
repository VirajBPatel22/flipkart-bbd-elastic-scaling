import { optionsFor, request, save } from './common.js';
export const options=optionsFor('sustained');
export default function() { request(false); }
export const handleSummary=save;
